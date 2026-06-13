#!/usr/bin/env bash
set -euo pipefail

HARDEN_SSH=false
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --harden-ssh) HARDEN_SSH=true ;;
    --dry-run)    DRY_RUN=true ;;
  esac
done

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

pass()   { echo -e "  ${GREEN}✓${RESET} $1"; }
warn()   { echo -e "  ${YELLOW}⚠${RESET} $1"; }
fail()   { echo -e "  ${RED}✗${RESET} $1"; }
info()   { echo -e "  ${CYAN}·${RESET} $1"; }
header() { echo -e "\n${BOLD}$1${RESET}"; }

SCORE=0
MAX=0

add_check() {
  local pts="$1" result="$2" label="$3"
  MAX=$((MAX + pts))
  if [ "$result" = "pass" ]; then
    SCORE=$((SCORE + pts))
    pass "$label (+${pts} pts)"
  elif [ "$result" = "warn" ]; then
    warn "$label (0 pts)"
  else
    fail "$label (0 pts)"
  fi
}

header "=== Easy-WG-Combo Security Scan ==="

# ── SSH ────────────────────────────────────────────────────────────────────────
header "SSH"
SSH_CFG="/etc/ssh/sshd_config"
SSH_CFG_D="/etc/ssh/sshd_config.d"

get_ssh_val() {
  local key="$1" val=""
  # Check sshd_config.d first (higher priority), then main file
  if [ -d "$SSH_CFG_D" ]; then
    val=$(grep -rhi "^${key}[[:space:]]" "$SSH_CFG_D" 2>/dev/null | tail -1 | awk '{print $2}')
  fi
  if [ -z "$val" ] && [ -f "$SSH_CFG" ]; then
    val=$(grep -i "^${key}[[:space:]]" "$SSH_CFG" 2>/dev/null | tail -1 | awk '{print $2}')
  fi
  echo "${val:-}"
}

if [ -f "$SSH_CFG" ]; then
  ROOT_LOGIN=$(get_ssh_val PermitRootLogin)
  PW_AUTH=$(get_ssh_val PasswordAuthentication)
  SSH_PORT=$(get_ssh_val Port)
  SSH_PORT="${SSH_PORT:-22}"

  if [[ "${ROOT_LOGIN,,}" == "no" || "${ROOT_LOGIN,,}" == "prohibit-password" ]]; then
    add_check 10 "pass" "SSH root login restricted (${ROOT_LOGIN:-not set})"
  else
    add_check 10 "fail" "SSH root login enabled (PermitRootLogin=${ROOT_LOGIN:-yes})"
  fi

  if [[ "${PW_AUTH,,}" == "no" ]]; then
    add_check 10 "pass" "SSH password authentication disabled"
  else
    add_check 10 "fail" "SSH password authentication enabled (PasswordAuthentication=${PW_AUTH:-yes})"
  fi

  info "SSH port: $SSH_PORT"
else
  warn "Cannot read $SSH_CFG"
fi

# ── Firewall ──────────────────────────────────────────────────────────────────
header "Firewall (UFW)"
if command -v ufw &>/dev/null; then
  UFW_STATUS=$(ufw status 2>/dev/null | head -1)
  if echo "$UFW_STATUS" | grep -q "Status: active"; then
    add_check 15 "pass" "UFW is active"
    info "Open ports:"
    ufw status 2>/dev/null | grep "ALLOW" | awk '{printf "    %s\n", $1}' | sort -u
  else
    add_check 15 "fail" "UFW is inactive"
  fi
else
  warn "UFW not installed"
fi

# ── Fail2Ban ──────────────────────────────────────────────────────────────────
header "Fail2Ban"
if command -v fail2ban-client &>/dev/null; then
  if fail2ban-client ping &>/dev/null 2>&1; then
    add_check 15 "pass" "Fail2Ban is active"
    JAILS=$(fail2ban-client status 2>/dev/null | grep "Jail list" | sed 's/.*Jail list:\s*//' || echo "")
    info "Active jails: ${JAILS:-none}"
  else
    add_check 15 "fail" "Fail2Ban not running"
  fi
else
  add_check 15 "fail" "Fail2Ban not installed"
fi

# ── Docker ────────────────────────────────────────────────────────────────────
header "Docker"
if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
  info "Docker running"
  docker ps --format "  · {{.Names}} ({{.Status}})" 2>/dev/null || true
fi

# ── TLS ───────────────────────────────────────────────────────────────────────
header "TLS"
if command -v openssl &>/dev/null; then
  CERT_INFO=$(echo | timeout 3 openssl s_client -connect 127.0.0.1:443 -servername localhost 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || true)
  if [ -n "$CERT_INFO" ]; then
    add_check 15 "pass" "HTTPS active (TLS certificate found)"
    EXPIRY=$(echo "$CERT_INFO" | grep notAfter | cut -d= -f2)
    info "Cert expires: $EXPIRY"
    DAYS=$(( ($(date -d "$EXPIRY" +%s 2>/dev/null || date -jf "%b %d %T %Y %Z" "$EXPIRY" +%s 2>/dev/null || echo 0) - $(date +%s)) / 86400 ))
    if [ "$DAYS" -gt 14 ]; then
      add_check 5 "pass" "Certificate valid for $DAYS days"
    else
      add_check 5 "fail" "Certificate expires in $DAYS days — renew soon"
    fi
  else
    add_check 15 "fail" "HTTPS not active (no TLS on port 443)"
    add_check 5 "fail" "Certificate check skipped"
  fi
