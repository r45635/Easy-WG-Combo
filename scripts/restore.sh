#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DRY_RUN=false
USE_ARCHIVE_COMPOSE=false
SKIPPED_OVERRIDE=false
ARCHIVE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --use-archive-compose) USE_ARCHIVE_COMPOSE=true; shift ;;
    -*) echo "Unknown option: $1" >&2; exit 1 ;;
    *) ARCHIVE="$1"; shift ;;
  esac
done

if [ -z "$ARCHIVE" ]; then
  echo "Usage: ./easywg restore [--dry-run] <backup.tar.gz>" >&2
  exit 1
fi

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
log()   { echo -e "${CYAN}[restore]${RESET} $1"; }
ok()    { echo -e "${GREEN}✓${RESET} $1"; }
warn()  { echo -e "${YELLOW}⚠${RESET} $1"; }
fail()  { echo -e "${RED}✗${RESET} $1" >&2; exit 1; }

if [ ! -f "$ARCHIVE" ]; then
  fail "Archive not found: $ARCHIVE"
fi

# ── Decrypt if needed ─────────────────────────────────────────────────────────
WORK_ARCHIVE="$ARCHIVE"
if [[ "$ARCHIVE" == *.age ]]; then
  if ! command -v age &>/dev/null; then
    fail "age not found — install it: apt install age"
  fi
  DECRYPTED_TMP=$(mktemp --suffix=.tar.gz)
  trap 'rm -f "$DECRYPTED_TMP"' EXIT
  log "Decrypting archive…"
  read -rsp "Decryption passphrase: " PASSPHRASE; echo
  echo "$PASSPHRASE" | age --decrypt -o "$DECRYPTED_TMP" "$ARCHIVE" || fail "Decryption failed."
  WORK_ARCHIVE="$DECRYPTED_TMP"
fi

# ── Validate archive ──────────────────────────────────────────────────────────
log "Validating archive…"
if ! tar -tzf "$WORK_ARCHIVE" &>/dev/null; then
  fail "Archive is invalid or corrupted."
fi
# Treat the archive as untrusted: reject absolute paths, '..' traversal, and
# symlink/hardlink/device members before extracting.
LISTING="$(tar -tvzf "$WORK_ARCHIVE" 2>/dev/null)"
if printf '%s\n' "$LISTING" | awk '{print substr($1,1,1)}' | grep -qE '[lhbcps]'; then
  fail "Unsafe backup archive: contains a symlink/hardlink/device entry."
fi
# Extract the FULL member path (everything after the HH:MM[:SS] timestamp, minus
# any '-> target' / 'link to' suffix) so a name containing spaces can't hide a
# traversal — matches the portal's JS validateTarListing.
if printf '%s\n' "$LISTING" \
  | sed -E 's/^.*[0-9]{2}:[0-9]{2}(:[0-9]{2})?[[:space:]]+//; s/ -> .*$//; s/ link to .*$//' \
  | grep -qE '^/|(^|/)\.\.(/|$)'; then
  fail "Unsafe backup archive: absolute path or '..' traversal."
fi

MANIFEST_RAW=$(tar -xzOf "$WORK_ARCHIVE" manifest.json 2>/dev/null || true)
if [ -z "$MANIFEST_RAW" ]; then
  fail "Archive is missing manifest.json — cannot verify compatibility."
fi

log "Manifest:"
echo "$MANIFEST_RAW" | grep -E '"(project|created_at|hostname|os|easy_wg_combo_version)"' | sed 's/^/  /'

if $DRY_RUN; then
  log "Archive contents:"
  tar -tzf "$WORK_ARCHIVE" | head -40 | sed 's/^/  /'
  echo -e "\n${YELLOW}[dry-run] No changes applied.${RESET}"
  exit 0
fi

# ── Confirmation ──────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${RED}WARNING: This will overwrite the current Easy-WG-Combo configuration.${RESET}"
echo ""
read -rp "Type exactly: I understand this will overwrite the current Easy-WG-Combo configuration.
> " CONFIRM

