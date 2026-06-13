#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENCRYPT=false
OUTPUT_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
KEEP="${BACKUP_KEEP:-10}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --encrypt)   ENCRYPT=true; shift ;;
    --output)    OUTPUT_DIR="$2"; shift 2 ;;
    --output=*)  OUTPUT_DIR="${1#*=}"; shift ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; RESET='\033[0m'
log()  { echo -e "${CYAN}[backup]${RESET} $1"; }
ok()   { echo -e "${GREEN}✓${RESET} $1"; }
fail() { echo -e "${RED}✗${RESET} $1" >&2; exit 1; }

mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ARCHIVE_PATH="$OUTPUT_DIR/easy-wg-combo-backup-${TIMESTAMP}.tar.gz"

log "Staging backup files…"

STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT

# ── Manifest ──────────────────────────────────────────────────────────────────
HOSTNAME_VAL=$(hostname)
OS_VAL=$(. /etc/os-release 2>/dev/null && echo "$PRETTY_NAME" || uname -s)
DC_VERSION=$(docker compose version --short 2>/dev/null || docker-compose version --short 2>/dev/null || echo "unknown")
EWGC_VERSION=$(grep -m1 '"version"' "$PROJECT_DIR/portal/package.json" 2>/dev/null | awk -F'"' '{print $4}' || echo "unknown")

HAS_WG=$([ -d "$PROJECT_DIR/wireguard" ] && echo "true" || echo "false")
HAS_AG=$([ -d "$PROJECT_DIR/adguard" ] && echo "true" || echo "false")
HAS_CADDY=$([ -d "$PROJECT_DIR/caddy" ] && echo "true" || echo "false")
HAS_F2B=$(command -v fail2ban-client &>/dev/null && echo "true" || echo "false")
HAS_UFW=$(command -v ufw &>/dev/null && echo "true" || echo "false")

cat > "$STAGE/manifest.json" <<EOF
{
  "project": "Easy-WG-Combo",
  "backup_version": "1",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "hostname": "$HOSTNAME_VAL",
  "os": "$OS_VAL",
  "docker_compose_version": "$DC_VERSION",
  "easy_wg_combo_version": "$EWGC_VERSION",
  "components": {
    "wg_easy": $HAS_WG,
    "adguard_home": $HAS_AG,
    "caddy": $HAS_CADDY,
    "fail2ban": $HAS_F2B,
    "ufw": $HAS_UFW,
    "portal": true
  }
}
EOF

# ── UFW rules export ──────────────────────────────────────────────────────────
if command -v ufw &>/dev/null; then
  ufw status verbose > "$STAGE/ufw-rules.txt" 2>/dev/null || echo "UFW not active" > "$STAGE/ufw-rules.txt"
fi

# ── Copy config files ─────────────────────────────────────────────────────────
copy_if_exists() {
  local src="$1" dst="$2"
  if [ -e "$src" ]; then
    mkdir -p "$(dirname "$STAGE/$dst")"
    cp -rp "$src" "$STAGE/$dst"
  fi
}

copy_if_exists "$PROJECT_DIR/wireguard"          "wireguard"
copy_if_exists "$PROJECT_DIR/adguard/conf"       "adguard/conf"
copy_if_exists "$PROJECT_DIR/caddy/Caddyfile"    "caddy/Caddyfile"
copy_if_exists "$PROJECT_DIR/caddy/data"         "caddy/data"
copy_if_exists "$PROJECT_DIR/caddy/config"       "caddy/config"
copy_if_exists "$PROJECT_DIR/portal/data"        "portal/data"
copy_if_exists "$PROJECT_DIR/.env"               ".env"
copy_if_exists "$PROJECT_DIR/.env.secrets"       ".env.secrets"
copy_if_exists "$PROJECT_DIR/docker-compose.yml" "docker-compose.yml"
copy_if_exists "$PROJECT_DIR/compose.sh"         "compose.sh"

# Remove AdGuard work dir and logs (large, not needed for restore)
rm -rf "$STAGE/adguard/work" 2>/dev/null || true
find "$STAGE" -name "*.log" -delete 2>/dev/null || true

log "Creating archive…"
tar -czf "$ARCHIVE_PATH" -C "$STAGE" .
chmod 600 "$ARCHIVE_PATH"

# ── Encrypt ───────────────────────────────────────────────────────────────────
if $ENCRYPT; then
  if ! command -v age &>/dev/null; then
    rm -f "$ARCHIVE_PATH"
    fail "age not found — install it: apt install age"
  fi
  read -rsp "Encryption passphrase: " PASSPHRASE; echo
  read -rsp "Confirm passphrase: " PASSPHRASE2; echo
  if [ "$PASSPHRASE" != "$PASSPHRASE2" ]; then
    rm -f "$ARCHIVE_PATH"
    fail "Passphrases do not match."
  fi
  echo "$PASSPHRASE" | age --passphrase -o "${ARCHIVE_PATH}.age" "$ARCHIVE_PATH"
  rm -f "$ARCHIVE_PATH"
  ARCHIVE_PATH="${ARCHIVE_PATH}.age"
  chmod 600 "$ARCHIVE_PATH"
fi

SIZE=$(du -sh "$ARCHIVE_PATH" | awk '{print $1}')
ok "Backup created: $ARCHIVE_PATH ($SIZE)"

# ── Rotate old backups ────────────────────────────────────────────────────────
if [ "${KEEP:-0}" -gt 0 ] 2>/dev/null; then
  ls -t "$OUTPUT_DIR"/easy-wg-combo-backup-*.tar.gz* 2>/dev/null | \
    tail -n +"$((KEEP + 1))" | xargs rm -f 2>/dev/null || true
fi
