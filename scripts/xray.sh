#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Resolve portal URL and password from .env
PORTAL_PASS="${ADMIN_PASSWORD:-}"
if [ -z "$PORTAL_PASS" ] && [ -f "$SCRIPT_DIR/.env" ]; then
  PORTAL_PASS="$(grep -m1 '^ADMIN_PASSWORD=' "$SCRIPT_DIR/.env" 2>/dev/null | cut -d= -f2- | tr -d '"'\'' ' || true)"
fi
PORTAL_HOST="${PORTAL_HOST:-127.0.0.1}"
PORTAL_PORT="${PORTAL_PORT:-8080}"
PORTAL_URL="http://${PORTAL_HOST}:${PORTAL_PORT}"

_api() {
  local method="$1" path="$2" body="${3:-}"
  local args=(-s -X "$method" -H 'Content-Type: application/json')
  [ -n "$PORTAL_PASS" ] && args+=(-u "admin:${PORTAL_PASS}")
  [ -n "$body" ] && args+=(-d "$body")
  curl "${args[@]}" "${PORTAL_URL}${path}"
}

_pretty() {
  python3 -m json.tool 2>/dev/null || cat
}

_field() {
  python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('$1', ''))" 2>/dev/null
}

SUBCMD="${1:-status}"
shift || true

case "$SUBCMD" in
  status)
    _api GET /api/xray/status | _pretty
    ;;
  client-uri)
    LABEL="${1:-${SERVER_NAME:-vpn}}"
    URI="$(_api GET "/api/xray/client-config?label=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$LABEL" 2>/dev/null || printf '%s' "$LABEL")" | _field uri)"
    if [ -z "$URI" ]; then
      echo "Error: could not generate URI. Is XRAY_ENABLED=yes and the portal running?" >&2
      exit 1
    fi
    echo "$URI"
    ;;
  restart)
    _api POST /api/xray/restart '{}' | _pretty
    ;;
  *)
    echo "Usage: ./easywg xray [status|client-uri [label]|restart]" >&2
    exit 1
    ;;
esac
