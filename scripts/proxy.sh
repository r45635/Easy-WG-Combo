#!/usr/bin/env bash
# Reverse proxy CLI — wraps the portal API
# Usage: ./easywg proxy <subcommand> [args]
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
  curl "${args[@]}" "${PORTAL_URL}${path}"
}

SUBCMD="${1:-list}"
shift || true

case "$SUBCMD" in
  list)
    echo "=== Proxy Services ==="
    api GET /api/proxy/services | python3 -c "
import json, sys
data = json.load(sys.stdin)
svcs = data.get('services', [])
if not svcs:
    print('  (none)')
for s in svcs:
    enabled = '' if s.get('enabled', True) else ' [DISABLED]'
    print(f\"  {s['id'][-6:]}  {s['name']:<20} {s['exposure']:<12} {s['domain']:<30} -> {s['target']}{enabled}\")
" 2>/dev/null || api GET /api/proxy/services
    ;;
  create)
    read -r -p "Service name: " name
    read -r -p "Domain (e.g. app.example.com): " domain
    read -r -p "Target URL (e.g. http://10.8.0.5:8080): " target
    read -r -p "Exposure [vpn_only/public] (default: vpn_only): " exposure
    exposure="${exposure:-vpn_only}"
    confirmed="false"
    if [ "$exposure" = "public" ]; then
      read -r -p "WARNING: This will expose the service publicly via HTTPS. Confirm? [y/N]: " c
      [ "${c,,}" = "y" ] || exit 0
      confirmed="true"
    fi
    api POST /api/proxy/services "{\"name\":\"$name\",\"domain\":\"$domain\",\"target\":\"$target\",\"exposure\":\"$exposure\",\"confirmed\":$confirmed}"
    ;;
  delete)
    ID="${1:?Usage: ./easywg proxy delete <service-id>}"
    read -r -p "Delete service ${ID}? [y/N]: " confirm
    [ "${confirm,,}" = "y" ] || exit 0
    api DELETE "/api/proxy/services/${ID}"
    echo "Service $ID deleted."
    ;;
  enable)
    ID="${1:?Usage: ./easywg proxy enable <service-id>}"
    api POST "/api/proxy/services/${ID}/enable" '{}'
    echo "Service $ID enabled."
    ;;
  disable)
    ID="${1:?Usage: ./easywg proxy disable <service-id>}"
    api POST "/api/proxy/services/${ID}/disable" '{}'
    echo "Service $ID disabled."
    ;;
  validate)
    echo "=== Caddy Config Validation ==="
    api POST /api/proxy/validate '{}' | python3 -c "
import json, sys
data = json.load(sys.stdin)
ok  = data.get('ok', False)
adm = data.get('adminUp', False)
print(f'  Caddy admin reachable: {\"yes\" if adm else \"NO — run ./easywg migrate\"}')
print(f'  Config status: {\"ok\" if ok else data.get(\"error\",\"error\")}')
if 'configPreview' in data:
    print()
    print('  Config preview:')
    for line in data['configPreview'].splitlines():
        print(f'    {line}')
" 2>/dev/null || api POST /api/proxy/validate '{}'
    ;;
  *)
    echo "Unknown proxy subcommand: $SUBCMD" >&2
    echo "Use: list | create | delete | enable | disable | validate" >&2
    exit 1
    ;;
esac
