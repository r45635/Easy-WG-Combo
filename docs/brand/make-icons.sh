#!/usr/bin/env bash
#
# Regenerate the portal's icons from docs/brand/icon.svg.
#
#   bash docs/brand/make-icons.sh
#
# Writes portal/public/{favicon.svg,favicon.ico,apple-touch-icon.png}.
# Commit the result: the files are served by the portal and baked into its image.
set -euo pipefail

BRAND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$BRAND_DIR/../.." && pwd)"
SRC="$BRAND_DIR/icon.svg"
OUT="$REPO_DIR/portal/public"

command -v rsvg-convert >/dev/null || {
  echo "rsvg-convert is required (brew install librsvg)" >&2
  exit 1
}
[ -f "$SRC" ] || { echo "missing $SRC" >&2; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# ── favicon.ico: 16, 32 and 48 px, the three sizes browsers and Windows ask for
for size in 16 32 48; do
  rsvg-convert -w "$size" -h "$size" "$SRC" -o "$TMP/$size.png"
done
python3 "$BRAND_DIR/png2ico.py" "$TMP/16.png" "$TMP/32.png" "$TMP/48.png" "$OUT/favicon.ico"

# ── apple-touch-icon: iOS applies its own rounded mask, so feed it a square tile
#    (keeping our own radius would leave black wedges in the corners).
sed 's/ rx="13" ry="13"//' "$SRC" > "$TMP/square.svg"
rsvg-convert -w 180 -h 180 "$TMP/square.svg" -o "$OUT/apple-touch-icon.png"

# ── favicon.svg: what modern browsers prefer, scaled by the browser itself
cp "$SRC" "$OUT/favicon.svg"

# ── No silent success: every file must exist and be non-empty
status=0
for f in favicon.ico apple-touch-icon.png favicon.svg; do
  if [ -s "$OUT/$f" ]; then
    printf '  ✓ %-22s %s bytes\n' "$f" "$(wc -c < "$OUT/$f" | tr -d ' ')"
  else
    printf '  ✗ %-22s MISSING OR EMPTY\n' "$f" >&2
    status=1
  fi
done
exit "$status"
