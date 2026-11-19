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
# Two files that live outside the tracked tree and that nothing else can
# regenerate. Both were missing until 0.6.5, so every archive made before it is
# incomplete for an Xray install or for any host with local compose overrides:
#   xray/config.json          the Reality key pair and the per-device client list
#   docker-compose.override.yml  local, untracked customisation (a mounted
#                             certificate, a changed port) — on one of the two
#                             reference installs it is what makes TLS work at all
copy_if_exists "$PROJECT_DIR/xray/config.json"   "xray/config.json"
copy_if_exists "$PROJECT_DIR/docker-compose.override.yml" "docker-compose.override.yml"

# Remove AdGuard work dir and logs (large, not needed for restore)
rm -rf "$STAGE/adguard/work" 2>/dev/null || true
find "$STAGE" -name "*.log" -delete 2>/dev/null || true

# ── Manifest ──────────────────────────────────────────────────────────────────
# Written AFTER the copies so "files" can list what the archive actually holds.
# A restore that silently leaves something out is indistinguishable from a
# complete one otherwise — this is the record that tells them apart.
HOSTNAME_VAL=$(hostname)
OS_VAL=$(. /etc/os-release 2>/dev/null && echo "$PRETTY_NAME" || uname -s)
DC_VERSION=$(docker compose version --short 2>/dev/null || docker-compose version --short 2>/dev/null || echo "unknown")
EWGC_VERSION="$(cat "$PROJECT_DIR/VERSION" 2>/dev/null || echo "unknown")+$(git -C "$PROJECT_DIR" rev-parse --short HEAD 2>/dev/null || echo "nogit")"

HAS_WG=$([ -d "$STAGE/wireguard" ] && echo "true" || echo "false")
HAS_AG=$([ -d "$STAGE/adguard" ] && echo "true" || echo "false")
HAS_CADDY=$([ -d "$STAGE/caddy" ] && echo "true" || echo "false")
HAS_XRAY=$([ -f "$STAGE/xray/config.json" ] && echo "true" || echo "false")
HAS_OVERRIDE=$([ -f "$STAGE/docker-compose.override.yml" ] && echo "true" || echo "false")
HAS_F2B=$(command -v fail2ban-client &>/dev/null && echo "true" || echo "false")
HAS_UFW=$(command -v ufw &>/dev/null && echo "true" || echo "false")

# Top-level entries only: enough to see at a glance what is in the archive,
# short enough to print during a restore.
FILES_JSON=$(cd "$STAGE" && find . -maxdepth 2 -mindepth 1 \( -type f -o -type d \) \
  | sed 's|^\./||' | grep -v '^manifest\.json$' | grep -v '^ufw-rules\.txt$' | sort \
  | awk '{printf "%s\"%s\"", (NR>1 ? ",\n    " : ""), $0} END {print ""}')

cat > "$STAGE/manifest.json" <<EOF
{
  "project": "Easy-WG-Combo",
  "backup_version": "1",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "created_by": "cli",
  "hostname": "$HOSTNAME_VAL",
  "os": "$OS_VAL",
  "docker_compose_version": "$DC_VERSION",
  "easy_wg_combo_version": "$EWGC_VERSION",
  "components": {
    "wg_easy": $HAS_WG,
    "adguard_home": $HAS_AG,
    "caddy": $HAS_CADDY,
    "xray": $HAS_XRAY,
    "compose_override": $HAS_OVERRIDE,
    "fail2ban": $HAS_F2B,
    "ufw": $HAS_UFW,
    "portal": true
  },
  "files": [
    $FILES_JSON
  ]
}
EOF

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
