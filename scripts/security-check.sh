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

# Which port does Caddy actually serve the admin portal on? Read the Caddyfile,
# not .env: one of the two reference installs serves 8443 with no
# CADDY_HTTPS_PORT in its .env at all. Prints nothing when the portal is on the
# default :443 (shared with public Gateway services) or bound to loopback.
# TWIN: detectAdminPort() in portal/server.js. Change both.
detect_admin_port() {
  local caddyfile="$1" addr
  [ -f "$caddyfile" ] || return 0
  addr="$(grep -m1 -E '^[^[:space:]#{]+[[:space:]]*\{[[:space:]]*$' "$caddyfile" 2>/dev/null | sed -E 's/[[:space:]]*\{[[:space:]]*$//')"
  [ -n "$addr" ] || return 0
  case "$addr" in
    127.0.0.1:*|localhost:*) return 0 ;;
  esac
  case "$addr" in
    *:[0-9]*) ;;
    *) return 0 ;;
  esac
  local port="${addr##*:}"
  [ "$port" = "443" ] && return 0
  printf '%s\n' "$port"
}


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

# This runs on the HOST, where sshd itself can be asked. `sshd -T` prints the
# effective configuration — includes expanded, precedence applied, defaults
# filled in — which no amount of file reading reproduces exactly. Use it, and
# fall back to the files only when it is unavailable (no sshd binary, or a
# config it refuses to load).
#
# TWIN: portal/lib/sshd-config.js reimplements the file-reading half for the
# portal, which cannot run sshd -T from inside a container. Change both.
SSH_EFFECTIVE=""
if command -v sshd &>/dev/null; then
  SSH_EFFECTIVE=$(sshd -T 2>/dev/null || true)
fi

get_ssh_val() {
  local key="$1" val=""
  if [ -n "$SSH_EFFECTIVE" ]; then
    # sshd -T lowercases keywords and prints one directive per line.
    echo "$SSH_EFFECTIVE" | awk -v k="${key,,}" 'tolower($1)==k {print $2; exit}'
    return
  fi
  # Fallback: read the files the way sshd does — Include expanded where the
  # directive appears, FIRST value wins. Reading the drop-ins first, or letting
  # the last line win, gives the wrong answer on a stock Debian/Ubuntu layout.
  val=$(ssh_first_value_from_file "$SSH_CFG" "$key" 0)
  echo "${val:-}"
}

