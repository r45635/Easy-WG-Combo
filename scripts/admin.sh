#!/usr/bin/env bash
# Easy-WG-Combo — admin portal reachability (UFW)
#
# The portal is the most privileged component of the stack: its container has
# the Docker socket, the host network and NET_ADMIN. A flaw in it is root on
# this VPS. VPN clients never need it — they use WireGuard (UDP) and Xray — so
# the HTTPS admin port is kept closed to the internet and opened deliberately,
# for a while, from a known address.
#
# Usage: ./easywg admin status | open [...] | close | lock
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
ok()   { echo -e "  ${GREEN}✓${RESET} $1"; }
warn() { echo -e "  ${YELLOW}⚠${RESET} $1"; }
err()  { echo -e "  ${RED}✗${RESET} $1" >&2; }
info() { echo -e "  ${CYAN}·${RESET} $1"; }
die()  { err "$1"; exit 1; }

# bootstrap.sh never sources .env (it reads each value with sed); do the same
# here so a syntax error in .env cannot execute as shell.
env_val() {
  [ -f "$ENV_FILE" ] || return 0
  sed -n "s/^$1=//p" "$ENV_FILE" | head -n 1 | tr -d '"' | tr -d "'"
}

# Which port does Caddy actually serve the admin portal on? Read the Caddyfile,
# not .env: the UI rewrites the Caddyfile, and one of the two reference installs
# serves 8443 with no CADDY_HTTPS_PORT in its .env at all — this call site only
# managed the right port there because 8443 is also the fallback. 0.6.5 fixed
# the same divergence in doctor.sh and security-check.sh and missed this one.
# Prints nothing when the portal is on the default :443 or bound to loopback.
# TWIN: detect_admin_port() in doctor.sh / security-check.sh, detectAdminPort()
# in portal/server.js. Change them together.
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

ADMIN_PORT="$(detect_admin_port "$PROJECT_DIR/caddy/Caddyfile")"
ENV_ADMIN_PORT="$(env_val CADDY_HTTPS_PORT)"
if [ -z "$ADMIN_PORT" ]; then
  # No dedicated admin port in the Caddyfile (portal on :443, or loopback-only).
  # Keep the historical behaviour rather than start managing 443 by surprise.
  ADMIN_PORT="${ENV_ADMIN_PORT:-8443}"
elif [ -n "$ENV_ADMIN_PORT" ] && [ "$ENV_ADMIN_PORT" != "$ADMIN_PORT" ]; then
  warn "caddy/Caddyfile serves the portal on ${ADMIN_PORT}; .env says CADDY_HTTPS_PORT=${ENV_ADMIN_PORT}."
  warn "Managing ${ADMIN_PORT} — the Caddyfile is what Caddy listens on."
fi
ADMIN_ALLOW_FROM="$(env_val ADMIN_ALLOW_FROM)"
# Dedicated comments: `close` deletes only what this script added, and leaves
# any rule the operator wrote by hand alone.
TEMP_COMMENT="easywg-admin-temp"
ALLOW_COMMENT="easywg-admin-allow"
BRIDGE_COMMENT="easywg-admin-vpn"
DOCKER_BRIDGE="172.16.0.0/12"

command -v ufw >/dev/null 2>&1 || die "ufw not found — this command manages UFW rules."

as_root() { if [ "$(id -u)" -eq 0 ]; then "$@"; else sudo "$@"; fi; }

ufw_status() { as_root ufw status numbered 2>/dev/null || true; }

# Every rule line that mentions the admin port, numbered, as UFW prints it.
port_rules() { ufw_status | grep -E "^\[[ 0-9]+\].*(^|[^0-9])${ADMIN_PORT}(/tcp|[^0-9]|$)" || true; }

# "Anywhere" on the admin port, v4 or v6 — the rule this feature exists to
# prevent. A rule that also names a source is not an Anywhere rule.
anywhere_rules() { port_rules | grep -E 'ALLOW IN[[:space:]]+Anywhere' || true; }

