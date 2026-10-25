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

# Portal image tag. Defaults to the VERSION file, so docker-compose.yml never
# carries a version to keep in sync; `easywg update` overrides it with the
# sha-<commit> tag of the checkout so a server can pull instead of compiling.
export PORTAL_IMAGE_TAG="${PORTAL_IMAGE_TAG:-$(cat "$SCRIPT_DIR/VERSION" 2>/dev/null || echo latest)}"

COMPOSE_FILES="-f $SCRIPT_DIR/docker-compose.yml"
if [ "${XRAY_ENABLED:-no}" = "yes" ] && [ -f "$SCRIPT_DIR/docker-compose.xray.yml" ]; then
  COMPOSE_FILES="$COMPOSE_FILES -f $SCRIPT_DIR/docker-compose.xray.yml"
fi

# Local, untracked customisations — an extra volume, a mounted certificate,
# a changed port. Put them here rather than editing docker-compose.yml:
# a tracked edit makes `easywg update` refuse to run (dirty checkout), which
# is how an installation ends up updated by hand forever.
# Compose only auto-loads an override file when no -f is given, and we always
# pass -f, so it has to be named explicitly.
if [ -f "$SCRIPT_DIR/docker-compose.override.yml" ]; then
  COMPOSE_FILES="$COMPOSE_FILES -f $SCRIPT_DIR/docker-compose.override.yml"
fi

# shellcheck disable=SC2086
exec docker compose $COMPOSE_FILES "$@"
