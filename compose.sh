#!/usr/bin/env bash
# Wrapper docker compose — sources .env.secrets to inject PASSWORD_HASH
# Usage: ./compose.sh up -d | down | restart | logs -f | ps
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECRETS_FILE="$SCRIPT_DIR/.env.secrets"

if [ ! -f "$SECRETS_FILE" ]; then
  echo "ERROR: $SECRETS_FILE not found."
  echo "Create it from .env.secrets.example and fill in your hash."
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "$SECRETS_FILE"
# Load .env to pick up XRAY_ENABLED (non-secret)
if [ -f "$SCRIPT_DIR/.env" ]; then
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/.env"
fi
set +a

COMPOSE_FILES="-f $SCRIPT_DIR/docker-compose.yml"
if [ "${XRAY_ENABLED:-no}" = "yes" ] && [ -f "$SCRIPT_DIR/docker-compose.xray.yml" ]; then
  COMPOSE_FILES="$COMPOSE_FILES -f $SCRIPT_DIR/docker-compose.xray.yml"
fi

# shellcheck disable=SC2086
exec docker compose $COMPOSE_FILES "$@"