# Delete by number, highest first, so earlier numbers stay valid.
delete_matching() {
  local pattern="$1" deleted=0 nums
  nums="$(ufw_status | grep -E "^\[[ 0-9]+\].*${pattern}" | sed -E 's/^\[[[:space:]]*([0-9]+)\].*/\1/' | sort -rn || true)"
  for n in $nums; do
    as_root ufw --force delete "$n" >/dev/null && deleted=$((deleted + 1))
  done
  echo "$deleted"
}

valid_source() {
  # IPv4/IPv6 address or CIDR. UFW would reject anything else anyway; rejecting
  # it here keeps a typo from becoming a rule nobody notices.
  [[ "$1" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}(/[0-9]{1,2})?$ ]] && return 0
  [[ "$1" =~ ^[0-9a-fA-F:]+(/[0-9]{1,3})?$ && "$1" == *:* ]] && return 0
  return 1
}

# ── status ────────────────────────────────────────────────────────────────────
cmd_status() {
  echo -e "\n${BOLD}Admin portal (port ${ADMIN_PORT}/tcp)${RESET}"
  local rules; rules="$(port_rules)"
  if [ -z "$rules" ]; then
    ok "Closed to the internet — no UFW rule for ${ADMIN_PORT}/tcp"
  else
    echo "$rules" | sed 's/^/    /'
  fi
  echo ""
  local any; any="$(anywhere_rules)"
  if [ -n "$any" ]; then
    err "OPEN TO ANYWHERE — anyone on the internet can reach the admin login."
    echo "      Close it with: ./easywg admin lock"
  else
    ok "No 'Anywhere' rule."
  fi
  if echo "$rules" | grep -q "$TEMP_COMMENT"; then
    warn "A temporary rule is active (comment ${TEMP_COMMENT})."
    if command -v systemctl >/dev/null 2>&1; then
      local timer
      timer="$(systemctl list-timers --all 2>/dev/null | grep -c 'easywg-admin-close' || true)"
      if [ "${timer:-0}" -gt 0 ]; then
        systemctl list-timers --all 2>/dev/null | awk 'NR==1 || /easywg-admin-close/' | sed 's/^/      /'
      else
        err "No expiry timer found — this rule will NOT close itself. Run: ./easywg admin close"
      fi
    fi
  fi
  if [ -n "$ADMIN_ALLOW_FROM" ]; then
    info "ADMIN_ALLOW_FROM: $ADMIN_ALLOW_FROM"
  else
    info "ADMIN_ALLOW_FROM is empty — reach the portal over the VPN, or use 'admin open'."
  fi
  info "VPN clients arrive from the Docker bridge (${DOCKER_BRIDGE}) and are allowed by default."
}

# ── open ──────────────────────────────────────────────────────────────────────
cmd_open() {
  local source="" duration="30m" from_ssh=false
  while [ $# -gt 0 ]; do
    case "$1" in
      --for)      duration="$2"; shift 2 ;;
      --for=*)    duration="${1#*=}"; shift ;;
      --from)     source="$2"; shift 2 ;;
      --from=*)   source="${1#*=}"; shift ;;
      --from-ssh) from_ssh=true; shift ;;
      *) die "Unknown option: $1" ;;
    esac
  done

  if $from_ssh; then
    [ -n "${SSH_CLIENT:-}" ] || die "--from-ssh needs an SSH session (SSH_CLIENT is unset)."
    source="$(echo "$SSH_CLIENT" | awk '{print $1}')"
  fi
  [ -n "$source" ] || die "Give a source: --from <ip|cidr> or --from-ssh. Opening to everyone is what this command exists to avoid."
  valid_source "$source" || die "Not an IP address or CIDR: $source"

  # systemd-run is what makes the rule expire on its own. Without it the rule
  # would stay until someone remembers it — say so instead of opening quietly.
  local can_expire=true
  command -v systemd-run >/dev/null 2>&1 || can_expire=false

  as_root ufw allow from "$source" to any port "$ADMIN_PORT" proto tcp comment "$TEMP_COMMENT" >/dev/null
  ok "Admin port ${ADMIN_PORT}/tcp open from ${source}."

  if $can_expire; then
    # --on-active fires once; the unit calls this same script back.
    as_root systemd-run --unit="easywg-admin-close" --on-active="$duration" \
      --description="Easy-WG-Combo: close the admin port" \
      /bin/bash "$SCRIPT_DIR/admin.sh" close >/dev/null 2>&1 \
      || { warn "Could not schedule the automatic close — run './easywg admin close' when you are done."; can_expire=false; }
  fi
  if $can_expire; then
    ok "It closes itself in ${duration} (systemd unit easywg-admin-close)."
  else
    warn "This rule will NOT expire on its own. Close it with: ./easywg admin close"
  fi
}

