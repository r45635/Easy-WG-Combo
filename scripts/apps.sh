#!/usr/bin/env bash
# App launcher CLI — wraps the portal API
# Usage: ./easywg app <subcommand> [args]
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
  catalog)
    echo "=== Available Apps ==="
    api GET /api/apps/catalog | python3 -c "
import json, sys
data = json.load(sys.stdin)
for a in data.get('catalog', []):
    print(f\"  {a['id']:<20} {a['name']:<20} port={a['internalPort']}  min={a['minRamMb']}MB  {a['description']}\")
" 2>/dev/null || api GET /api/apps/catalog
    ;;
  list)
    echo "=== Installed Apps ==="
    api GET /api/apps | python3 -c "
import json, sys
data = json.load(sys.stdin)
apps = data.get('apps', [])
if not apps:
    print('  (none installed)')
for a in apps:
    status = 'RUNNING' if a.get('running') else a.get('containerStatus', 'stopped').upper()
    domain = a.get('domain', '')
    print(f\"  {a['id']:<20} {status:<12} {domain}\")
" 2>/dev/null || api GET /api/apps
    ;;
  install)
    ID="${1:?Usage: ./easywg app install <app-id>}"
    read -r -p "Exposure [vpn_only/public] (default: vpn_only): " exposure
    exposure="${exposure:-vpn_only}"
    confirmed="false"
    domain=""
    if [ "$exposure" = "public" ]; then
      read -r -p "WARNING: App will be publicly accessible. Confirm? [y/N]: " c
      [ "${c,,}" = "y" ] || exit 0
      confirmed="true"
      read -r -p "Domain (e.g. app.example.com): " domain
    fi
    api POST "/api/apps/${ID}/install" "{\"exposure\":\"$exposure\",\"domain\":\"$domain\",\"confirmed\":$confirmed}"
    echo "App $ID install requested."
    ;;
  start)
    ID="${1:?Usage: ./easywg app start <app-id>}"
    api POST "/api/apps/${ID}/start" '{}'
    echo "App $ID started."
    ;;
  stop)
    ID="${1:?Usage: ./easywg app stop <app-id>}"
    api POST "/api/apps/${ID}/stop" '{}'
    echo "App $ID stopped."
    ;;
  restart)
    ID="${1:?Usage: ./easywg app restart <app-id>}"
    api POST "/api/apps/${ID}/restart" '{}'
    echo "App $ID restarted."
    ;;
  logs)
    ID="${1:?Usage: ./easywg app logs <app-id>}"
    api GET "/api/apps/${ID}/logs" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(data.get('logs', '(no logs)'))
" 2>/dev/null || api GET "/api/apps/${ID}/logs"
    ;;
  update)
    ID="${1:?Usage: ./easywg app update <app-id>}"
    echo "Pulling latest image and restarting $ID..."
    api POST "/api/apps/${ID}/update" '{}'
    echo "App $ID updated."
    ;;
  remove)
    ID="${1:?Usage: ./easywg app remove <app-id>}"
    read -r -p "Remove app ${ID}? [y/N]: " confirm
    [ "${confirm,,}" = "y" ] || exit 0
    delete_data="false"
    read -r -p "Also delete app data volumes? (cannot be undone) [y/N]: " del
    [ "${del,,}" = "y" ] && delete_data="true"
    api POST "/api/apps/${ID}/remove" "{\"confirmed\":true,\"deleteData\":${delete_data}}"
    echo "App $ID removed."
    ;;
  *)
    echo "Unknown app subcommand: $SUBCMD" >&2
    echo "Use: catalog | list | install | start | stop | restart | logs | update | remove" >&2
    exit 1
    ;;
esac
