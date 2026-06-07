#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
SECRETS_FILE="$SCRIPT_DIR/.env.secrets"

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

escape_sed_replacement() {
  printf '%s' "$1" | sed -e 's/[&|\\]/\\&/g'
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

ensure_linux() {
  [ "$(uname -s)" = "Linux" ] || die "This bootstrap script is intended for Linux VPS hosts."
}

install_packages() {
  local packages=(ca-certificates curl git ufw)

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
  local ssh_port="${SSH_PORT:-22}"

  log "Configuring UFW..."
  run_root ufw allow "${ssh_port}/tcp"
  run_root ufw allow 51820/udp
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

main() {
  ensure_linux
  require_cmd apt-get

  install_packages
  ensure_env_files
  configure_sysctl
  configure_firewall

  local wg_host="${WG_HOST:-${1:-}}"
  if [ -z "$wg_host" ]; then
    wg_host="$(default_wg_host)"
  fi
  if [ -z "$wg_host" ]; then
    read -r -p "VPS public IP or hostname for WG_HOST: " wg_host
  fi
  [ -n "$wg_host" ] || die "WG_HOST is required."

  local admin_password="${ADMIN_PASSWORD:-${2:-}}"
  if [ -z "$admin_password" ]; then
    read -r -s -p "Admin password for the portal and wg-easy: " admin_password
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
  set_password_hash_secret "$SECRETS_FILE" "$password_hash"

  log "Starting the stack..."
  exec "$SCRIPT_DIR/compose.sh" up -d
}

main "$@"