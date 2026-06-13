#!/usr/bin/env bash
# Device inventory CLI — wraps the portal API
# Usage: ./easywg device <subcommand> [args]
set -euo pipefail

PORTAL_URL="${PORTAL_URL:-http://127.0.0.1:8080}"
PORTAL_PASS="${ADMIN_PASSWORD:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Load password from .env if not set
if [ -z "$PORTAL_PASS" ] && [ -f "$SCRIPT_DIR/.env" ]; then
  # shellcheck disable=SC1090
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
    echo "=== Devices ==="
    api GET /api/devices | python3 -c "
import json, sys
data = json.load(sys.stdin)
devs = data.get('devices', [])
print(f'  {len(devs)} device(s)')
for d in devs:
    exp = d.get('expiresAt','') or 'never'
    bypass = ' [BYPASS]' if d.get('bypassActive') else ''
    print(f\"  {d['id'][:8]}  {d['name']:<20} {d['status']:<15} dns={d.get('dnsProfile','?'):<20} route={d.get('routingMode','?')}{bypass}\")
" 2>/dev/null || api GET /api/devices
    ;;
  create)
    read -r -p "Device name: " name
    read -r -p "Owner (optional): " owner
    read -r -p "Expiry date YYYY-MM-DD (blank=never): " expires
    local_body="{\"name\":\"$name\",\"owner\":\"$owner\""
    [ -n "$expires" ] && local_body="${local_body},\"expiresAt\":\"${expires}T00:00:00Z\""
    local_body="${local_body}}"
    api POST /api/devices "$local_body"
    ;;
  disable)
    ID="${1:?Usage: ./easywg device disable <id>}"
    api POST "/api/devices/${ID}/disable" '{}'
    echo "Device $ID disabled."
    ;;
  enable)
    ID="${1:?Usage: ./easywg device enable <id>}"
    api POST "/api/devices/${ID}/enable" '{}'
    echo "Device $ID enabled."
    ;;
  revoke)
    ID="${1:?Usage: ./easywg device revoke <id>}"
    read -r -p "Revoke device ${ID}? This permanently blocks access. [y/N]: " confirm
    [ "${confirm,,}" = "y" ] || exit 0
    api POST "/api/devices/${ID}/revoke" '{"confirmed":true}'
    echo "Device $ID revoked."
    ;;
  set-expiry)
    ID="${1:?Usage: ./easywg device set-expiry <id> <YYYY-MM-DD>}"
    DATE="${2:?Date required (YYYY-MM-DD)}"
    api PATCH "/api/devices/${ID}" "{\"expiresAt\":\"${DATE}T00:00:00Z\"}"
    echo "Expiry set to $DATE for device $ID."
    ;;
  *)
    echo "Unknown device subcommand: $SUBCMD" >&2
    echo "Use: list | create | disable | enable | revoke | set-expiry" >&2
    exit 1
    ;;
esac
