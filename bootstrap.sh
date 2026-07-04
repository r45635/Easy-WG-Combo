#!/usr/bin/env bash
set -euo pipefail

BOOTSTRAP_VERSION="1.1.0"
BOOTSTRAP_REPO_URL="https://github.com/r45635/Easy-WG-Combo"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
SECRETS_FILE="$SCRIPT_DIR/.env.secrets"
PORTAL_SETTINGS_FILE="$SCRIPT_DIR/portal/data/portal-config.json"

log() {
  printf '%s\n' "$*"
}

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

run_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  else
    if ! command -v sudo >/dev/null 2>&1; then
      die "sudo is required when the script is not run as root."
    fi
    sudo "$@"
  fi
}

has_tty() {
  [ -t 0 ] || { [ -r /dev/tty ] && { : </dev/tty; } >/dev/null 2>&1; }
}

read_prompt() {
  local prompt="$1"
  local __var_name="$2"
  local value=""

  if [ -t 0 ]; then
    read -r -p "$prompt" value
  else
    read -r -p "$prompt" value </dev/tty
  fi

  printf -v "$__var_name" '%s' "$value"
}

read_secret_prompt() {
  local prompt="$1"
  local __var_name="$2"
  local value=""

  if [ -t 0 ]; then
    read -r -s -p "$prompt" value
  else
    read -r -s -p "$prompt" value </dev/tty
  fi

  printf -v "$__var_name" '%s' "$value"
}

git_head_short() {
  git -C "$SCRIPT_DIR" rev-parse --short HEAD 2>/dev/null || printf 'unknown'
}

print_header() {
  log "=============================================="
  log "Easy-WG-Combo bootstrap v${BOOTSTRAP_VERSION}"
  log "Date (UTC): $(date -u '+%Y-%m-%d %H:%M:%S')"
  log "Revision: $(git_head_short)"
  log "Repository: ${BOOTSTRAP_REPO_URL}"
  log "=============================================="
}

confirm_installation() {
  local answer=""

  if ! has_tty; then
    return
  fi

  read_prompt "Proceed with installation/update now? [Y/n]: " answer
  answer="${answer:-Y}"
  case "${answer,,}" in
    y|yes) return ;;
    *) die "Installation cancelled by user." ;;
  esac
}

validate_port() {
  local port="$1"
  [[ "$port" =~ ^[0-9]+$ ]] && [ "$port" -ge 1 ] && [ "$port" -le 65535 ]
}

current_wg_port() {
  local port=""

  if [ -f "$ENV_FILE" ]; then
    port="$(sed -n 's/^WG_PORT=//p' "$ENV_FILE" | head -n 1)"
  fi

  if ! validate_port "$port"; then
    port="51820"
  fi

  printf '%s' "$port"
}

resolve_wg_port() {
  local wg_port="${WG_PORT:-}"
  local default_port

  default_port="$(current_wg_port)"

  if [ -n "$wg_port" ]; then
    validate_port "$wg_port" || die "Invalid WG_PORT '$wg_port'. Use a value between 1 and 65535."
    printf '%s' "$wg_port"
    return
  fi

  wg_port="$default_port"

  if has_tty; then
    while true; do
      read_prompt "WireGuard public UDP port [$default_port]: " wg_port
      wg_port="${wg_port:-$default_port}"
      if validate_port "$wg_port"; then
        printf '%s' "$wg_port"
        return
      fi
      log "Please enter a valid port between 1 and 65535."
    done
  fi

  printf '%s' "$wg_port"
}

