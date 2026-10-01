#!/usr/bin/env bash
# Easy-WG-Combo Doctor — installation health check
# Usage: ./easywg doctor
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORTAL_URL="${PORTAL_URL:-http://127.0.0.1:8080}"
PORTAL_PASS="${ADMIN_PASSWORD:-}"

if [ -z "$PORTAL_PASS" ] && [ -f "$SCRIPT_DIR/.env" ]; then
  PORTAL_PASS="$(grep -m1 '^ADMIN_PASSWORD=' "$SCRIPT_DIR/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)"
fi

WARNS=0
FAILS=0

ok()   { echo "[OK]   $*"; }
warn() { echo "[WARN] $*"; WARNS=$((WARNS + 1)); }
fail() { echo "[FAIL] $*"; FAILS=$((FAILS + 1)); }

echo "Easy-WG-Combo Doctor"
echo "Checking installation at: $SCRIPT_DIR"
echo ""

# ── Core ─────────────────────────────────────────────────────────────────────
echo "Core:"

# Docker running
if docker info &>/dev/null; then
  ok "Docker is running"
else
  fail "Docker is not running (or not accessible by current user)"
fi

# Docker compose config valid
if (cd "$SCRIPT_DIR" && bash compose.sh config &>/dev/null 2>&1); then
  ok "docker-compose config is valid"
else
  fail "docker-compose config is invalid — run: ./compose.sh config"
fi

# Portal API reachable
portal_http=$(curl -s -o /dev/null -w '%{http_code}' -u "admin:${PORTAL_PASS}" "${PORTAL_URL}/api/health" 2>/dev/null || echo "000")
case "$portal_http" in
  200) ok "Portal API is reachable" ;;
  401) fail "Portal API returned 401 — check ADMIN_PASSWORD in .env" ;;
  000) fail "Portal API is not reachable at ${PORTAL_URL} — check that the portal container is running" ;;
  *)   fail "Portal API returned HTTP ${portal_http} — check portal logs: ./compose.sh logs portal" ;;
esac

# wg-easy container
if docker inspect wg-easy --format '{{.State.Running}}' 2>/dev/null | grep -q true; then
  ok "wg-easy container is running"
else
  fail "wg-easy container is not running — start with: ./compose.sh up -d"
fi

# AdGuard container (may be named 'adguard' or 'adguardhome')
if docker inspect adguard --format '{{.State.Running}}' 2>/dev/null | grep -q true || \
   docker inspect adguardhome --format '{{.State.Running}}' 2>/dev/null | grep -q true; then
  ok "AdGuard Home container is running"
  # The portal proxies AdGuard using ADGUARD_PASSWORD from .env. AdGuard's own
  # credential is set in its web wizard; if they diverge the proxy returns 401.
  ag_http=$(curl -s -o /dev/null -w '%{http_code}' -u "admin:${PORTAL_PASS}" "${PORTAL_URL}/adguard/control/status" 2>/dev/null || echo "000")
  case "$ag_http" in
    401) fail "AdGuard proxy auth failed (401) — the AdGuard wizard password must match ADGUARD_PASSWORD/ADMIN_PASSWORD in .env" ;;
    000) warn "Could not probe AdGuard through the portal (portal down?)" ;;
    *)   ok "AdGuard is reachable through the portal (HTTP ${ag_http})" ;;
  esac
else
  fail "AdGuard Home container is not running — start with: ./compose.sh up -d"
fi

# Caddy
if docker inspect caddy --format '{{.State.Running}}' 2>/dev/null | grep -q true 2>/dev/null; then
  ok "Caddy container is running"
else
  warn "Caddy container is not running or not found (expected if using host Caddy)"
fi

echo ""

# ── Storage ───────────────────────────────────────────────────────────────────
echo "Storage:"

if [ -d "$SCRIPT_DIR/backups" ] && [ -w "$SCRIPT_DIR/backups" ]; then
  ok "Backup directory exists and is writable"
elif [ -d "$SCRIPT_DIR/backups" ]; then
  warn "Backup directory exists but is not writable: $SCRIPT_DIR/backups"
else
  warn "Backup directory does not exist: $SCRIPT_DIR/backups (created on first backup)"
fi

# Check portal data volume is accessible
data_ok=$(docker exec portal test -d /data && echo yes 2>/dev/null || echo no 2>/dev/null || echo unknown)
case "$data_ok" in
  yes)     ok "Portal data directory (/data) is accessible" ;;
  no)      fail "Portal data directory (/data) is not accessible inside the container" ;;
  unknown) warn "Could not verify portal data directory (portal may not be running)" ;;
esac

echo ""

# ── Security ──────────────────────────────────────────────────────────────────
echo "Security:"

# The security headers live in the generated Caddyfile, and `easywg update` does
# NOT regenerate it — only bootstrap.sh or the Server Endpoint action do. A
# deployment can therefore run current code while serving no headers at all,
# which is invisible without this check.
caddyfile="$SCRIPT_DIR/caddy/Caddyfile"
if [ -f "$caddyfile" ]; then
  if grep -q 'Content-Security-Policy' "$caddyfile"; then
    ok "Caddyfile carries the security headers (CSP present)"
  else
    warn "Caddyfile has NO security headers (no Content-Security-Policy) — the portal serves none. Re-run ./bootstrap.sh or apply the Server Endpoint action ('easywg update' does not regenerate the Caddyfile)"
  fi
  if grep -q 'Content-Security-Policy-Report-Only' "$caddyfile"; then
    warn "CSP is still Report-Only in the Caddyfile — it enforces nothing; regenerate to pick up the enforced policy"
  fi
fi

