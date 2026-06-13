#!/usr/bin/env bash
# File drop CLI — wraps the portal API
# Usage: ./easywg filedrop <subcommand> [args]
#
# STATUS: EXPERIMENTAL — this module is not yet enabled.
# File Drop requires a full security audit (path traversal, public link exposure,
# password hashing, cleanup) before it is safe to enable via CLI.
set -euo pipefail

echo "File Drop module is experimental and not yet enabled." >&2
echo "See docs/filedrop-preview.md for what is planned and what is required before enabling." >&2
exit 2