print_final_summary() {
  local action_label="$1"
  local wg_host="$2"
  local wg_port="$3"
  local server_name="$4"
  local admin_domain="$5"
  local public_https_enabled="$6"
  local admin_password="$7"
  local tls_email="$8"
  local xray_enabled="${9:-no}"
  local caddy_https_port="${10:-8443}"
  local ssh_port="${SSH_PORT:-22}"
  local admin_url=""

  # Public (Let's Encrypt) cert requires a real FQDN + ACME email — matches configure_caddy.
  local xray_public_tls="no"
  if [ -n "${admin_domain:-}" ] && [ -n "${tls_email:-}" ] && ! is_ip_address "${admin_domain:-}"; then
    xray_public_tls="yes"
  fi

  if is_truthy "$xray_enabled"; then
    admin_url="https://${admin_domain:-$wg_host}:${caddy_https_port}"
  elif is_truthy "$public_https_enabled"; then
    if is_ip_address "${admin_domain:-}"; then
      admin_url="https://${admin_domain}"
    elif [ -n "${tls_email:-}" ] && [ -n "${admin_domain:-}" ]; then
      admin_url="https://${admin_domain}"
    else
      admin_url="https://${wg_host}"
    fi
  else
    admin_url="http://${wg_host}:${PORTAL_PORT:-8080}"
  fi

  log ""
  log "===== Deployment Summary ====="
  log "Mode: ${action_label}"
  log "Server name: ${server_name}"
  log "WireGuard endpoint: ${wg_host}:${wg_port}/udp"
  log "Admin URL: ${admin_url}"
  log "Admin password: ${admin_password}"
  log "SSH port: ${ssh_port}/tcp"
  if is_truthy "$xray_enabled"; then
    log "Xray VLESS+Reality: enabled on port 443"
    log "  → Client URI: ./easywg xray client-uri"
    if [ "$xray_public_tls" = "yes" ]; then
      log "  → Admin portal: https://${admin_domain}:${caddy_https_port} (valid Let's Encrypt cert)"
      log "     ⚠ Use the hostname, NOT the IP — a public cert cannot cover https://${wg_host}:${caddy_https_port}"
      log "     ⚠ The cert is issued via HTTP-01 on port 80: DNS for ${admin_domain} must point here and port 80 must be reachable."
      log "        If issuance fails, Caddy serves a self-signed cert and retries. Check: ./compose.sh logs caddy | grep -i certificate"
    else
      log "  → Admin portal: https://${admin_domain:-$wg_host}:${caddy_https_port} (self-signed cert — accept the browser warning)"
      log "     ℹ For a warning-free cert, set a real ADMIN_DOMAIN (FQDN pointing here) + TLS_EMAIL in .env and re-run bootstrap."
    fi
  fi
  log "GitHub: ${BOOTSTRAP_REPO_URL}"
  log "Script version: ${BOOTSTRAP_VERSION}"
  log "Script revision: $(git_head_short)"
  log ""
  log "Survival quick commands:"
  log "  - docker ps"
  log "  - ./compose.sh logs -f portal"
  log "  - fail2ban-client status ${FAIL2BAN_JAIL:-easy-wg-portal}"
  log "  - tail -f ./caddy/logs/access.log"
  log "=============================="
}

available_space_mb() {
  local target_dir="$1"
  df -Pm "$target_dir" | awk 'NR==2 {print $4}'
}

maybe_prune_docker() {
  local default_choice="${PRUNE_BEFORE_DEPLOY:-yes}"
  local do_prune="yes"

  if ! command -v docker >/dev/null 2>&1; then
    return
  fi

  if has_tty; then
    read_prompt "Run Docker prune cleanup before deployment? [Y/n]: " do_prune
    do_prune="${do_prune:-Y}"
    case "${do_prune,,}" in
      y|yes) do_prune="yes" ;;
      n|no)  do_prune="no" ;;
      *)     do_prune="yes" ;;
    esac
  else
    case "${default_choice,,}" in
      y|yes|true|1) do_prune="yes" ;;
      *)            do_prune="no" ;;
    esac
  fi

  if [ "$do_prune" = "yes" ]; then
    log "Running Docker prune cleanup..."
    docker system prune -af --volumes >/dev/null 2>&1 || true
  else
    log "Skipping Docker prune cleanup."
  fi
}

ensure_disk_space() {
  local min_free_mb="${MIN_FREE_MB:-2048}"
  local before_mb after_mb

  before_mb="$(available_space_mb "$SCRIPT_DIR")"
  log "Available disk space before deployment: ${before_mb} MB"

  maybe_prune_docker

  after_mb="$(available_space_mb "$SCRIPT_DIR")"
  log "Available disk space after cleanup: ${after_mb} MB"

  if [ "$after_mb" -lt "$min_free_mb" ]; then
    die "Insufficient disk space (${after_mb} MB). Need at least ${min_free_mb} MB free."
  fi
}

container_exists() {
  local name="$1"
  docker ps -a --format '{{.Names}}' | grep -Fxq "$name"
}

dir_has_content() {
  local dir="$1"
  [ -d "$dir" ] && [ -n "$(find "$dir" -mindepth 1 -print -quit 2>/dev/null)" ]
}

existing_install_detected() {
  local containers=(wg-easy adguard portal caddy)
  local c

  for c in "${containers[@]}"; do
    if container_exists "$c"; then
      return 0
    fi
  done

  dir_has_content "$SCRIPT_DIR/wireguard" || \
  dir_has_content "$SCRIPT_DIR/adguard/conf" || \
  dir_has_content "$SCRIPT_DIR/adguard/work"
}

resolve_existing_install_action() {
  local action="${EXISTING_CONFIG_ACTION:-}"

  if [ -z "$action" ]; then
    if has_tty; then
      printf '%s\n' "Existing Easy-WG-Combo configuration detected."
      printf '%s\n' "Choose an action:"
      printf '%s\n' "  [keep] Keep existing configuration and start/restart services"
      printf '%s\n' "  [new]  Start a new configuration (creates a backup first)"

      while true; do
        read_prompt "Action (keep/new): " action
        case "${action,,}" in
          k|keep) action="keep"; break ;;
          n|new)  action="new"; break ;;
          *) printf '%s\n' "Please answer 'keep' or 'new'." ;;
        esac
      done
    else
      die "Existing configuration detected in non-interactive mode. Set EXISTING_CONFIG_ACTION=keep or EXISTING_CONFIG_ACTION=new."
    fi
  fi

  case "${action,,}" in
    k|keep) printf '%s' "keep" ;;
    n|new)  printf '%s' "new" ;;
    *) die "Invalid EXISTING_CONFIG_ACTION value '$action'. Use 'keep' or 'new'." ;;
  esac
}