# Prints the first value for $2 found while reading $1 in order, following
# Include. $3 is the recursion depth.
ssh_first_value_from_file() {
  local file="$1" key="$2" depth="${3:-0}" line lkey lval sub inc hit
  [ "$depth" -gt 8 ] && return 0
  [ -f "$file" ] || return 0
  local in_match=0
  while IFS= read -r line; do
    line="${line%%#*}"
    line="$(echo "$line" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
    [ -z "$line" ] && continue
    lkey="$(echo "${line%%[[:space:]=]*}" | tr '[:upper:]' '[:lower:]')"
    lval="$(echo "${line#"${line%%[[:space:]=]*}"}" | sed 's/^[[:space:]=]*//')"
    if [ "$lkey" = "match" ]; then
      if [ "${lval,,}" = "all" ]; then in_match=0; else in_match=1; fi
      continue
    fi
    [ "$in_match" -eq 1 ] && continue
    if [ "$lkey" = "include" ]; then
      for inc in $lval; do
        case "$inc" in /*) ;; *) inc="$(dirname "$file")/$inc" ;; esac
        for sub in $inc; do
          [ -f "$sub" ] || continue
          hit="$(ssh_first_value_from_file "$sub" "$key" $((depth + 1)))"
          if [ -n "$hit" ]; then echo "$hit"; return 0; fi
        done
      done
      continue
    fi
    if [ "$lkey" = "${key,,}" ]; then
      echo "${lval%%[[:space:]]*}"
      return 0
    fi
  done < "$file"
  return 0
}

# `PermitRootLogin` has two spellings for the same setting: `without-password`
# is the historical name of `prohibit-password`, and it is what `sshd -T` prints
# on OpenSSH as shipped by Ubuntu 22.04. Accepting only the modern spelling made
# this check score a correctly hardened host (Paris) as if root could log in
# with a password, the day 0.6.5 started asking the daemon instead of the files.
# `forced-commands-only` allows no interactive root session at all.
root_login_restricted() {
  case "${1,,}" in
    no|prohibit-password|without-password|forced-commands-only) return 0 ;;
    *) return 1 ;;
  esac
}

if [ -f "$SSH_CFG" ]; then
  ROOT_LOGIN=$(get_ssh_val PermitRootLogin)
  PW_AUTH=$(get_ssh_val PasswordAuthentication)
  SSH_PORT=$(get_ssh_val Port)
  SSH_PORT="${SSH_PORT:-22}"
  if [ -n "$SSH_EFFECTIVE" ]; then
    info "Read from the running daemon's effective config (sshd -T)"
  else
    warn "sshd -T unavailable — values read from config files, which may differ from what sshd actually applies"
  fi

  if root_login_restricted "${ROOT_LOGIN:-yes}"; then
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

# "Bound to localhost" passes on every install, because Caddy is what publishes
# the portal — so on its own it says nothing about who can reach it. Read the
# live firewall rules for the port Caddy listens on.
ADMIN_PORT_VAL="$(detect_admin_port "$(dirname "$0")/../caddy/Caddyfile")"
if [ -z "$ADMIN_PORT_VAL" ]; then
  info "No dedicated admin port in the Caddyfile — the portal is on :443 or bound to loopback"
elif command -v ufw &>/dev/null; then
  ADMIN_RULES="$(ufw status numbered 2>/dev/null | grep -E "^\[[ 0-9]+\].*(^|[^0-9])${ADMIN_PORT_VAL}(/tcp|[^0-9]|$)" || true)"
  if echo "$ADMIN_RULES" | grep -qE 'ALLOW IN[[:space:]]+Anywhere'; then
    add_check 10 "fail" "Admin port ${ADMIN_PORT_VAL}/tcp is open to Anywhere — close it: ./easywg admin lock"
  else
    add_check 10 "pass" "Admin port ${ADMIN_PORT_VAL}/tcp is not open to Anywhere"
  fi
  if echo "$ADMIN_RULES" | grep -q 'easywg-admin-temp'; then
    info "A temporary admin rule is active (./easywg admin status for its expiry)"
  fi
else
  add_check 10 "warn" "Cannot read firewall rules for the admin port"
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

  if ! root_login_restricted "${CURRENT_ROOT:-yes}"; then
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

  BACKUP_CFG="${SSH_CFG}.easywg.bak.$(date +%Y%m%d%H%M%S)"
  cp "$SSH_CFG" "$BACKUP_CFG"
  for change in "${CHANGES[@]}"; do
    KEY="${change%% *}"
    if grep -qi "^#*\s*${KEY}\s" "$SSH_CFG"; then
      sed -i "s|^#*\s*${KEY}\s.*|${change}|I" "$SSH_CFG"
    else
      echo "$change" >> "$SSH_CFG"
    fi
  done

  if command -v sshd &>/dev/null; then
    if ! sshd -t; then
      cp "$BACKUP_CFG" "$SSH_CFG"
      fail "Config test failed — $SSH_CFG restored from $BACKUP_CFG. SSH was not reloaded."
      exit 1
    fi
    if ! systemctl reload sshd && ! systemctl reload ssh; then
      fail "Config is valid but reloading sshd failed — the running daemon still has the OLD settings. Reload it by hand."
      exit 1
    fi
    pass "SSH config reloaded."

    # Writing the directive is not the same as sshd applying it. On a stock
    # Debian/Ubuntu the drop-in directory is Included at the TOP of the file and
    # sshd keeps the FIRST value it sees, so a line appended at the bottom can
    # be overridden by a drop-in and change nothing at all. Ask the daemon.
    EFFECTIVE_AFTER=$(sshd -T 2>/dev/null || true)
    if [ -n "$EFFECTIVE_AFTER" ]; then
      STILL_WRONG=()
      for change in "${CHANGES[@]}"; do
        KEY="$(echo "${change%% *}" | tr '[:upper:]' '[:lower:]')"
        WANT="$(echo "${change#* }" | tr '[:upper:]' '[:lower:]')"
        GOT="$(echo "$EFFECTIVE_AFTER" | awk -v k="$KEY" 'tolower($1)==k {print tolower($2); exit}')"
        [ "$GOT" = "$WANT" ] || STILL_WRONG+=("${change%% *}: wanted ${WANT}, sshd applies ${GOT:-<unset>}")
      done
      if [ "${#STILL_WRONG[@]}" -gt 0 ]; then
        fail "sshd does NOT apply the change(s) just written to $SSH_CFG:"
        for w in "${STILL_WRONG[@]}"; do echo "      $w"; done
        echo "      A drop-in in ${SSH_CFG_D}/ is Included earlier and wins (sshd keeps the FIRST value)."
        echo "      Set it there instead, in a file that sorts first — e.g. ${SSH_CFG_D}/01-hardening.conf"
        exit 1
      fi
      pass "Verified against the running daemon (sshd -T)."
    else
      warn "Could not run 'sshd -T' to confirm the daemon applies the change — verify by hand."
    fi
  else
    warn "Please reload SSH manually."
  fi
fi
