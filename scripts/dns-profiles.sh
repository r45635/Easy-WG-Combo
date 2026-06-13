#!/usr/bin/env bash
# DNS profile & routing CLI — wraps the portal API
# Usage: ./easywg dns <subcommand> [args]
#        ./easywg route <subcommand> [args]
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

# ./easywg route <subcommand>
if [ "${1:-}" = "--route" ]; then
  shift
  SUBCMD="${1:-modes}"
  shift || true
  case "$SUBCMD" in
    modes)
      echo "=== Routing Modes ==="
      api GET /api/routing-modes | python3 -c "
import json, sys
data = json.load(sys.stdin)
for m in data.get('modes', []):
    exp = ' (experimental)' if m.get('experimental') else ''
    ips = ', '.join(m.get('allowedIps', []))
    print(f\"  {m['id']:<18} {m['name']:<22} AllowedIPs: {ips}{exp}\")
" 2>/dev/null || api GET /api/routing-modes
      ;;
    set)
      ID="${1:?Usage: ./easywg route set <device-id> <mode>}"
      MODE="${2:?Mode required (full_tunnel|dns_only|private_access|custom)}"
      CIDRS="${3:-}"
      body="{\"mode\":\"$MODE\""
      if [ "$MODE" = "custom" ]; then
        [ -z "$CIDRS" ] && { echo "Custom mode requires CIDRs as 3rd argument (comma-separated)" >&2; exit 1; }
        IFS=',' read -ra arr <<< "$CIDRS"
        json_arr=$(printf '"%s",' "${arr[@]}" | sed 's/,$//')
        body="${body},\"customAllowedIps\":[${json_arr}]"
      fi
      body="${body}}"
      api PATCH "/api/devices/${ID}/routing-mode" "$body"
      echo "Routing mode set to $MODE for device $ID. Re-download the client config to apply."
      ;;
    *)
      echo "Unknown route subcommand: $SUBCMD" >&2
      echo "Use: modes | set <device-id> <mode>" >&2
      exit 1
      ;;
  esac
  exit 0
fi

# ./easywg dns <subcommand>
SUBCMD="${1:-profiles}"
shift || true

case "$SUBCMD" in
  profiles)
    echo "=== DNS Profiles ==="
    api GET /api/dns-profiles | python3 -c "
import json, sys
data = json.load(sys.stdin)
for p in data.get('profiles', []):
    print(f\"  [{p['type']:7}] {p['id']:<20} {p['name']:<20} {p.get('description','')}\")
" 2>/dev/null || api GET /api/dns-profiles
    ;;
  device)
    SUBCMD2="${1:-list}"
    shift || true
    case "$SUBCMD2" in
      list)
        echo "=== Device DNS Assignments ==="
        api GET /api/devices | python3 -c "
import json, sys
data = json.load(sys.stdin)
for d in data.get('devices', []):
    bypass = f\" bypass={d['bypassUntil']}\" if d.get('bypassActive') else ''
    print(f\"  {d['id'][:8]}  {d['name']:<20} profile={d.get('dnsProfile','?'):<20}{bypass}\")
" 2>/dev/null || api GET /api/devices
        ;;
      set)
        ID="${1:?Usage: ./easywg dns device set <device-id> <profile-id>}"
        PROFILE="${2:?Profile ID required}"
        api POST "/api/devices/${ID}/dns-profile" "{\"profileId\":\"$PROFILE\"}"
        echo "DNS profile set to $PROFILE for device $ID."
        ;;
      *)
        echo "Unknown dns device subcommand: $SUBCMD2" >&2
        exit 1
        ;;
    esac
    ;;
  bypass)
    ID="${1:?Usage: ./easywg dns bypass <device-id> <duration>}"
    DUR="${2:-1h}"
    api POST "/api/devices/${ID}/dns-bypass" "{\"duration\":\"$DUR\"}"
    echo "DNS bypass set to $DUR for device $ID."
    ;;
  bypass-revoke)
    ID="${1:?Usage: ./easywg dns bypass-revoke <device-id>}"
    api DELETE "/api/devices/${ID}/dns-bypass"
    echo "DNS bypass revoked for device $ID."
    ;;
  *)
    echo "Unknown dns subcommand: $SUBCMD" >&2
    echo "Use: profiles | device list | device set <id> <profile> | bypass <id> <dur> | bypass-revoke <id>" >&2
    exit 1
    ;;
esac