backup_existing_state() {
  local backup_root="${BACKUP_DIR:-$SCRIPT_DIR/backups}"
  local timestamp backup_dir

  timestamp="$(date +%Y%m%d-%H%M%S)"
  backup_dir="$backup_root/$timestamp"

  mkdir -p "$backup_dir"

  if [ -d "$SCRIPT_DIR/wireguard" ]; then
    mkdir -p "$backup_dir/host"
    cp -a "$SCRIPT_DIR/wireguard" "$backup_dir/host/"
  fi
  if [ -d "$SCRIPT_DIR/adguard/conf" ]; then
    mkdir -p "$backup_dir/host/adguard"
    cp -a "$SCRIPT_DIR/adguard/conf" "$backup_dir/host/adguard/"
  fi
  if [ -d "$SCRIPT_DIR/adguard/work" ]; then
    mkdir -p "$backup_dir/host/adguard"
    cp -a "$SCRIPT_DIR/adguard/work" "$backup_dir/host/adguard/"
  fi

  if container_exists wg-easy; then
    mkdir -p "$backup_dir/container/wg-easy"
    docker cp wg-easy:/etc/wireguard "$backup_dir/container/wg-easy/" >/dev/null 2>&1 || true
  fi
  if container_exists adguard; then
    mkdir -p "$backup_dir/container/adguard"
    docker cp adguard:/opt/adguardhome/conf "$backup_dir/container/adguard/" >/dev/null 2>&1 || true
    docker cp adguard:/opt/adguardhome/work "$backup_dir/container/adguard/" >/dev/null 2>&1 || true
  fi

  log "Backup saved to $backup_dir"
}

replace_existing_containers() {
  local containers=(wg-easy adguard portal caddy)
  local c

  for c in "${containers[@]}"; do
    docker rm -f "$c" >/dev/null 2>&1 || true
  done
}

escape_sed_replacement() {
  printf '%s' "$1" | sed -e 's/[&|\\]/\\&/g'
}

sanitize_server_name() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9._-]+/-/g; s/^-+//; s/-+$//; s/-{2,}/-/g'
}

validate_server_name() {
  [[ "$1" =~ ^[A-Za-z0-9._-]+$ ]]
}

current_server_name() {
  local current_name=""

  if [ -f "$PORTAL_SETTINGS_FILE" ]; then
    current_name="$(sed -n 's/.*"serverName"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$PORTAL_SETTINGS_FILE" | head -n 1)"
  fi

  if [ -z "$current_name" ] && [ -f "$ENV_FILE" ]; then
    current_name="$(sed -n 's/^SERVER_NAME=//p' "$ENV_FILE" | head -n 1)"
  fi

  if [ -z "$current_name" ]; then
    current_name="$(sanitize_server_name "$(hostname 2>/dev/null || printf 'vpn-server')")"
  fi

  printf '%s' "$current_name"
}

set_env_value() {
  local file="$1"
  local key="$2"
  local value="$3"
  local escaped_value

  escaped_value="$(escape_sed_replacement "$value")"

  if grep -qE "^${key}=" "$file"; then
    sed -i.bak -E "s|^${key}=.*|${key}=${escaped_value}|" "$file"
    rm -f "$file.bak"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$file"
  fi
}

set_password_hash_secret() {
  local file="$1"
  local hash="$2"
  local tmp_file

  tmp_file="$(mktemp)"
  grep -vE '^(export[[:space:]]+)?PASSWORD_HASH=' "$file" > "$tmp_file" || true
  printf "export PASSWORD_HASH='%s'\n" "$hash" >> "$tmp_file"
  mv "$tmp_file" "$file"
}

set_portal_server_name() {
  local server_name="$1"

  # portal-config.json is owned by the portal and also holds adminPassword and
  # interfaceMode. Never overwrite it on a re-run — that would reset the admin's
  # password and interface mode. SERVER_NAME in .env already provides the display
  # name (see DEFAULT_SERVER_NAME in portal/server.js), so only seed the file on a
  # fresh install where it does not exist yet.
  [ -f "$PORTAL_SETTINGS_FILE" ] && return 0

  mkdir -p "$(dirname "$PORTAL_SETTINGS_FILE")"
  printf '{\n  "serverName": "%s"\n}\n' "$server_name" > "$PORTAL_SETTINGS_FILE"
}

resolve_server_name() {
  local server_name="${SERVER_NAME:-}"
  local default_name

  default_name="$(current_server_name)"

  if [ -n "$server_name" ]; then
    validate_server_name "$server_name" || die "Invalid SERVER_NAME '$server_name'. Use only letters, numbers, '-', '_' or '.' without spaces."
    printf '%s' "$server_name"
    return
  fi

  if has_tty; then
    while true; do
      read_prompt "Server name [$default_name]: " server_name
      server_name="${server_name:-$default_name}"
      if validate_server_name "$server_name"; then
        printf '%s' "$server_name"
        return
      fi
      printf '%s\n' "Server name must use only letters, numbers, '-', '_' or '.' without spaces."
    done
  fi

  printf '%s' "$default_name"
}

