#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SERVICES_ONLY=false
CHECK_ALERTS=false

for arg in "$@"; do
  case "$arg" in
    --services-only) SERVICES_ONLY=true ;;
    --check-alerts)  CHECK_ALERTS=true ;;
  esac
done

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

ok()   { echo -e "  ${GREEN}✓${RESET} $1"; }
warn() { echo -e "  ${YELLOW}⚠${RESET} $1"; }
fail() { echo -e "  ${RED}✗${RESET} $1"; }
info() { echo -e "  ${CYAN}·${RESET} $1"; }
header() { echo -e "\n${BOLD}$1${RESET}"; }

header "=== Easy-WG-Combo Health Check ==="

# ── Services ──────────────────────────────────────────────────────────────────
header "Services"

check_docker_container() {
  local name="$1"
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${name}$"; then
    local status
    status=$(docker inspect --format '{{.State.Status}}' "$name" 2>/dev/null || echo "unknown")
    if [ "$status" = "running" ]; then
      local uptime
      uptime=$(docker inspect --format '{{.State.StartedAt}}' "$name" 2>/dev/null | cut -c1-19 | tr 'T' ' ' || echo "")
      ok "$name (running since $uptime)"
    else
      fail "$name ($status)"
    fi
  else
    fail "$name (not found)"
  fi
}

if command -v docker &>/dev/null; then
  check_docker_container "wg-easy"
  check_docker_container "adguard"
  check_docker_container "portal"
  check_docker_container "caddy"
else
  warn "docker not found — cannot check container status"
fi

if command -v fail2ban-client &>/dev/null; then
  if fail2ban-client ping &>/dev/null 2>&1; then
    ok "fail2ban (active)"
  else
    fail "fail2ban (not running)"
  fi
else
  warn "fail2ban-client not found"
fi

if command -v ufw &>/dev/null; then
  if ufw status 2>/dev/null | grep -q "Status: active"; then
    ok "ufw (active)"
  else
    warn "ufw (inactive)"
  fi
fi

if $SERVICES_ONLY; then exit 0; fi

# ── System Metrics ─────────────────────────────────────────────────────────────
header "System"

info "Hostname: $(hostname)"
info "OS:       $(. /etc/os-release 2>/dev/null && echo "$PRETTY_NAME" || uname -s)"
info "Kernel:   $(uname -r)"
info "Uptime:   $(uptime -p 2>/dev/null || uptime | awk -F'up ' '{print $2}' | awk -F',' '{print $1}')"
info "Load avg: $(cat /proc/loadavg | awk '{print $1, $2, $3}')"

header "Memory"
if command -v free &>/dev/null; then
  free -h | awk 'NR==2{printf "  Total: %s  Used: %s  Free: %s\n", $2, $3, $4}'
fi

header "Disk"
df -h / 2>/dev/null | awk 'NR==2{printf "  /: %s used of %s (%s)\n", $3, $2, $5}'
if [ -d "$PROJECT_DIR/backups" ]; then
  BSIZE=$(du -sh "$PROJECT_DIR/backups" 2>/dev/null | awk '{print $1}')
  info "Backups: $BSIZE in $PROJECT_DIR/backups"
fi

header "Network"
if command -v ip &>/dev/null; then
  IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}' || echo "unknown")
  info "Local IP: $IP"
fi
if command -v wg &>/dev/null; then
  WG_PEERS=$(wg show 2>/dev/null | grep -c "^peer:" || echo "0")
  info "WireGuard peers: $WG_PEERS"
fi

# ── Alerts ────────────────────────────────────────────────────────────────────
if $CHECK_ALERTS; then
  header "Alerts"
  ALERT_DISK_THRESHOLD="${ALERT_DISK_THRESHOLD:-85}"
  DISK_PCT=$(df / 2>/dev/null | awk 'NR==2{gsub(/%/,"",$5); print $5}')
  if [ -n "$DISK_PCT" ] && [ "$DISK_PCT" -ge "$ALERT_DISK_THRESHOLD" ]; then
    warn "Disk usage at ${DISK_PCT}% — above threshold of ${ALERT_DISK_THRESHOLD}%"
    if [ -f "$PROJECT_DIR/scripts/notify.sh" ]; then
      bash "$PROJECT_DIR/scripts/notify.sh" send "Disk usage alert: ${DISK_PCT}% on $(hostname)" 2>/dev/null || true
    fi
  fi
fi

echo ""
