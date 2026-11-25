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
info() { echo "[INFO] $*"; }

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

  # The admin portal, read from the LIVE rules rather than from .env or from
  # bootstrap's intentions. The portal container holds the Docker socket, the
  # host network and NET_ADMIN: reachable from Anywhere, it is one password
  # away from root on this VPS.
  admin_port="$(detect_admin_port "$SCRIPT_DIR/caddy/Caddyfile")"
  admin_rules=""
  if [ -z "$admin_port" ]; then
    ok "No dedicated admin port in the Caddyfile (portal on :443 or loopback)"
  else
    admin_rules="$(ufw status numbered 2>/dev/null | grep -E "^\[[ 0-9]+\].*(^|[^0-9])${admin_port}(/tcp|[^0-9]|$)" || true)"
    if echo "$admin_rules" | grep -qE 'ALLOW IN[[:space:]]+Anywhere'; then
      fail "The admin portal (${admin_port}/tcp) is open to Anywhere. Close it: ./easywg admin lock"
    else
      ok "Admin portal (${admin_port}/tcp) is not open to Anywhere"
    fi
  fi
  if echo "$admin_rules" | grep -q 'easywg-admin-temp'; then
    if systemctl list-timers --all 2>/dev/null | grep -q 'easywg-admin-close'; then
      warn "A temporary admin rule is open (it has an expiry timer)"
    else
      fail "A temporary admin rule is open with NO expiry timer — it will stay open. Close it: ./easywg admin close"
    fi
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

# A response that every installation shares is a single search query that lists
# them all — Shodan/FOFA `http.favicon.hash`, or a plain hash of the login page
# body — and the defaults ship in a PUBLIC repository, so the file in git IS the
# fingerprint. The portal derives its own from a seed in the persistent data
# directory. Check what the server SERVES, not what it meant to derive.
if command -v sha256sum >/dev/null 2>&1; then
  brand_shared=0 brand_checked=0
  for asset in favicon.ico favicon.svg apple-touch-icon.png index.html; do
    [ -f "$SCRIPT_DIR/portal/public/$asset" ] || continue
    case "$asset" in
      index.html) url="${PORTAL_URL}/" ;;
      *)          url="${PORTAL_URL}/$asset" ;;
    esac
    served="$(curl -s -o - "$url" 2>/dev/null | sha256sum | cut -d' ' -f1)"
    shipped="$(sha256sum "$SCRIPT_DIR/portal/public/$asset" | cut -d' ' -f1)"
    [ -n "$served" ] || continue
    brand_checked=$((brand_checked + 1))
    if [ "$served" = "$shipped" ]; then
      brand_shared=$((brand_shared + 1))
      fail "$url returns bytes identical to $asset in the public repo — every install of Easy-WG-Combo shares this fingerprint. Restart the portal so it derives its own (./compose.sh up -d portal)"
    fi
  done
  if [ "$brand_checked" -eq 0 ]; then
    warn "Could not fetch anything from ${PORTAL_URL} — did NOT check whether this install serves the shared responses"
  elif [ "$brand_shared" -eq 0 ]; then
    ok "This install serves its own icons and login page ($brand_checked checked, none matching the public repo)"
  fi
else
  warn "sha256sum not found — did NOT check whether this install serves the shared favicon"
fi

# Two more responses that were identical on every install. Both are cheap for a
# scanner to collect, so a regression here must not pass silently.
brand_hdr="$(curl -sI "${PORTAL_URL}/" 2>/dev/null | tr -d '\r' || true)"
if [ -z "$brand_hdr" ]; then
  warn "Could not read the headers from ${PORTAL_URL}/ — did NOT check X-Powered-By"
elif printf '%s\n' "$brand_hdr" | grep -qi '^x-powered-by:'; then
  fail "The portal still sends X-Powered-By ($(printf '%s\n' "$brand_hdr" | grep -i '^x-powered-by:')) — it names the framework to every scanner"
else
  ok "No X-Powered-By header"
fi

brand_404="$(curl -s "${PORTAL_URL}/easywg-doctor-probe-404" 2>/dev/null || true)"
if [ -z "$brand_404" ]; then
  warn "Could not probe an unknown path on ${PORTAL_URL} — did NOT check the 404 page"
