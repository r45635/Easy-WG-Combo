#!/usr/bin/env bash
# File drop CLI — wraps the portal API
# Usage: ./easywg filedrop <subcommand> [args]
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
    echo "=== Active File Shares ==="
    api GET /api/filedrop | python3 -c "
import json, sys
data = json.load(sys.stdin)
shares = data.get('shares', [])
if not shares:
    print('  (none)')
for s in shares:
    exp = s.get('expiresAt','?')[:10] if s.get('expiresAt') else 'never'
    pw = ' [PW]' if s.get('passwordProtected') else ''
    size = s.get('sizeBytes', 0)
    size_str = f'{size//1024//1024}MB' if size >= 1024*1024 else f'{size//1024}KB'
    print(f\"  {s['id'][-8:]}  {s['originalName']:<30} {size_str:<8} dl:{s['downloads']}/{s['maxDownloads']}  exp:{exp}{pw}\")
" 2>/dev/null || api GET /api/filedrop
    ;;
  upload)
    FILE="${1:?Usage: ./easywg filedrop upload <file-path>}"
    [ -f "$FILE" ] || { echo "File not found: $FILE" >&2; exit 1; }
    read -r -p "Expires in days (default 7, max 30): " expires
    expires="${expires:-7}"
    read -r -p "Max downloads (default 5): " maxdl
    maxdl="${maxdl:-5}"
    read -r -p "Password protect? (blank = none): " pw
    read -r -p "Exposure [vpn_only/public] (default: vpn_only): " mode
    mode="${mode:-vpn_only}"
    confirmed="false"
    if [ "$mode" = "public" ]; then
      read -r -p "WARNING: File will be publicly accessible without VPN. Confirm? [y/N]: " c
      [ "${c,,}" = "y" ] || exit 0
      confirmed="true"
    fi
    local_args=(-s -X POST)
    [ -n "$PORTAL_PASS" ] && local_args+=(-u "admin:${PORTAL_PASS}")
    local_args+=(-F "file=@${FILE}")
    local_args+=(-F "expires=${expires}" -F "maxDownloads=${maxdl}")
    local_args+=(-F "mode=${mode}" -F "confirmed=${confirmed}")
    [ -n "$pw" ] && local_args+=(-F "password=${pw}")
    result=$(curl "${local_args[@]}" "${PORTAL_URL}/api/filedrop/upload")
    echo "$result" | python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'error' in data:
    print(f\"Error: {data['error']}\", file=sys.stderr)
    sys.exit(1)
print(f\"Share URL: ${PORTAL_URL}{data['url']}\")
print(f\"Expires:   {data.get('expiresAt','?')[:10]}\")
print(f\"Max DL:    {data.get('maxDownloads','?')}\")
" 2>/dev/null || echo "$result"
    ;;
  delete)
    ID="${1:?Usage: ./easywg filedrop delete <share-id>}"
    read -r -p "Delete share ${ID} (file will be removed)? [y/N]: " confirm
    [ "${confirm,,}" = "y" ] || exit 0
    api DELETE "/api/filedrop/${ID}"
    echo "Share $ID deleted."
    ;;
  status)
    echo "=== File Drop Storage ==="
    api GET /api/filedrop/status | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f\"  Used:   {data.get('usageMb', '?')} MB\")
print(f\"  Limit:  {data.get('limitMb', '?')} MB\")
print(f\"  Usage:  {data.get('pct', '?')}%\")
print(f\"  Shares: {data.get('shareCount', '?')}\")
" 2>/dev/null || api GET /api/filedrop/status
    ;;
  cleanup)
    echo "Cleaning up expired and exhausted shares..."
    api POST /api/filedrop/cleanup '{}' | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f\"  Cleaned: {data.get('cleaned', 0)} share(s)\")
" 2>/dev/null || api POST /api/filedrop/cleanup '{}'
    ;;
  *)
    echo "Unknown filedrop subcommand: $SUBCMD" >&2
    echo "Use: list | upload | delete | status | cleanup" >&2
    exit 1
    ;;
esac
