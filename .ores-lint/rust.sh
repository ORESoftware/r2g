#!/bin/sh
# ores-lint :: Rust
#
# The headline custom behaviour: `clippy::implicit_return` fires once per
# implicit return, which on a real crate means hundreds of identical warnings.
# The lint stays enabled so nothing is missed, but it is reported as ONE
# warning carrying at most ORES_LINT_MAX_EXAMPLES locations plus a total count.
#
# Critical interaction, handled below: `clippy::needless_return` ships enabled
# in clippy's default `style` group and warns on exactly the explicit returns
# this house style asks for. Enabling implicit_return without allowing
# needless_return makes the two lints contradict each other on every function.

set -u
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$DIR/config.sh"
CRATE_DIR=${1:-.}

[ "${ORES_LINT_SKIP_RUST}" = "1" ] && { echo "ores-lint[rust]: skipped (ORES_LINT_SKIP_RUST=1)"; exit 0; }
command -v cargo >/dev/null 2>&1 || { echo "ores-lint[rust]: cargo not found on PATH - skipping"; exit 0; }
cargo clippy --version >/dev/null 2>&1 || { echo "ores-lint[rust]: clippy not installed (rustup component add clippy) - skipping"; exit 0; }

LINTS="
-W clippy::implicit_return
-A clippy::needless_return
-A clippy::let_and_return
-W clippy::correctness
-W clippy::suspicious
-W clippy::await_holding_lock
-W clippy::unwrap_used
-W clippy::expect_used
-W clippy::panic_in_result_fn
-W clippy::todo
-W clippy::unimplemented
-W clippy::dbg_macro
-W clippy::mem_forget
-W clippy::float_cmp
-W clippy::lossy_float_literal
"
[ -n "${ORES_LINT_RUST_EXTRA:-}" ] && LINTS="$LINTS $ORES_LINT_RUST_EXTRA"

TARGETS=""
[ "${ORES_LINT_RUST_ALL_TARGETS}" = "1" ] && TARGETS="--all-targets"

OUT=$(mktemp) || exit 0
RC=0
# shellcheck disable=SC2086
( cd "$CRATE_DIR" && cargo clippy --workspace $TARGETS --message-format=short -- $LINTS ) >"$OUT" 2>&1 || RC=$?

# A non-zero cargo exit with no parseable diagnostics means clippy never ran
# (offline registry, broken manifest, missing toolchain). Say so plainly rather
# than reporting a clean crate.
if [ "$RC" -ne 0 ] && ! grep -q ': warning: \|: error: ' "$OUT"; then
  echo "ores-lint[rust]: clippy could not run in $CRATE_DIR (exit $RC). First lines:"
  sed -n '1,6p' "$OUT" | sed 's/^/  | /'
  rm -f "$OUT"; exit 0
fi

awk -v MAXEX="$ORES_LINT_MAX_EXAMPLES" -v TARGETMSG="$ORES_LINT_IMPLICIT_RETURN_MSG" '
BEGIN { max = MAXEX + 0; if (max < 1) max = 1; n = 0 }
match($0, /: (warning|error): /) {
  loc  = substr($0, 1, RSTART - 1)
  rest = substr($0, RSTART + 2)
  ci   = index(rest, ": ")
  sev  = substr(rest, 1, ci - 1)
  msg  = substr(rest, ci + 2)
  if (!(msg in count)) { order[++n] = msg; sev_of[msg] = sev }
  count[msg]++
  if (shown[msg] < max) { ex[msg] = ex[msg] (shown[msg]++ ? "\n" : "") "      " loc }
  next
}
END {
  if (n == 0) { print "ores-lint[rust]: clean"; exit 0 }
  total = 0
  for (i = 1; i <= n; i++) total += count[order[i]]
  printf "ores-lint[rust]: %d finding(s) across %d rule(s)\n", total, n
  for (pass = 1; pass <= 2; pass++) {
    for (i = 1; i <= n; i++) {
      msg = order[i]
      is_target = (msg == TARGETMSG)
      if ((pass == 1) != is_target) continue
      label = is_target ? "implicit return (ores house style)" : msg
      printf "\n  %s: %s\n", sev_of[msg], label
      if (is_target) printf "    prefer an explicit `return` at tail position\n"
      printf "    %d instance(s); showing %d:\n", count[msg], (count[msg] < max ? count[msg] : max)
      print ex[msg]
      if (count[msg] > max) printf "      ... and %d more\n", count[msg] - max
    }
  }
  print ""
}
' "$OUT"
rm -f "$OUT"
exit 0
