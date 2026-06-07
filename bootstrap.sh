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

  if [ -t 0 ]; then
    read -r -p "Run Docker prune cleanup before deployment? [Y/n]: " do_prune
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
  local containers=(wg-easy adguard portal)
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
    if [ -t 0 ]; then
      printf '%s\n' "Existing Easy-WG-Combo configuration detected."
      printf '%s\n' "Choose an action:"
      printf '%s\n' "  [k] keep existing configuration and start/restart services"
      printf '%s\n' "  [n] start new configuration (creates backup first)"

      while true; do
        read -r -p "Action (k/n): " action
        case "${action,,}" in
          k|keep) action="keep"; break ;;
          n|new)  action="new"; break ;;
          *) printf '%s\n' "Please answer 'k' (keep) or 'n' (new)." ;;
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
  local containers=(wg-easy adguard portal)
  local c

  for c in "${containers[@]}"; do
    docker rm -f "$c" >/dev/null 2>&1 || true
  done
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
  ensure_disk_space
  ensure_env_files
  configure_sysctl
  configure_firewall

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

  if [ "$has_existing" = "no" ] || [ "$existing_action" = "new" ]; then
    if [ -z "$wg_host" ]; then
      wg_host="$(default_wg_host)"
    fi
    if [ -z "$wg_host" ]; then
      read -r -p "VPS public IP or hostname for WG_HOST: " wg_host
    fi
    [ -n "$wg_host" ] || die "WG_HOST is required."

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
  fi

  log "Starting the stack..."
  exec "$SCRIPT_DIR/compose.sh" up -d
}

main "$@"