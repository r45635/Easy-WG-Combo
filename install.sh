#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/r45635/Easy-WG-Combo.git}"
APP_DIR="${APP_DIR:-$HOME/Easy-WG-Combo}"

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

  exec sudo --preserve-env=WG_HOST,ADMIN_PASSWORD,SSH_PORT,SERVER_NAME,ALLOW_REPLACE,BACKUP_DIR,EXISTING_CONFIG_ACTION ./bootstrap.sh
}

main() {
  require_cmd apt-get
  ensure_git

  if [ ! -t 0 ] && { [ -z "${WG_HOST:-}" ] || [ -z "${ADMIN_PASSWORD:-}" ]; }; then
    die "Non-interactive mode detected. Set WG_HOST and ADMIN_PASSWORD (optional: SERVER_NAME, SSH_PORT, BACKUP_DIR=/path, EXISTING_CONFIG_ACTION=keep|new)."
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