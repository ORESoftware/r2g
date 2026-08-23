#!/bin/sh
# ores-lint :: entry point
#
# Warn-only by default. This is wired into prebuild / prepublishOnly across
# many repos, so it is designed to be incapable of breaking a build unless a
# human explicitly sets ORES_LINT_STRICT=1.

set -u
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT=$(dirname "$DIR")
. "$DIR/config.sh"

echo "ores-lint v$(cat "$DIR/VERSION" 2>/dev/null || echo '?') :: $(basename "$ROOT")"

FOUND=0
LOG=$(mktemp) || exit 0

if [ -f "$ROOT/package.json" ]; then
  sh "$DIR/js.sh" "$ROOT" | tee -a "$LOG"
  FOUND=1
fi

if [ -f "$ROOT/Cargo.toml" ]; then
  sh "$DIR/rust.sh" "$ROOT" | tee -a "$LOG"
  FOUND=1
fi

[ "$FOUND" = "0" ] && echo "ores-lint: no package.json or Cargo.toml at repo root - nothing to do"

if [ "${ORES_LINT_STRICT}" = "1" ] && grep -q 'finding(s) across' "$LOG"; then
  rm -f "$LOG"
  echo "ores-lint: FAILING because ORES_LINT_STRICT=1"
  exit 1
fi

rm -f "$LOG"
exit 0