default_wg_host() {
  local host=""

  if command -v curl >/dev/null 2>&1; then
    host="$(curl -4fsS https://api.ipify.org 2>/dev/null || true)"
  fi

  if [ -z "$host" ] && command -v hostname >/dev/null 2>&1; then
    host="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  fi

  printf '%s' "$host"
}

current_wg_host() {
  local host=""

  if [ -f "$ENV_FILE" ]; then
    host="$(sed -n 's/^WG_HOST=//p' "$ENV_FILE" | head -n 1)"
  fi

  printf '%s' "$host"
}

ensure_linux() {
  [ "$(uname -s)" = "Linux" ] || die "This bootstrap script is intended for Linux VPS hosts."
}

self_update_repo_if_needed() {
  local self_update_enabled="${BOOTSTRAP_SELF_UPDATE:-yes}"
  local before_head=""
  local after_head=""

  if ! is_truthy "$self_update_enabled"; then
    log "Bootstrap self-update: disabled (BOOTSTRAP_SELF_UPDATE=${self_update_enabled})."
    return
  fi

  if [ "${BOOTSTRAP_SELF_UPDATED:-0}" = "1" ]; then
    log "Bootstrap self-update: already applied in this run."
    return
  fi

  if ! command -v git >/dev/null 2>&1; then
    log "Bootstrap self-update: skipped (git not available)."
    return
  fi

  if ! git -C "$SCRIPT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    log "Bootstrap self-update: skipped (not a git checkout)."
    return
  fi

  if ! git -C "$SCRIPT_DIR" diff --quiet || ! git -C "$SCRIPT_DIR" diff --cached --quiet; then
    log "Bootstrap self-update: skipped (local git changes detected)."
    return
  fi

  before_head="$(git -C "$SCRIPT_DIR" rev-parse --short HEAD 2>/dev/null || true)"

  log "Bootstrap self-update: enabled. Checking for updates..."
  if ! git -C "$SCRIPT_DIR" fetch origin main >/dev/null 2>&1; then
    log "Bootstrap self-update: skipped (unable to reach git remote)."
    return
  fi

  if ! git -C "$SCRIPT_DIR" merge --ff-only origin/main >/dev/null 2>&1; then
    log "Bootstrap self-update: skipped (fast-forward merge not possible)."
    return
  fi

  after_head="$(git -C "$SCRIPT_DIR" rev-parse --short HEAD 2>/dev/null || true)"
  if [ -n "$before_head" ] && [ "$before_head" != "$after_head" ]; then
    log "Bootstrap updated from $before_head to $after_head. Restarting script..."
    export BOOTSTRAP_SELF_UPDATED=1
    exec "$SCRIPT_DIR/bootstrap.sh" "$@"
  fi

  log "Bootstrap self-update: no update available ($after_head)."
}

resolver_has_non_loopback_nameserver() {
  awk '
    /^nameserver[[:space:]]+/ {
      ns=$2
      if (ns != "127.0.0.1" && ns != "::1") {
        found=1
      }
    }
    END { exit(found ? 0 : 1) }
  ' /etc/resolv.conf
}

repair_dns_resolver_if_needed() {
  local fallback_servers="${DNS_FALLBACK_SERVERS:-1.1.1.1 8.8.8.8}"
  local resolver_test_host="${DNS_TEST_HOST:-github.com}"

  if getent hosts "$resolver_test_host" >/dev/null 2>&1; then
    return
  fi

  if resolver_has_non_loopback_nameserver; then
    log "DNS lookup for ${resolver_test_host} failed even with non-loopback nameservers."
    return
  fi

  log "Detected localhost-only DNS resolver with failed lookups. Applying fallback nameservers..."

  run_root cp /etc/resolv.conf /etc/resolv.conf.easy-wg-combo.bak 2>/dev/null || true

  {
    printf 'nameserver 127.0.0.1\n'
    for dns in $fallback_servers; do
      printf 'nameserver %s\n' "$dns"
    done
  } | run_root tee /etc/resolv.conf >/dev/null

  if getent hosts "$resolver_test_host" >/dev/null 2>&1; then
    log "DNS resolver fallback applied successfully."
  else
    log "WARNING: DNS lookup still failing after fallback update."
  fi
}

is_truthy() {
  case "${1,,}" in
    y|yes|true|1|on) return 0 ;;
    *) return 1 ;;
  esac
}

