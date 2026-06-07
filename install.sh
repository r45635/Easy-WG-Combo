#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/r45635/Easy-WG-Combo.git}"
APP_DIR="${APP_DIR:-$HOME/Easy-WG-Combo}"
INSTALL_VERSION="1.1.0"

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
    command -v sudo >/dev/null 2>&1 || die "sudo is required when not running as root."
    sudo "$@"
  fi
}

has_tty() {
  [ -t 0 ] || [ -r /dev/tty ]
}

print_install_header() {
  log "=============================================="
  log "Easy-WG-Combo installer v${INSTALL_VERSION}"
  log "The all-in-one self-hosted VPN + DNS + admin portal."
  log "Repository: ${REPO_URL}"
  log "=============================================="
  log ""
}

confirm_proceed() {
  local answer=""

  if ! has_tty; then
    return
  fi

  read_prompt "Proceed with installation? [Y/n]: " answer
  answer="${answer:-Y}"
  case "${answer,,}" in
    y|yes) return ;;
    *) die "Installation cancelled by user." ;;
  esac
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

resolve_install_dir() {
  local answer=""
  local default_dir="$APP_DIR"

  if [ -n "${APP_DIR_OVERRIDE_LOCK:-}" ]; then
    return
  fi

  if has_tty; then
    read_prompt "Installation path [$default_dir]: " answer
    answer="${answer:-$default_dir}"
    APP_DIR="$answer"
  fi
}

path_has_existing_install() {
  local dir="$1"

  if [ -d "$dir/.git" ]; then
    return 0
  fi

  [ -d "$dir" ] && [ -n "$(find "$dir" -mindepth 1 -print -quit 2>/dev/null)" ]
}

remove_installation_completely() {
  local dir="$1"

  log "Removing existing Easy-WG-Combo installation from $dir..."

  if [ -x "$dir/compose.sh" ]; then
    (
      cd "$dir"
      ./compose.sh down --remove-orphans >/dev/null 2>&1 || true
    )
  fi

  run_root docker rm -f wg-easy adguard portal caddy >/dev/null 2>&1 || true
  run_root rm -rf "$dir"

  log "Removal completed."
}

handle_existing_installation() {
  local action=""
  local new_dir=""

  if ! path_has_existing_install "$APP_DIR"; then
    return
  fi

  if ! has_tty; then
    return
  fi

  log ""
  log "Existing installation detected at: $APP_DIR"
  log "Choose an action:"
  log "  [upgrade] Update existing installation in this path"
  log "  [new]     Install to a different path"
  log "  [remove]  Remove installation completely and exit"

  while true; do
    read_prompt "Action (upgrade/new/remove) [upgrade]: " action
    action="${action:-upgrade}"

    case "${action,,}" in
      u|upgrade)
        return
        ;;
      n|new)
        local new_default="${APP_DIR}-2"
        while true; do
          read_prompt "New installation path [$new_default]: " new_dir
          new_dir="${new_dir:-$new_default}"
          if [ "$new_dir" = "$APP_DIR" ]; then
            log "Please choose a different path than the current installation."
            continue
          fi
          APP_DIR="$new_dir"
          if path_has_existing_install "$APP_DIR"; then
            log "Path already contains files. Choose another path or use upgrade/remove."
            continue
          fi
          return
        done
        ;;
      r|remove)
        read_prompt "Confirm complete removal? Type 'yes' to continue: " action
        if [ "${action,,}" = "yes" ]; then
          remove_installation_completely "$APP_DIR"
          exit 0
        fi
        log "Removal cancelled."
        ;;
      *)
        log "Please answer upgrade, new, or remove."
        ;;
    esac
  done
}

ensure_git() {
  if command -v git >/dev/null 2>&1; then
    return
  fi

  log "git is missing, installing it..."
  run_root apt-get update
  run_root env DEBIAN_FRONTEND=noninteractive apt-get install -y git ca-certificates
}

run_bootstrap() {
  cd "$APP_DIR"
  chmod +x ./bootstrap.sh

  if [ "$(id -u)" -eq 0 ]; then
    exec ./bootstrap.sh
  fi

  exec sudo --preserve-env=WG_HOST,ADMIN_PASSWORD,SSH_PORT,SERVER_NAME,ALLOW_REPLACE,BACKUP_DIR,EXISTING_CONFIG_ACTION,ADMIN_DOMAIN,TLS_EMAIL,PUBLIC_HTTPS_ENABLED,FAIL2BAN_JAIL,FAIL2BAN_BANTIME,FAIL2BAN_FINDTIME,FAIL2BAN_MAXRETRY,DNS_FALLBACK_SERVERS,DNS_TEST_HOST ./bootstrap.sh
}

main() {
  print_install_header
  confirm_proceed
  require_cmd apt-get
  ensure_git
  resolve_install_dir
  handle_existing_installation

  if ! has_tty && { [ -z "${WG_HOST:-}" ] || [ -z "${ADMIN_PASSWORD:-}" ]; }; then
    die "Non-interactive mode detected. Set WG_HOST and ADMIN_PASSWORD (optional: SERVER_NAME, ADMIN_DOMAIN, TLS_EMAIL, PUBLIC_HTTPS_ENABLED, SSH_PORT, BACKUP_DIR=/path, EXISTING_CONFIG_ACTION=keep|new)."
  fi

  if [ -d "$APP_DIR/.git" ]; then
    log "Updating existing checkout in $APP_DIR..."
    git -C "$APP_DIR" pull --ff-only origin main
  else
    log "Cloning repository into $APP_DIR..."
    git clone "$REPO_URL" "$APP_DIR"
  fi

  log "Starting bootstrap..."
  run_bootstrap
}

main "$@"