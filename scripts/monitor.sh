#!/usr/bin/env bash
# Uptime monitor CLI — wraps the portal API
# Usage: ./easywg monitor <subcommand> [args]
set -euo pipefail

PORTAL_URL="${PORTAL_URL:-http://127.0.0.1:8080}"
PORTAL_PASS="${ADMIN_PASSWORD:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -z "$PORTAL_PASS" ] && [ -f "$SCRIPT_DIR/.env" ]; then
  PORTAL_PASS="$(grep -m1 '^ADMIN_PASSWORD=' "$SCRIPT_DIR/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)"
fi

# Pre-flight: verify portal API is reachable and credentials are valid
preflight_check() {
  local http_code
  http_code=$(curl -s -o /dev/null -w '%{http_code}' -u "admin:${PORTAL_PASS}" "${PORTAL_URL}/api/health" 2>/dev/null || echo "000")
  case "$http_code" in
    200) return 0 ;;
    401) echo "Error: Authentication failed. Check ADMIN_PASSWORD in .env or environment." >&2; exit 1 ;;
    000) echo "Error: Portal API is not reachable at ${PORTAL_URL}." >&2
         echo "Check that the portal container is running: ./compose.sh ps" >&2; exit 1 ;;
    *)   echo "Error: Portal API returned HTTP ${http_code}. Check portal logs." >&2; exit 1 ;;
  esac
}

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
    echo "Error: Authentication failed." >&2; exit 1
  fi
  if [ "$http_code" = "404" ]; then
    echo "Error: Endpoint not found (${path}). Check portal version." >&2; exit 1
  fi
  if ! echo "$out" | python3 -c "import json,sys; json.load(sys.stdin)" 2>/dev/null; then
    echo "Error: Portal returned unexpected response (not JSON). HTTP ${http_code}." >&2; exit 1
  fi
  echo "$out"
}

preflight_check

SUBCMD="${1:-list}"
shift || true

case "$SUBCMD" in
  list)
    echo "=== Uptime Monitors ==="
    api GET /api/monitors | python3 -c "
import json, sys
data = json.load(sys.stdin)
mons = data.get('monitors', [])
if not mons:
    print('  (none — default monitors will be seeded on first page load)')
for m in mons:
    status = m.get('lastStatus', 'unknown').upper()
    enabled = '' if m.get('enabled', True) else ' [DISABLED]'
    ms = f\"{m['lastResponseMs']}ms\" if m.get('lastResponseMs') is not None else '—'
    print(f\"  {m['id']:<16}  {m['name']:<25} {m['type']:<10} {status:<8} {ms}{enabled}\")
" 2>/dev/null || api GET /api/monitors
    ;;
  check)
    ID="${1:?Usage: ./easywg monitor check <monitor-id>}"
    echo "Running check for monitor $ID..."
    api POST "/api/monitors/${ID}/check" '{}' | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f\"  Status: {data.get('status', '?').upper()}\")
if 'responseMs' in data:
    print(f\"  Response: {data['responseMs']}ms\")
if 'error' in data:
    print(f\"  Error: {data['error']}\")
" 2>/dev/null || api POST "/api/monitors/${ID}/check" '{}'
    ;;
  history)
    ID="${1:?Usage: ./easywg monitor history <monitor-id>}"
    api GET "/api/monitors/${ID}/history" | python3 -c "
import json, sys
data = json.load(sys.stdin)
hist = data.get('history', [])
print(f'Last {len(hist)} results:')
for h in hist[-10:]:
    ts = h.get('ts','?')[:19]
    print(f\"  {ts}  {h.get('status','?').upper():<8}  {h.get('responseMs','—')}ms\")
" 2>/dev/null
    ;;
  add)
    read -r -p "Monitor name: " name
    echo "Types: http | https | tcp | dns | docker | tls"
    read -r -p "Type: " type
    read -r -p "Target (URL, host:port, container-name, domain, etc.): " target
    read -r -p "Interval in seconds (default 300): " interval
    interval="${interval:-300}"
    api POST /api/monitors "{\"name\":\"$name\",\"type\":\"$type\",\"target\":\"$target\",\"intervalSeconds\":$interval}"
    echo "Monitor created."
    ;;
  enable)
    ID="${1:?Usage: ./easywg monitor enable <monitor-id>}"
    api POST "/api/monitors/${ID}/enable" '{}'
    echo "Monitor $ID enabled."
    ;;
  disable)
    ID="${1:?Usage: ./easywg monitor disable <monitor-id>}"
    api POST "/api/monitors/${ID}/disable" '{}'
    echo "Monitor $ID disabled."
    ;;
  delete)
    ID="${1:?Usage: ./easywg monitor delete <monitor-id>}"
    read -r -p "Delete monitor ${ID}? [y/N]: " confirm
    [ "${confirm,,}" = "y" ] || exit 0
    api DELETE "/api/monitors/${ID}"
    echo "Monitor $ID deleted."
    ;;
  *)
    echo "Unknown monitor subcommand: $SUBCMD" >&2
    echo "Use: list | check | history | add | enable | disable | delete" >&2
    exit 1
    ;;
esac
