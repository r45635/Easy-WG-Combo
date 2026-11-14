#!/usr/bin/env bash
# Bring up a throwaway Easy-WG-Combo stack filled with fictitious data, so the
# documentation screenshots never carry real device names, hostnames or keys.
#
#   ./demo-stack.sh up      # start it, print the URL
#   ./demo-stack.sh down    # remove every container and the state directory
#
# Nothing here touches a production install: separate container names, separate
# ports, state under a temp directory. Runs on macOS and Linux (Docker only —
# wg-easy needs no kernel module to serve its UI).
set -euo pipefail

STATE="${DEMO_STATE:-${TMPDIR:-/tmp}/easy-wg-demo}"
PASS='demo-pass-123'            # throwaway, for a stack that is deleted after use
PORTAL_PORT=18081
WG_PORT=15821
AG_PORT=13000
AG_DNS_PORT=15353
PORTAL_IMAGE="ghcr.io/r45635/easy-wg-combo-portal:$(cat "$(dirname "$0")/../../VERSION" 2>/dev/null || echo latest)"
WG_IMAGE='ghcr.io/wg-easy/wg-easy:14'
AG_IMAGE='adguard/adguardhome:v0.107.80'
XRAY_IMAGE='ghcr.io/xtls/xray-core:26.10.31'

down() {
  docker rm -f demo-portal demo-wgeasy demo-adguard xray >/dev/null 2>&1 || true
  rm -rf "$STATE"
  echo "demo stack removed"
}

