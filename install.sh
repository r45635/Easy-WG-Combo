#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/r45635/Easy-WG-Combo.git}"
APP_DIR="${APP_DIR:-$HOME/Easy-WG-Combo}"

log() {
  printf '%s\n' "$*"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'ERROR: Missing required command: %s\n' "$1" >&2
    exit 1
  }
}

run_bootstrap() {
  cd "$APP_DIR"
  chmod +x ./bootstrap.sh

  if [ "$(id -u)" -eq 0 ]; then
    exec ./bootstrap.sh
  fi

  exec sudo --preserve-env=WG_HOST,ADMIN_PASSWORD,SSH_PORT ./bootstrap.sh
}

main() {
  require_cmd git

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