is_ip_address() {
  local value="$1"
  [[ "$value" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || [[ "$value" == *:* ]]
}

validate_wg_host_resolution() {
  local h="$1"
  is_ip_address "$h" && return 0
  if getent hosts "$h" >/dev/null 2>&1; then
    info "✓ '$h' resolves correctly."
    return 0
  fi
  warn "⚠ '$h' does not resolve. Make sure the DNS record points to this VPS before continuing."
  if has_tty; then
    printf 'Continue anyway? [y/N] '
    read -r ans
    [ "${ans:-n}" = "y" ] || die "Aborted. Set the DNS record for '$h' and retry."
  fi
}

is_placeholder_domain() {
  local d="$1"
  case "$d" in
    vpn.example.com|example.com|YOUR_DOMAIN|your.domain.com) return 0 ;;
  esac
  return 1
}

resolve_admin_domain() {
  local wg_host_value="$1"
  local admin_domain="${ADMIN_DOMAIN:-}"

  if [ -z "$admin_domain" ] && [ -f "$ENV_FILE" ]; then
    admin_domain="$(sed -n 's/^ADMIN_DOMAIN=//p' "$ENV_FILE" | head -n 1)"
  fi

  # Ignore placeholder values left from .env.example
  if is_placeholder_domain "$admin_domain"; then
    admin_domain=""
  fi

  if [ -z "$admin_domain" ]; then
    admin_domain="$wg_host_value"
  fi

  if [ -z "$admin_domain" ]; then
    admin_domain="$(current_wg_host)"
  fi

  printf '%s' "$admin_domain"
}

# Keep this in sync with generateMainCaddyfile() in portal/server.js — the portal
# regenerates the same Caddyfile when the admin changes the Server Endpoint from the UI.
configure_caddy() {
  local admin_domain="$1"
  local caddy_https_port="${2:-}"   # when set, Caddy binds to localhost:$caddy_https_port (Xray mode)
  local portal_port="${PORTAL_PORT:-8080}"
  local tls_email="${TLS_EMAIL:-}"
  local caddy_dir="$SCRIPT_DIR/caddy"
  local caddy_file="$caddy_dir/Caddyfile"

  mkdir -p "$caddy_dir" "$caddy_dir/data" "$caddy_dir/config" "$caddy_dir/logs"

  # Create the managed proxy services file if it doesn't exist
  local services_file="$caddy_dir/easywg-services.caddy"
  if [ ! -f "$services_file" ]; then
    printf '# Easy-WG-Combo managed proxy services — edited by the portal, do not edit manually\n' > "$services_file"
  fi

  # Whether Caddy can obtain a publicly-trusted (Let's Encrypt) cert:
  # requires a real FQDN (not a bare IP) and an ACME contact email.
  local use_public_tls="no"
  if [ -n "$admin_domain" ] && [ -n "$tls_email" ] && ! is_ip_address "$admin_domain"; then
    use_public_tls="yes"
  fi

  {
    printf '{\n'
    if [ "$use_public_tls" = "yes" ]; then
      printf '  email %s\n' "$tls_email"
    fi
    printf '  admin localhost:2019\n'
    printf '}\n\n'

    if [ -n "$caddy_https_port" ]; then
      # Xray mode: Caddy serves the portal publicly on $caddy_https_port (443 is held by Xray).
      # Use explicit admin_domain so the cert is issued for the correct hostname/IP.
      printf '%s:%s {\n' "${admin_domain:-:}" "$caddy_https_port"
      if [ "$use_public_tls" = "yes" ]; then
        # Real Let's Encrypt cert. Xray owns :443 so TLS-ALPN-01 is impossible —
        # force the HTTP-01 challenge (served by Caddy on :80).
        printf '  tls {\n'
        printf '    issuer acme {\n'
        printf '      email %s\n' "$tls_email"
        printf '      disable_tlsalpn_challenge\n'
        printf '    }\n'
        printf '  }\n'
      else
        # Bare IP or no email: fall back to a self-signed cert (browser warning).
        printf '  tls internal\n'
      fi
    else
      if [ -z "$admin_domain" ]; then
        admin_domain=":443"
      fi
      printf '%s {\n' "$admin_domain"
      if is_ip_address "$admin_domain" || [ "$admin_domain" = ":443" ] || [ -z "$tls_email" ]; then
        printf '  tls internal\n'
      fi
    fi

    printf '  encode zstd gzip\n'
    printf '  log {\n'
    printf '    output file /var/log/easy-wg-portal/access.log\n'
    printf '    format json\n'
    printf '  }\n'
    printf '  reverse_proxy 127.0.0.1:%s\n' "$portal_port"
    printf '  header {\n'
    printf '    Strict-Transport-Security "max-age=31536000; includeSubDomains"\n'
    printf '    X-Content-Type-Options "nosniff"\n'
    printf '    Referrer-Policy "same-origin"\n'
    printf '  }\n'
    printf '}\n\n'
    printf 'import /etc/caddy/easywg-services.caddy\n'
  } > "$caddy_file"
}

configure_fail2ban() {
  local jail_name="${FAIL2BAN_JAIL:-easy-wg-portal}"
  local bantime="${FAIL2BAN_BANTIME:-1h}"
  local findtime="${FAIL2BAN_FINDTIME:-10m}"
  local maxretry="${FAIL2BAN_MAXRETRY:-5}"
  local log_path="$SCRIPT_DIR/caddy/logs/access.log"

  mkdir -p "$(dirname "$log_path")"
  touch "$log_path"

  run_root mkdir -p /etc/fail2ban/filter.d /etc/fail2ban/jail.d

  run_root tee /etc/fail2ban/filter.d/easy-wg-portal.conf >/dev/null <<EOF
[Definition]
failregex = ^.*"remote_ip":"<HOST>".*"uri":"/api/login".*"status":401.*$
ignoreregex =
EOF

  run_root tee /etc/fail2ban/jail.d/easy-wg-portal.local >/dev/null <<EOF
[${jail_name}]
enabled = true
port = https,http
filter = easy-wg-portal
logpath = ${log_path}
findtime = ${findtime}
bantime = ${bantime}
maxretry = ${maxretry}
banaction = ufw
EOF

  run_root systemctl enable --now fail2ban
  run_root systemctl restart fail2ban
}

install_packages() {
  local packages=(ca-certificates curl git ufw fail2ban)

  if ! command -v docker >/dev/null 2>&1; then
    packages+=(docker.io)
  fi

  if ! docker compose version >/dev/null 2>&1; then
    packages+=(docker-compose-plugin)
  fi

  log "Installing host dependencies..."
  run_root apt-get update

  if [ "${#packages[@]}" -gt 0 ]; then
    run_root env DEBIAN_FRONTEND=noninteractive apt-get install -y "${packages[@]}"
  fi

  run_root systemctl enable --now docker
}

configure_firewall() {
  local wg_port="$1"
  local xray_enabled="${2:-no}"
  local caddy_https_port="${3:-8443}"
  local admin_domain="${4:-}"
  local ssh_port="${SSH_PORT:-22}"
  local public_https_enabled="${PUBLIC_HTTPS_ENABLED:-yes}"
  local tls_email="${TLS_EMAIL:-}"

  # Caddy can obtain a public (Let's Encrypt) cert only with a real FQDN + ACME email.
  local use_public_tls="no"
  if [ -n "$admin_domain" ] && [ -n "$tls_email" ] && ! is_ip_address "$admin_domain"; then
    use_public_tls="yes"
  fi

  log "Configuring UFW..."
  run_root ufw allow "${ssh_port}/tcp"
  run_root ufw allow "${wg_port}/udp"
  if is_truthy "$xray_enabled"; then
    # Xray on 443; portal on caddy_https_port
    run_root ufw allow 443/tcp
    run_root ufw allow "${caddy_https_port}/tcp"
    if [ "$use_public_tls" = "yes" ]; then
      # Xray owns :443, so Caddy validates its cert via HTTP-01 on :80 — keep it open.
      run_root ufw allow 80/tcp
    else
      # Self-signed cert (bare IP or no email): port 80 is not needed.
      run_root ufw delete allow 80/tcp 2>/dev/null || true
    fi
  elif is_truthy "$public_https_enabled"; then
    run_root ufw allow 80/tcp
    run_root ufw allow 443/tcp
    # Close caddy_https_port if it was opened by a previous Xray install
    run_root ufw delete allow "${caddy_https_port}/tcp" 2>/dev/null || true
  fi
  # Allow AdGuard DNS from Docker bridge (wg-easy DNAT forwards VPN client DNS here)
  run_root ufw allow from 172.16.0.0/12 to any port 53 proto udp comment "AdGuard DNS from Docker"
  run_root ufw allow from 172.16.0.0/12 to any port 53 proto tcp comment "AdGuard DNS from Docker"
  run_root ufw --force enable
}

configure_sysctl() {
  log "Configuring kernel forwarding..."
  run_root tee /etc/sysctl.d/99-easy-wg-combo.conf >/dev/null <<'EOF'
net.ipv4.ip_forward=1
EOF
  run_root sysctl --system >/dev/null
}

ensure_env_files() {
  if [ ! -f "$ENV_FILE" ]; then
    cp "$SCRIPT_DIR/.env.example" "$ENV_FILE"
  fi

  if [ ! -f "$SECRETS_FILE" ]; then
    cp "$SCRIPT_DIR/.env.secrets.example" "$SECRETS_FILE"
  fi
}

generate_password_hash() {
  local admin_password="$1"

  docker run --rm ghcr.io/wg-easy/wg-easy:14 wgpw "$admin_password" | sed -n "s/^PASSWORD_HASH='\(.*\)'$/\1/p"
}

set_secret_export() {
  local file="$1"
  local key="$2"
  local value="$3"
  local tmp_file
  tmp_file="$(mktemp)"
  grep -vE "^(export[[:space:]]+)?${key}=" "$file" > "$tmp_file" || true
  printf "export %s='%s'\n" "$key" "$value" >> "$tmp_file"
  mv "$tmp_file" "$file"
}

configure_xray() {
  local xray_dir="$SCRIPT_DIR/xray"
  local uuid private_key public_key short_id keypair
  local sni_target="${XRAY_SNI_TARGET:-www.cloudflare.com}"
  local xray_port="${XRAY_PORT:-443}"

  mkdir -p "$xray_dir/logs"
  chmod 777 "$xray_dir/logs"

  # Read existing values from .env / .env.secrets (bootstrap never sources these files)
  local _env_uuid _env_pub _env_priv _env_sid
  _env_uuid="$(sed -n 's/^XRAY_UUID=//p' "$ENV_FILE" 2>/dev/null | head -1)"
  _env_pub="$(sed -n 's/^XRAY_PUBLIC_KEY=//p' "$ENV_FILE" 2>/dev/null | head -1)"
  _env_priv="$(sed -n "s/^export XRAY_PRIVATE_KEY='\(.*\)'/\1/p" "$SECRETS_FILE" 2>/dev/null | head -1)"
  _env_sid="$(sed -n "s/^export XRAY_SHORT_ID='\(.*\)'/\1/p" "$SECRETS_FILE" 2>/dev/null | head -1)"

  # UUID — non-secret, stored in .env
  uuid="${XRAY_UUID:-${_env_uuid:-}}"
  if [ -z "$uuid" ]; then
    if [ -f /proc/sys/kernel/random/uuid ]; then
      uuid="$(cat /proc/sys/kernel/random/uuid)"
    else
      uuid="$(od -x /dev/urandom | head -1 | awk '{OFS="-"; print substr($2$3,1,8), substr($3$4,1,4), "4"substr($4,2,3), substr($5,1,4), $6$7}' | tr '[:upper:]' '[:lower:]')"
    fi
    set_env_value "$ENV_FILE" "XRAY_UUID" "$uuid"
    log "Generated Xray UUID."
  fi

  # X25519 key pair — private key is secret, public key goes in .env
  private_key="${XRAY_PRIVATE_KEY:-${_env_priv:-}}"
  public_key="${XRAY_PUBLIC_KEY:-${_env_pub:-}}"
  if [ -z "$private_key" ] || [ -z "$public_key" ]; then
    log "Generating Xray X25519 key pair (pulling image if needed)..."
    keypair="$(docker run --rm ghcr.io/xtls/xray-core:latest x25519 2>/dev/null)"
    private_key="$(printf '%s' "$keypair" | grep -i 'private' | awk '{print $NF}')"
    public_key="$(printf '%s' "$keypair" | grep -i 'public' | awk '{print $NF}')"
    [ -n "$private_key" ] || die "Failed to generate Xray private key."
    set_secret_export "$SECRETS_FILE" "XRAY_PRIVATE_KEY" "$private_key"
    set_env_value "$ENV_FILE" "XRAY_PUBLIC_KEY" "$public_key"
    log "Generated Xray key pair."
  fi

  # Short ID — secret, 8 random bytes as hex
  short_id="${XRAY_SHORT_ID:-${_env_sid:-}}"
  if [ -z "$short_id" ]; then
    short_id="$(od -An -N8 -tx1 /dev/urandom | tr -d ' \n')"
    set_secret_export "$SECRETS_FILE" "XRAY_SHORT_ID" "$short_id"
    log "Generated Xray short ID."
  fi
  set_env_value "$ENV_FILE" "XRAY_SNI_TARGET" "$sni_target"
  set_env_value "$ENV_FILE" "XRAY_PORT" "$xray_port"

  cat > "$xray_dir/config.json" <<EOF
{
  "log": {
    "loglevel": "warning",
    "access": "/var/log/xray/access.log",
    "error": "/var/log/xray/error.log"
  },
  "inbounds": [
    {
      "listen": "0.0.0.0",
      "port": ${xray_port},
      "protocol": "vless",
      "settings": {
        "clients": [
          {
            "id": "${uuid}",
            "flow": "xtls-rprx-vision"
          }
        ],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "tcp",
        "security": "reality",
        "realitySettings": {
          "show": false,
          "dest": "${sni_target}:443",
          "xver": 0,
          "serverNames": ["${sni_target}"],
          "privateKey": "${private_key}",
          "shortIds": ["${short_id}"]
        }
      },
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls", "quic"]
      }
    }
  ],
  "outbounds": [
    { "protocol": "freedom", "tag": "direct" },
    { "protocol": "blackhole", "tag": "block" }
  ]
}
EOF
  log "Xray config written to $xray_dir/config.json"
}