fi

# ── System updates ────────────────────────────────────────────────────────────
header "System Updates"
if [ -f /var/run/reboot-required ]; then
  add_check 5 "fail" "Reboot required"
else
  add_check 5 "pass" "No reboot required"
fi

if [ -f /etc/apt/apt.conf.d/20auto-upgrades ]; then
  AUTO_UPG=$(grep -i "Unattended-Upgrade" /etc/apt/apt.conf.d/20auto-upgrades 2>/dev/null | grep '"1"' || true)
  if [ -n "$AUTO_UPG" ]; then
    add_check 10 "pass" "Automatic security updates enabled"
  else
    add_check 10 "fail" "Automatic security updates not enabled"
  fi
else
  add_check 10 "warn" "Cannot check automatic updates config"
fi

# ── Admin portal exposure ─────────────────────────────────────────────────────
header "Admin Portal"
PORTAL_HOST_VAL="${PORTAL_HOST:-127.0.0.1}"
if [[ "$PORTAL_HOST_VAL" == "127.0.0.1" ]]; then
  add_check 15 "pass" "Admin portal bound to localhost only"
else
  add_check 15 "fail" "Admin portal may be publicly exposed (PORTAL_HOST=$PORTAL_HOST_VAL)"
fi

# ── Score ─────────────────────────────────────────────────────────────────────
PCT=0
if [ "$MAX" -gt 0 ]; then PCT=$(( SCORE * 100 / MAX )); fi

header "Security Score"
if [ "$PCT" -ge 90 ]; then
  GRADE="Strong" COLOR="$GREEN"
elif [ "$PCT" -ge 70 ]; then
  GRADE="Good" COLOR="$YELLOW"
elif [ "$PCT" -ge 50 ]; then
  GRADE="Needs attention" COLOR="$YELLOW"
else
  GRADE="Risky" COLOR="$RED"
fi
echo -e "\n  ${BOLD}${COLOR}Score: ${SCORE}/${MAX} (${PCT}%) — ${GRADE}${RESET}\n"

# ── SSH hardening ─────────────────────────────────────────────────────────────
if $HARDEN_SSH; then
  header "SSH Hardening"
  if [ ! -f "$SSH_CFG" ]; then
    echo "SSH config not found at $SSH_CFG" >&2
    exit 1
  fi

  # Safety check: ensure at least one SSH key is configured
  AUTH_KEYS_COUNT=0
  for home in /root /home/*; do
    if [ -f "$home/.ssh/authorized_keys" ]; then
      KEYS=$(grep -c "^ssh-" "$home/.ssh/authorized_keys" 2>/dev/null || echo 0)
      AUTH_KEYS_COUNT=$((AUTH_KEYS_COUNT + KEYS))
    fi
  done

  if [ "$AUTH_KEYS_COUNT" -eq 0 ]; then
    echo -e "${RED}SAFETY ABORT: No SSH authorized_keys found.${RESET}"
    echo "Disabling password authentication without SSH keys would lock you out."
    echo "Add your SSH public key to ~/.ssh/authorized_keys first."
    exit 1
  fi

  info "Found $AUTH_KEYS_COUNT SSH key(s) — safe to proceed"

  CHANGES=()
  CURRENT_ROOT=$(get_ssh_val PermitRootLogin)
  CURRENT_PW=$(get_ssh_val PasswordAuthentication)

  if [[ "${CURRENT_ROOT,,}" != "no" && "${CURRENT_ROOT,,}" != "prohibit-password" ]]; then
    CHANGES+=("PermitRootLogin prohibit-password")
  fi
  if [[ "${CURRENT_PW,,}" != "no" ]]; then
    CHANGES+=("PasswordAuthentication no")
  fi

  if [ "${#CHANGES[@]}" -eq 0 ]; then
    echo -e "  ${GREEN}✓${RESET} SSH is already hardened — no changes needed."
    exit 0
  fi

  echo "  Changes to apply:"
  for c in "${CHANGES[@]}"; do echo "    $c"; done

  if $DRY_RUN; then
    echo -e "\n  ${CYAN}[dry-run] No changes applied.${RESET}"
    exit 0
  fi

  echo ""
  read -rp "Apply these SSH hardening changes? [y/N] " confirm
  if [[ "${confirm,,}" != "y" ]]; then
    echo "Aborted."
    exit 0
  fi

  cp "$SSH_CFG" "${SSH_CFG}.easywg.bak.$(date +%Y%m%d%H%M%S)"
  for change in "${CHANGES[@]}"; do
    KEY="${change%% *}"
    if grep -qi "^#*\s*${KEY}\s" "$SSH_CFG"; then
      sed -i "s|^#*\s*${KEY}\s.*|${change}|I" "$SSH_CFG"
    else
      echo "$change" >> "$SSH_CFG"
    fi
  done

  if command -v sshd &>/dev/null; then
    sshd -t && systemctl reload sshd && echo -e "  ${GREEN}✓${RESET} SSH config reloaded." || echo -e "  ${RED}✗${RESET} Config test failed — reverted."
  else
    echo -e "  ${YELLOW}⚠${RESET} Please reload SSH manually."
  fi
fi
