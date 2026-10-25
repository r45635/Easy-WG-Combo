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
  rotate-keys)
    # Rotating the Reality key pair invalidates EVERY client configuration:
    # the public key and short ID are both carried in the VLESS URI. Per-device
    # UUIDs are deliberately left alone, so a device keeps its identity and
    # only needs the new URI — but it does need it, on every device.
    DRY=0; CONFIRM=0
    for a in "$@"; do case "$a" in
      --dry-run) DRY=1 ;; --confirm) CONFIRM=1 ;;
      *) echo "Usage: easywg xray rotate-keys [--dry-run] [--confirm]" >&2; exit 64 ;;
    esac; done

    ENV_FILE="$SCRIPT_DIR/.env"; SEC_FILE="$SCRIPT_DIR/.env.secrets"
    CFG="$SCRIPT_DIR/xray/config.json"
    [ -f "$ENV_FILE" ] || { echo "Error: $ENV_FILE not found." >&2; exit 1; }
    grep -q '^XRAY_ENABLED=yes' "$ENV_FILE" || { echo "Error: XRAY_ENABLED is not yes — nothing to rotate." >&2; exit 1; }
    [ -f "$CFG" ] || { echo "Error: $CFG not found — run ./bootstrap.sh first." >&2; exit 1; }

    devices=$(python3 -c "
import json;print(len(json.load(open('$SCRIPT_DIR/portal/data/devices.json')).keys()))" 2>/dev/null || echo "?")
    cat <<WARN

  Rotating the Xray Reality key pair.

  WHAT BREAKS: every existing VLESS client configuration stops working, at
  once. The public key and short ID are part of the URI, so each device must
  be given the new one — re-scan its QR code from the Devices tab, or re-import
  the URI from './easywg xray client-uri'.

  Devices currently registered: ${devices}
  Per-device UUIDs are NOT changed: a device keeps its identity, it only needs
  the new URI. WireGuard is untouched; only VLESS clients are affected.

  Do this when a private key may have leaked, or on a schedule you have chosen
  — not casually.

WARN
    if [ "$DRY" = "1" ]; then echo "  [dry-run] nothing written."; exit 0; fi
    if [ "$CONFIRM" != "1" ]; then
      echo "  Re-run with --confirm once every device can be re-provisioned."
      exit 1
    fi

    ts=$(date +%Y%m%d-%H%M%S)
    cp -a "$ENV_FILE" "$ENV_FILE.bak.$ts"; cp -a "$SEC_FILE" "$SEC_FILE.bak.$ts"; cp -a "$CFG" "$CFG.bak.$ts"
    echo "  Backed up .env, .env.secrets and xray/config.json (.bak.$ts)"

    xray_image="$(awk '/image: *ghcr.io\/xtls\/xray-core/ {print $2; exit}' "$SCRIPT_DIR/docker-compose.xray.yml")"
    [ -n "$xray_image" ] || { echo "Error: could not read the xray image." >&2; exit 1; }
    keypair="$(docker run --rm "$xray_image" x25519 2>/dev/null)"
    new_priv="$(printf '%s' "$keypair" | grep -i 'private' | awk '{print $NF}')"
    new_pub="$(printf '%s' "$keypair" | grep -i 'public'  | awk '{print $NF}')"
    new_sid="$(od -An -N8 -tx1 /dev/urandom | tr -d ' \n')"
    [ -n "$new_priv" ] && [ -n "$new_pub" ] || { echo "Error: key generation failed — nothing changed." >&2; exit 1; }

    tmp=$(mktemp); grep -vE '^XRAY_PUBLIC_KEY=' "$ENV_FILE" > "$tmp"; printf 'XRAY_PUBLIC_KEY=%s\n' "$new_pub" >> "$tmp"; mv "$tmp" "$ENV_FILE"
    tmp=$(mktemp); grep -vE "^export (XRAY_PRIVATE_KEY|XRAY_SHORT_ID)=" "$SEC_FILE" > "$tmp"
    printf "export XRAY_PRIVATE_KEY='%s'\nexport XRAY_SHORT_ID='%s'\n" "$new_priv" "$new_sid" >> "$tmp"; mv "$tmp" "$SEC_FILE"; chmod 600 "$SEC_FILE"

    python3 - "$CFG" "$new_priv" "$new_sid" <<'PYEOF'
import json, sys
cfg_path, priv, sid = sys.argv[1], sys.argv[2], sys.argv[3]
cfg = json.load(open(cfg_path))
rs = cfg["inbounds"][0]["streamSettings"]["realitySettings"]
rs["privateKey"] = priv
rs["shortIds"] = [sid]
json.dump(cfg, open(cfg_path, "w"), indent=2)
PYEOF
    echo "  New key pair and short ID written."

    # The portal reads XRAY_PUBLIC_KEY / XRAY_SHORT_ID from its environment, so
    # it must be recreated, not merely restarted, to serve the new URIs.
    "$SCRIPT_DIR/compose.sh" up -d xray portal
    echo ""
    echo "  Done. Every device now needs its new URI:"
    echo "    ./easywg xray client-uri          # the global one"
    echo "    or re-scan each device's QR from the Devices tab (⊛)"
    echo "  Previous values kept in *.bak.$ts if you must roll back."
    ;;
  restart)
    _api POST /api/xray/restart '{}' | _pretty
    ;;
  *)
    echo "Usage: ./easywg xray [status|client-uri [label]|restart]" >&2
    exit 1
    ;;
esac