if [ "$CONFIRM" != "I understand this will overwrite the current Easy-WG-Combo configuration." ]; then
  echo "Aborted."
  exit 0
fi

# ── Pre-restore backup ────────────────────────────────────────────────────────
log "Creating pre-restore safety backup…"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
mkdir -p "$BACKUP_DIR"
bash "$SCRIPT_DIR/backup.sh" --output "$BACKUP_DIR" 2>/dev/null || warn "Pre-restore backup failed — continuing anyway."
ok "Pre-restore backup saved to $BACKUP_DIR"

# ── Stop containers ───────────────────────────────────────────────────────────
log "Stopping containers…"
cd "$PROJECT_DIR"
./compose.sh down 2>/dev/null || docker compose down 2>/dev/null || warn "Could not stop containers."

# ── Restore files ─────────────────────────────────────────────────────────────
log "Extracting archive…"
RESTORE_STAGE=$(mktemp -d)
trap 'rm -rf "$RESTORE_STAGE"' EXIT

tar --no-same-owner --no-overwrite-dir -xzf "$WORK_ARCHIVE" -C "$RESTORE_STAGE"

restore_if_exists() {
  local src="$RESTORE_STAGE/$1" dst="$PROJECT_DIR/$1"
  if [ -e "$src" ]; then
    mkdir -p "$(dirname "$dst")"
    rm -rf "$dst"
    cp -rp "$src" "$dst"
    ok "Restored: $1"
  fi
}

restore_if_exists "wireguard"
restore_if_exists "adguard"
restore_if_exists "caddy"
restore_if_exists "portal/data"
restore_if_exists ".env"
restore_if_exists ".env.secrets"
# The Reality key pair and the per-device client list. Without it an Xray
# install comes back with keys that no existing client config matches.
if [ -e "$RESTORE_STAGE/xray/config.json" ]; then
  restore_if_exists "xray/config.json"
  log "Xray config restored — the portal reconciles per-device clients from devices.json on its next start."
fi
# Both compose files from an archive are executed by 'compose.sh up' below, i.e.
# code execution. Keep the repo's version unless the operator explicitly opts in.
# docker-compose.override.yml is not in the repo at all, so skipping it can lose
# a local customisation (a mounted certificate, a changed port): say so, loudly,
# rather than leaving the operator to discover it when TLS fails to come back.
if [ "$USE_ARCHIVE_COMPOSE" = true ]; then
  warn "Restoring compose files from the archive (--use-archive-compose)."
  restore_if_exists "docker-compose.yml"
  restore_if_exists "docker-compose.override.yml"
else
  [ -e "$RESTORE_STAGE/docker-compose.yml" ] && log "Keeping the repo docker-compose.yml (use --use-archive-compose to override)."
  if [ -e "$RESTORE_STAGE/docker-compose.override.yml" ] && \
     ! cmp -s "$RESTORE_STAGE/docker-compose.override.yml" "$PROJECT_DIR/docker-compose.override.yml" 2>/dev/null; then
    SKIPPED_OVERRIDE=true
    warn "NOT restored: docker-compose.override.yml — the archive holds local customisation this host does not have (or has differently). Review it and apply by hand, or re-run with --use-archive-compose:"
    warn "  tar -xzOf \"$ARCHIVE\" ./docker-compose.override.yml"
  fi
fi

# ── Restart services ──────────────────────────────────────────────────────────
log "Starting services…"
cd "$PROJECT_DIR"
./compose.sh up -d 2>/dev/null || docker compose up -d 2>/dev/null || fail "Failed to start services after restore."
ok "Services started."

sleep 3

# ── Validate ──────────────────────────────────────────────────────────────────
log "Checking service status…"
bash "$SCRIPT_DIR/health.sh" --services-only

echo ""
if [ "$SKIPPED_OVERRIDE" = true ]; then
  warn "Restore completed, but docker-compose.override.yml was NOT applied (see above) — this host is not identical to the one that was backed up."
  exit 3
fi
ok "Restore completed successfully."
