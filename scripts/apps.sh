#!/usr/bin/env bash
# App launcher CLI — wraps the portal API
# Usage: ./easywg app <subcommand> [args]
#
# STATUS: EXPERIMENTAL — only the catalog command is enabled.
# Install/start/stop/remove require Docker socket lifecycle management
# which has not yet been validated on a live deployment.
set -euo pipefail

PORTAL_URL="${PORTAL_URL:-http://127.0.0.1:8080}"
PORTAL_PASS="${ADMIN_PASSWORD:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -z "$PORTAL_PASS" ] && [ -f "$SCRIPT_DIR/.env" ]; then
  PORTAL_PASS="$(grep -m1 '^ADMIN_PASSWORD=' "$SCRIPT_DIR/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)"
fi

api() {
  local method="$1" path="$2"
  local body="${3:-}"
  local args=(-s -X "$method" -H "Content-Type: application/json")
  [ -n "$PORTAL_PASS" ] && args+=(-u "admin:${PORTAL_PASS}")
  [ -n "$body" ] && args+=(-d "$body")
  local out http_code
  out=$(curl "${args[@]}" -w '\n%{http_code}' "${PORTAL_URL}${path}")
  http_code="${out##*$'\n'}"
  out="${out%$'\n'*}"
  if [ "$http_code" = "401" ]; then
    echo "Error: Authentication failed. Check ADMIN_PASSWORD." >&2; exit 1
  fi
  if ! echo "$out" | python3 -c "import json,sys; json.load(sys.stdin)" 2>/dev/null; then
    echo "Error: Portal API returned unexpected response (not JSON). Is the portal running?" >&2; exit 1
  fi
  echo "$out"
}

SUBCMD="${1:-catalog}"
shift || true

case "$SUBCMD" in
  catalog)
    api GET /api/apps/catalog | python3 -c "
import json, sys
data = json.load(sys.stdin)
catalog = data.get('catalog', [])
if not catalog:
    print('  (no apps in catalog)')
    sys.exit(0)
print(f'  {\"ID\":<20} {\"Name\":<20} {\"Port\":<8} {\"Min RAM\":<10} Description')
print('  ' + '-'*90)
for a in catalog:
    print(f\"  {a['id']:<20} {a['name']:<20} {a['internalPort']:<8} {a['minRamMb']}MB  {a['description']}\")
" 2>/dev/null || api GET /api/apps/catalog
    ;;
  *)
    echo "Apps module is experimental and not yet enabled." >&2
    echo "Only 'catalog' is available: ./easywg app catalog" >&2
    exit 2
    ;;
esac