up() {
  down
  mkdir -p "$STATE/data/storage" "$STATE/host" "$STATE/xray/logs"

  # Portal state: a server name and devices that belong to nobody.
  printf '%s\n' '{ "serverName": "vpn-demo", "interfaceMode": "advanced" }' > "$STATE/data/portal-config.json"
  for f in devices filedrop-shares monitors proxy-services; do echo '{}' > "$STATE/data/$f.json"; done

  # A hardened-looking host config, so the Security tab reports something
  # representative rather than the container's own (unfirewalled) reality.
  cat > "$STATE/host/sshd_config" <<'SSH'
Port 22
PermitRootLogin prohibit-password
PasswordAuthentication no
PubkeyAuthentication yes
X11Forwarding no
SSH
  : > "$STATE/host/fail2ban.log"
  cat > "$STATE/host/fail2ban-client" <<'F2B'
#!/bin/sh
# Demo stub: an idle, healthy jail.
[ "$1" = status ] && printf 'Status for the jail: %s\n|- Filter\n|  |- Currently failed:\t0\n`- Actions\n   |- Currently banned:\t0\n   |- Total banned:\t0\n   `- Banned IP list:\t\n' "${2:-easy-wg-portal}"
F2B
  chmod +x "$STATE/host/fail2ban-client"

  echo "starting adguard…"
  docker run -d --name demo-adguard -p "$AG_PORT:3000" -p "$AG_DNS_PORT:53/udp" "$AG_IMAGE" >/dev/null
  sleep 6
  curl -fsS -X POST "http://127.0.0.1:$AG_PORT/control/install/configure" -H 'Content-Type: application/json' \
    -d "{\"web\":{\"ip\":\"0.0.0.0\",\"port\":3000},\"dns\":{\"ip\":\"0.0.0.0\",\"port\":53},\"username\":\"admin\",\"password\":\"$PASS\"}" >/dev/null
  sleep 3
  echo "seeding DNS traffic so the AdGuard dashboard is not empty…"
  for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
    for d in github.com wikipedia.org cloudflare.com ad.doubleclick.net googleadservices.com; do
      dig +short +time=1 +tries=1 "@127.0.0.1" -p "$AG_DNS_PORT" "$d" >/dev/null 2>&1 || true
    done
  done

  echo "starting wg-easy…"
  hash=$(docker run --rm "$WG_IMAGE" wgpw "$PASS" | sed "s/^PASSWORD_HASH='//;s/'$//")
  docker run -d --name demo-wgeasy -e WG_HOST=203.0.113.10 -e PASSWORD_HASH="$hash" \
    -p "$WG_PORT:51821" --cap-add NET_ADMIN --cap-add SYS_MODULE --sysctl net.ipv4.ip_forward=1 "$WG_IMAGE" >/dev/null
  sleep 10
  cookie="$STATE/cookies.txt"
  curl -fsS -c "$cookie" -X POST "http://127.0.0.1:$WG_PORT/api/session" \
    -H 'Content-Type: application/json' -d "{\"password\":\"$PASS\"}" >/dev/null
  for n in Laptop Phone Tablet; do
    curl -fsS -b "$cookie" -X POST "http://127.0.0.1:$WG_PORT/api/wireguard/client" \
      -H 'Content-Type: application/json' -d "{\"name\":\"$n\"}" >/dev/null
  done

  echo "starting xray (throwaway Reality keys)…"
  keys=$(docker run --rm "$XRAY_IMAGE" x25519)
  priv=$(echo "$keys" | awk -F': ' '/[Pp]rivate/{print $2}')
  pub=$(echo  "$keys" | awk -F': ' '/[Pp]ublic/{print $2}')
  uuid=$(uuidgen | tr 'A-Z' 'a-z')
  short=$(head -c4 /dev/urandom | od -An -tx1 | tr -d ' \n')
  cat > "$STATE/xray/config.json" <<XRAY
{ "log": { "loglevel": "warning" },
  "inbounds": [{ "port": 443, "protocol": "vless",
    "settings": { "clients": [{ "id": "$uuid", "flow": "xtls-rprx-vision" }], "decryption": "none" },
    "streamSettings": { "network": "tcp", "security": "reality",
      "realitySettings": { "dest": "www.cloudflare.com:443", "serverNames": ["www.cloudflare.com"],
        "privateKey": "$priv", "shortIds": ["$short"] } } }],
  "outbounds": [{ "protocol": "freedom" }] }
XRAY
  # Container named `xray`: that is the name the portal asks Docker about.
  docker run -d --name xray -p 14430:443 \
    -v "$STATE/xray/config.json:/etc/xray/config.json:ro" -v "$STATE/xray/logs:/var/log/xray" \
    "$XRAY_IMAGE" run -config /etc/xray/config.json >/dev/null

  echo "starting portal…"
  sock=$(readlink -f /var/run/docker.sock 2>/dev/null || echo /var/run/docker.sock)
  docker run -d --name demo-portal -p "$PORTAL_PORT:8080" \
    -e PORTAL_PORT=8080 -e PORTAL_HOST=0.0.0.0 -e SERVER_NAME=vpn-demo -e ADMIN_PASSWORD="$PASS" \
    -e WG_EASY_URL="http://host.docker.internal:$WG_PORT" -e WG_EASY_PASSWORD="$PASS" \
    -e ADGUARD_URL="http://host.docker.internal:$AG_PORT" -e ADGUARD_USER=admin -e ADGUARD_PASSWORD="$PASS" \
    -e WG_HOST=203.0.113.10 -e WG_DEFAULT_DNS=10.8.0.1 -e SESSION_SECRET=demo-session-secret \
    -e XRAY_ENABLED=yes -e XRAY_UUID="$uuid" -e XRAY_PUBLIC_KEY="$pub" -e XRAY_SHORT_ID="$short" \
    -e XRAY_SNI_TARGET=www.cloudflare.com -e XRAY_PORT=443 \
    -v "$STATE/data:/data" -v "$STATE/xray:/xray-config" \
    -v "$STATE/host/sshd_config:/etc/ssh/sshd_config:ro" \
    -v "$STATE/host/fail2ban.log:/var/log/fail2ban.log:ro" \
    -v "$STATE/host/fail2ban-client:/usr/local/bin/fail2ban-client:ro" \
    -v "$sock:/var/run/docker.sock" \
    --add-host host.docker.internal:host-gateway "$PORTAL_IMAGE" >/dev/null
  sleep 8
  echo
  echo "demo portal: http://127.0.0.1:$PORTAL_PORT/  (password: $PASS)"
  echo "state: $STATE  —  run './demo-stack.sh down' when finished"
}

case "${1:-up}" in
  up)   up ;;
  down) down ;;
  *)    echo "usage: $0 [up|down]" >&2; exit 2 ;;
esac