elif printf '%s\n' "$brand_404" | grep -q 'Cannot GET'; then
  fail "Unknown paths return Express's default 404 page, identical on every install and naming the framework"
else
  ok "Unknown paths return the portal's own 404"
fi

sshd_effective="$(sshd -T 2>/dev/null || true)"
if [ -z "$sshd_effective" ]; then
  warn "Could not read the effective SSH config (sshd -T) — SSH checks below are skipped"
else
  if echo "$sshd_effective" | grep -q '^passwordauthentication yes'; then
    warn "SSH password authentication is enabled — consider disabling it (PasswordAuthentication no)"
  else
    ok "SSH password authentication is disabled"
  fi

  # The Security Center grades SSH by READING FILES inside the container: it
  # cannot run sshd -T. If the container is not given the drop-in directory it
  # sees only the stub main file, and reports a hardened host as unhardened —
  # which is exactly what happened on both production VPS until 0.6.5 (−20
  # points, no regression, no symptom other than the number itself).
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx portal; then
    if [ ! -d /etc/ssh/sshd_config.d ]; then
      info "This host has no /etc/ssh/sshd_config.d — nothing for the portal to miss"
    elif docker exec portal test -d /etc/ssh/sshd_config.d 2>/dev/null; then
      ok "The portal can see /etc/ssh/sshd_config.d (where the hardening lives)"
    else
      fail "The portal cannot see /etc/ssh/sshd_config.d — the Security Center grades SSH from the main file alone and will under-report. Fix: add the mount (docker-compose.yml) and ./compose.sh up -d portal"
    fi

    # Then check the answer, not just the mount: the portal's verdict must agree
    # with the daemon. A green mount with a red verdict is still a wrong score.
    # Compared BOTH WAYS: a portal that passes a host the daemon says is open is
    # the more dangerous of the two errors, and the asymmetric version of this
    # check could not see it.
    sec_json="$(curl -s -u "admin:${PORTAL_PASS}" "${PORTAL_URL}/api/security" 2>/dev/null || true)"
    if [ -z "$sec_json" ]; then
      warn "Could not read ${PORTAL_URL}/api/security — the UI-vs-daemon SSH comparison did NOT run (check ADMIN_PASSWORD)"
    else
      compared=0
      for pair in "ssh_root:permitrootlogin" "ssh_password:passwordauthentication"; do
        check_id="${pair%%:*}"; directive="${pair##*:}"
        portal_status="$(echo "$sec_json" | grep -o "\"id\":\"${check_id}\"[^}]*" | grep -o '"status":"[a-z_]*"' | cut -d'"' -f4)"
        host_val="$(echo "$sshd_effective" | awk -v k="$directive" '$1==k {print $2; exit}')"
        if [ -z "$portal_status" ]; then
          warn "The portal did not report a '${check_id}' check — could not compare it with the daemon"
          continue
        fi
        host_ok=no
        case "$directive:$host_val" in
          permitrootlogin:no|permitrootlogin:prohibit-password) host_ok=yes ;;
          permitrootlogin:without-password|permitrootlogin:forced-commands-only) host_ok=yes ;;
          passwordauthentication:no) host_ok=yes ;;
        esac
        if [ "$host_ok" = yes ] && [ "$portal_status" != "pass" ]; then
          fail "Security Center disagrees with the daemon on ${directive}: sshd applies '${host_val}' (hardened) but the portal scores '${portal_status}'. The score is wrong, not the host — check what the portal can read (it caches this for 5 min, so re-check after a restart)"
        elif [ "$host_ok" = no ] && [ "$portal_status" = "pass" ]; then
          fail "Security Center passes ${directive} but sshd applies '${host_val:-unset}' — the portal is reporting this host as hardened when the daemon says it is not. Trust the daemon."
        else
          compared=$((compared + 1))
        fi
      done
      if [ "$compared" -gt 0 ]; then
        ok "Security Center agrees with the daemon on ${compared} SSH check(s)"
      fi
    fi
  else
    info "The portal container is not running — skipped the UI-vs-daemon SSH comparison"
  fi
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