if command -v ufw &>/dev/null; then
  if ufw status 2>/dev/null | grep -q 'Status: active'; then
    ok "UFW firewall is active"
  else
    warn "UFW is installed but not active — enable with: ufw enable"
  fi
else
  warn "UFW is not installed — consider installing a firewall"
fi

if command -v systemctl &>/dev/null; then
  if systemctl is-active fail2ban &>/dev/null; then
    ok "Fail2Ban is active"
    # "Fail2Ban is active" alone proves nothing about the portal: the service can
    # run with only the sshd jail while the admin login is left unprotected.
    jail_name="${FAIL2BAN_JAIL:-easy-wg-portal}"
    if command -v fail2ban-client &>/dev/null; then
      if fail2ban-client status "$jail_name" &>/dev/null; then
        ok "Fail2Ban jail '$jail_name' is loaded (portal login protected)"
      else
        warn "Fail2Ban runs but jail '$jail_name' is NOT loaded — the admin login has no brute-force protection. Re-run ./bootstrap.sh"
      fi
    fi
    # Caddy logs a float Unix epoch in "ts"; without an explicit datepattern
    # fail2ban cannot date the lines and silently degrades to "Simulate NOW".
    if [ -f /etc/fail2ban/filter.d/easy-wg-portal.conf ] \
      && ! grep -q '^datepattern' /etc/fail2ban/filter.d/easy-wg-portal.conf; then
      warn "Fail2Ban filter easy-wg-portal has no datepattern — findtime/bantime are unreliable. Re-run ./bootstrap.sh"
    fi
    # /var/run is a tmpfs: restarting fail2ban recreates /var/run/fail2ban with a
    # new inode, while the portal container stays bind-mounted to the old one. The
    # container then sees an empty directory, fail2ban-client ping fails, and the
    # Security Center reports Fail2Ban as inactive (-15 on the score) even though
    # it is running. Restarting the portal re-binds the current directory.
    if command -v docker &>/dev/null && docker ps --format '{{.Names}}' 2>/dev/null | grep -qx portal; then
      host_ino="$(stat -c %i /var/run/fail2ban 2>/dev/null || true)"
      cont_ino="$(docker exec portal stat -c %i /var/run/fail2ban 2>/dev/null || true)"
      if [ -n "$host_ino" ] && [ -n "$cont_ino" ] && [ "$host_ino" != "$cont_ino" ]; then
        warn "The portal container has a STALE /var/run/fail2ban mount (host inode $host_ino vs container $cont_ino) — it cannot see Fail2Ban, so the Security Center wrongly reports it inactive. Fix: docker restart portal"
      fi
    fi
  else
    warn "Fail2Ban is not active — run: systemctl start fail2ban"
  fi
else
  warn "systemctl not found — could not check Fail2Ban status"
fi

if sshd -T 2>/dev/null | grep -q 'passwordauthentication yes'; then
  warn "SSH password authentication is enabled — consider disabling it (PasswordAuthentication no)"
else
  ok "SSH password authentication is disabled"
fi

echo ""

# ── Features ─────────────────────────────────────────────────────────────────
echo "Features:"

# monitor.sh present and executable
if [ -x "$SCRIPT_DIR/scripts/monitor.sh" ]; then
  ok "scripts/monitor.sh is present and executable"
else
  warn "scripts/monitor.sh is missing or not executable"
fi

# Monitoring API reachable
mon_http=$(curl -s -o /dev/null -w '%{http_code}' -u "admin:${PORTAL_PASS}" "${PORTAL_URL}/api/monitors" 2>/dev/null || echo "000")
case "$mon_http" in
  200) ok "Monitoring API endpoint is reachable" ;;
  401) warn "Monitoring API returned 401 — check ADMIN_PASSWORD" ;;
  *)   warn "Monitoring API returned HTTP ${mon_http} (portal may not be running)" ;;
esac

# Apps CLI degrades cleanly
apps_exit=0
bash "$SCRIPT_DIR/scripts/apps.sh" install test-app &>/dev/null || apps_exit=$?
if [ "$apps_exit" -eq 2 ]; then
  ok "Apps module degrades cleanly (exit 2 for write commands)"
else
  warn "Apps CLI did not return exit 2 for 'install' — check scripts/apps.sh"
fi

# FileDrop CLI degrades cleanly
filedrop_exit=0
bash "$SCRIPT_DIR/scripts/filedrop.sh" list &>/dev/null || filedrop_exit=$?
if [ "$filedrop_exit" -eq 2 ]; then
  ok "File Drop module degrades cleanly (exit 2)"
else
  warn "FileDrop CLI did not return exit 2 — check scripts/filedrop.sh"
fi

# FileDrop volume mounted
filedrop_mount=$(docker inspect portal --format '{{range .Mounts}}{{.Destination}} {{end}}' 2>/dev/null | tr ' ' '\n' | grep -c '^/filedrop$' || echo 0)
if [ "$filedrop_mount" -gt 0 ]; then
  warn "File Drop volume (/filedrop) is mounted but the module is preview only — this is fine, just informational"
else
  ok "File Drop volume not mounted (expected for preview-only mode)"
fi

echo ""

# ── Result ────────────────────────────────────────────────────────────────────
echo "Result:"
if [ "$FAILS" -eq 0 ] && [ "$WARNS" -eq 0 ]; then
  echo "All checks passed. System is healthy."
  exit 0
elif [ "$FAILS" -eq 0 ]; then
  echo "System usable with ${WARNS} warning(s)."
  exit 1
else
  echo "${FAILS} critical failure(s), ${WARNS} warning(s). Review items marked [FAIL] above."
  exit 2
fi
