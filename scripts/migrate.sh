#!/usr/bin/env bash
# Migrate an existing Easy-WG-Combo deployment to Phase 2.
# Safe to run multiple times — idempotent.
# Run from the project root or via: ./easywg migrate
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CADDY_FILE="$SCRIPT_DIR/caddy/Caddyfile"
SERVICES_FILE="$SCRIPT_DIR/caddy/easywg-services.caddy"

log()  { printf '[migrate] %s\n' "$*"; }
warn() { printf '[migrate] WARNING: %s\n' "$*" >&2; }

# 1. Create the managed services placeholder if it doesn't exist
if [ ! -f "$SERVICES_FILE" ]; then
  printf '# Easy-WG-Combo managed proxy services — edited by the portal, do not edit manually\n' > "$SERVICES_FILE"
  log "Created $SERVICES_FILE"
else
  log "$SERVICES_FILE already exists — skipped"
fi

# 2. Patch Caddyfile: replace "admin off" with "admin localhost:2019"
if [ ! -f "$CADDY_FILE" ]; then
  warn "Caddyfile not found at $CADDY_FILE — run bootstrap first"
  exit 1
fi

if grep -q 'admin off' "$CADDY_FILE"; then
  sed -i 's/admin off/admin localhost:2019/' "$CADDY_FILE"
  log "Enabled Caddy admin API on localhost:2019"
elif grep -q 'admin localhost:2019' "$CADDY_FILE"; then
  log "Caddy admin already enabled — skipped"
else
  warn "Could not find 'admin' directive in $CADDY_FILE — please add 'admin localhost:2019' manually"
fi

# 3. Add import directive for managed services if not already present
if ! grep -q 'import.*easywg-services.caddy' "$CADDY_FILE"; then
  printf '\nimport /etc/caddy/easywg-services.caddy\n' >> "$CADDY_FILE"
  log "Added 'import /etc/caddy/easywg-services.caddy' to Caddyfile"
else
  log "Import directive already present — skipped"
fi

log "Migration complete."
log "Restart Caddy with:  ./compose.sh restart caddy"
log "Or rebuild fully:    ./compose.sh up -d --build"