# ── close ─────────────────────────────────────────────────────────────────────
cmd_close() {
  local n; n="$(delete_matching "$TEMP_COMMENT")"
  as_root systemctl stop "easywg-admin-close.timer" >/dev/null 2>&1 || true
  if [ "$n" -gt 0 ]; then
    ok "Removed ${n} temporary rule(s) for the admin port."
  else
    info "No temporary rule to remove."
  fi
}

# ── lock ──────────────────────────────────────────────────────────────────────
# For an install that predates this feature: convert "Anywhere" into the
# default. Implemented by apply_default_rules below, which only ever touches
# rules that name the admin port — never the SSH or WireGuard rules.

# Applies the standing rules: the Docker bridge (VPN clients) and every
# ADMIN_ALLOW_FROM entry. Removes any Anywhere rule for the admin port. Rules
# this script did not create are left alone.
apply_default_rules() {
  local nums n=0
  nums="$(anywhere_rules | sed -E 's/^\[[[:space:]]*([0-9]+)\].*/\1/' | sort -rn || true)"
  for num in $nums; do
    as_root ufw --force delete "$num" >/dev/null && n=$((n + 1))
  done
  [ "$n" -gt 0 ] && warn "Removed ${n} 'Anywhere' rule(s) for ${ADMIN_PORT}/tcp."

  as_root ufw allow from "$DOCKER_BRIDGE" to any port "$ADMIN_PORT" proto tcp comment "$BRIDGE_COMMENT" >/dev/null
  for src in $ADMIN_ALLOW_FROM; do
    if valid_source "$src"; then
      as_root ufw allow from "$src" to any port "$ADMIN_PORT" proto tcp comment "$ALLOW_COMMENT" >/dev/null
    else
      warn "ADMIN_ALLOW_FROM entry ignored (not an IP or CIDR): $src"
    fi
  done
  return 0
}

usage() {
  cat <<EOF
Usage: ./easywg admin <command>

  status                 Show who can reach the admin portal right now
  open --from-ssh        Open the admin port for the IP of this SSH session
  open --from <ip|cidr>  Open it for one address or range
       [--for 30m]       How long before it closes itself (default 30m)
  close                  Remove the temporary rule now
  lock                   Apply the default: no 'Anywhere' rule, ADMIN_ALLOW_FROM
                         + the Docker bridge (VPN clients) only

The portal is always reachable over the VPN, and over an SSH tunnel:
  ssh -L 8443:127.0.0.1:${ADMIN_PORT} root@<vps>
EOF
}

case "${1:-status}" in
  status) cmd_status ;;
  open)   shift; cmd_open "$@" ;;
  close)  cmd_close ;;
  lock)   shift; apply_default_rules; cmd_status ;;
  --help|-h|help) usage ;;
  *) err "Unknown admin subcommand: $1"; usage; exit 1 ;;
esac
