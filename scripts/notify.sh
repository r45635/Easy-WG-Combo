#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
NOTIF_CONFIG="${PROJECT_DIR}/portal/data/notifications.json"

SUBCMD="${1:-status}"
shift || true

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RESET='\033[0m'
ok()   { echo -e "${GREEN}✓${RESET} $1"; }
warn() { echo -e "${YELLOW}⚠${RESET} $1"; }
fail() { echo -e "${RED}✗${RESET} $1" >&2; exit 1; }

get_config() {
  local key="$1" default="${2:-}"
  if [ ! -f "$NOTIF_CONFIG" ]; then echo "$default"; return; fi
  python3 -c "
import json, sys
try:
  d = json.load(open('$NOTIF_CONFIG'))
  parts = '$key'.split('.')
  v = d
  for p in parts: v = v.get(p, None)
  print(v if v is not None else '$default')
except: print('$default')
" 2>/dev/null || echo "$default"
}

send_webhook() {
  local message="$1"
  local url
  url=$(get_config "channels.webhook.url" "")
  if [ -z "$url" ]; then return 1; fi
  curl -s -X POST -H "Content-Type: application/json" \
    -d "{\"text\": \"$message\"}" "$url" --max-time 10 >/dev/null 2>&1
}

send_email() {
  local subject="$1" body="$2"
  # Basic SMTP via curl (requires curl with SMTP support)
  local host port from to user pass
  host=$(get_config "channels.email.smtp_host" "")
  port=$(get_config "channels.email.smtp_port" "587")
  from=$(get_config "channels.email.from" "")
  to=$(get_config "channels.email.to" "")
  user=$(get_config "channels.email.username" "")
  pass=$(get_config "channels.email.password" "")

  if [ -z "$host" ] || [ -z "$to" ]; then return 1; fi

  curl -s --url "smtp://${host}:${port}" \
    --user "${user}:${pass}" \
    --mail-from "$from" --mail-rcpt "$to" \
    --upload-file - --max-time 15 <<EOF >/dev/null 2>&1
From: $from
To: $to
Subject: [Easy-WG-Combo] $subject

$body
EOF
}

case "$SUBCMD" in
  status)
    echo "Notification configuration:"
    if [ -f "$NOTIF_CONFIG" ]; then
      ENABLED=$(get_config "enabled" "false")
      WEBHOOK=$(get_config "channels.webhook.url" "")
      SMTP_HOST=$(get_config "channels.email.smtp_host" "")
      echo "  Enabled: $ENABLED"
      echo "  Webhook: $([ -n "$WEBHOOK" ] && echo "configured" || echo "not configured")"
      echo "  SMTP:    $([ -n "$SMTP_HOST" ] && echo "$SMTP_HOST" || echo "not configured")"
    else
      warn "No notification config found at $NOTIF_CONFIG"
    fi
    ;;

  test)
    MESSAGE="Test notification from Easy-WG-Combo on $(hostname) at $(date)"
    SENT=0
    send_webhook "$MESSAGE" && ok "Webhook notification sent." && SENT=1 || true
    send_email "Test notification" "$MESSAGE" && ok "Email notification sent." && SENT=1 || true
    if [ "$SENT" -eq 0 ]; then
      warn "No notification channels configured or reachable."
    fi
    ;;

  send)
    MESSAGE="${1:-Easy-WG-Combo notification}"
    send_webhook "$MESSAGE" || true
    send_email "Alert" "$MESSAGE" || true
    ok "Notification dispatched."
    ;;

  *)
    echo "Usage: ./easywg notify [status|test|send <message>]" >&2
    exit 1
    ;;
esac
