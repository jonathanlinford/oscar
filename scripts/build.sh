#!/usr/bin/env bash
#
# Package Oscar as a .zip for the Chrome Web Store developer dashboard.
#
# Usage:
#   bash scripts/build.sh
#
# Output:
#   dist/oscar-<version>.zip

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION=$(grep '"version"' manifest.json | head -1 | sed -E 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')

if [ -z "$VERSION" ]; then
  echo "error: could not read version from manifest.json" >&2
  exit 1
fi

DIST_DIR="dist"
OUTPUT="$DIST_DIR/oscar-$VERSION.zip"

mkdir -p "$DIST_DIR"
rm -f "$OUTPUT"

EXTENSION_FILES=(
  manifest.json
  analytics.js
  action-presenter.js
  background.js
  content.js
  matching.js
  options.html
  options.js
  options.css
  popup.html
  popup.js
  popup.css
  theme.js
  theme.css
  LICENSE
)

ICON_FILES=(
  icons/icon-16.png
  icons/icon-32.png
  icons/icon-48.png
  icons/icon-128.png
  icons/icon-closing-16.png
  icons/icon-closing-32.png
  icons/icon-closing-48.png
  icons/icon-closing-128.png
)

MISSING=()
for f in "${EXTENSION_FILES[@]}" "${ICON_FILES[@]}"; do
  if [ ! -f "$f" ]; then
    MISSING+=("$f")
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "error: missing required files:" >&2
  for f in "${MISSING[@]}"; do echo "  - $f" >&2; done
  exit 1
fi

zip -q "$OUTPUT" "${EXTENSION_FILES[@]}" "${ICON_FILES[@]}"

SIZE=$(du -h "$OUTPUT" | cut -f1 | tr -d ' ')
FILE_COUNT=$(unzip -Z -1 "$OUTPUT" | wc -l | tr -d ' ')

echo "Built $OUTPUT ($SIZE, $FILE_COUNT files)"