main() {
  print_header
  confirm_installation

  ensure_linux
  require_cmd apt-get

  repair_dns_resolver_if_needed
  self_update_repo_if_needed "$@"

  install_packages
  ensure_disk_space
  ensure_env_files

  local has_existing="no"
  local existing_action=""

  if existing_install_detected; then
    has_existing="yes"
    existing_action="$(resolve_existing_install_action)"

    if [ "$existing_action" = "new" ]; then
      log "Existing installation detected. Creating backup before replacement..."
      backup_existing_state
      log "Removing existing containers..."
      replace_existing_containers
    else
      log "Keeping existing configuration and containers."
    fi
  fi

  local wg_host="${WG_HOST:-${1:-}}"
  local admin_password="${ADMIN_PASSWORD:-${2:-}}"
  local server_name
  local wg_port
  local admin_domain
  local public_https_enabled="${PUBLIC_HTTPS_ENABLED:-yes}"
  local action_label="fresh"

  wg_port="$(resolve_wg_port)"

  server_name="$(resolve_server_name)"

  if [ "$has_existing" = "no" ] || [ "$existing_action" = "new" ]; then
    action_label="new"
    if [ -z "$wg_host" ]; then
      wg_host="$(default_wg_host)"
    fi
    if [ -z "$wg_host" ]; then
      if has_tty; then
        read_prompt "VPS public IP or hostname for WG_HOST: " wg_host
      else
        die "WG_HOST is required in non-interactive mode."
      fi
    fi
    [ -n "$wg_host" ] || die "WG_HOST is required."
    validate_wg_host_resolution "$wg_host"

    if [ -z "$admin_password" ]; then
      if has_tty; then
        read_secret_prompt "Admin password for the portal and wg-easy: " admin_password
      else
        die "ADMIN_PASSWORD is required in non-interactive mode."
      fi
      printf '\n'
    fi
    [ -n "$admin_password" ] || die "ADMIN_PASSWORD is required."

    local password_hash
    log "Generating WireGuard password hash..."
    password_hash="$(generate_password_hash "$admin_password")"
    [ -n "$password_hash" ] || die "Failed to generate PASSWORD_HASH."

    log "Writing configuration files..."
    set_env_value "$ENV_FILE" "WG_HOST" "$wg_host"
    set_env_value "$ENV_FILE" "ADMIN_PASSWORD" "$admin_password"
    set_env_value "$ENV_FILE" "WG_PORT" "$wg_port"
  else
    action_label="keep"
    if [ -z "$wg_host" ]; then
      wg_host="$(current_wg_host)"
    fi
    if [ -n "$wg_port" ]; then
      set_env_value "$ENV_FILE" "WG_PORT" "$wg_port"
    fi
  fi

  log "Saving server name..."
  set_env_value "$ENV_FILE" "SERVER_NAME" "$server_name"
  set_portal_server_name "$server_name"

  admin_domain="$(resolve_admin_domain "$wg_host")"
  if [ -n "$admin_domain" ]; then
    set_env_value "$ENV_FILE" "ADMIN_DOMAIN" "$admin_domain"
  fi

  if [ "$has_existing" = "no" ] || [ "$existing_action" = "new" ]; then
    set_password_hash_secret "$SECRETS_FILE" "$password_hash"
  fi

  local _env_xray _env_caddy_port
  _env_xray="$(sed -n 's/^XRAY_ENABLED=//p' "$ENV_FILE" 2>/dev/null | head -1)"
  _env_caddy_port="$(sed -n 's/^CADDY_HTTPS_PORT=//p' "$ENV_FILE" 2>/dev/null | head -1)"
  local xray_enabled="${XRAY_ENABLED:-${_env_xray:-no}}"
  local caddy_https_port="${CADDY_HTTPS_PORT:-${_env_caddy_port:-8443}}"

  configure_sysctl
  configure_firewall "$wg_port" "$xray_enabled" "$caddy_https_port" "$admin_domain"

  if is_truthy "$xray_enabled"; then
    log "Configuring Xray VLESS+Reality..."
    configure_xray
    set_env_value "$ENV_FILE" "CADDY_HTTPS_PORT" "$caddy_https_port"
    log "Configuring Caddy on public port ${caddy_https_port}..."
    configure_caddy "$admin_domain" "$caddy_https_port"
    log "Configuring Fail2Ban protection..."
    configure_fail2ban
  else
    # Ensure xray container is stopped if it was previously running
    if docker inspect xray >/dev/null 2>&1; then
      log "Stopping xray container (XRAY_ENABLED=no)..."
      docker stop xray 2>/dev/null || true
      docker rm xray 2>/dev/null || true
    fi
    if is_truthy "$public_https_enabled"; then
      log "Configuring Caddy HTTPS reverse proxy..."
      configure_caddy "$admin_domain"
      log "Configuring Fail2Ban protection..."
      configure_fail2ban
    fi
  fi

  log "Starting the stack (attempting image rebuild first)..."
  if "$SCRIPT_DIR/compose.sh" up -d --build; then
    # Reload Caddy to apply the regenerated Caddyfile (compose only restarts on spec change)
    "$SCRIPT_DIR/compose.sh" restart caddy >/dev/null 2>&1 || true
    print_final_summary "$action_label" "$wg_host" "$wg_port" "$server_name" "$admin_domain" "$public_https_enabled" "$admin_password" "${TLS_EMAIL:-}" "$xray_enabled" "$caddy_https_port"
    exit 0
  fi

  log "Image rebuild failed; retrying without rebuild..."
  "$SCRIPT_DIR/compose.sh" up -d
  "$SCRIPT_DIR/compose.sh" restart caddy >/dev/null 2>&1 || true
  print_final_summary "$action_label" "$wg_host" "$wg_port" "$server_name" "$admin_domain" "$public_https_enabled" "$admin_password" "${TLS_EMAIL:-}" "$xray_enabled" "$caddy_https_port"
}

main "$@"