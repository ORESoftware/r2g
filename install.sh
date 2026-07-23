#!/usr/bin/env sh
set -eu

repo="${R2G_GITHUB_REPOSITORY:-ORESoftware/r2g}"
version="${R2G_VERSION:-${1:-latest}}"

command -v curl >/dev/null 2>&1 || { printf 'r2g installer requires curl\n' >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { printf 'r2g installer requires Node.js and npm\n' >&2; exit 1; }

if [ "$version" = "latest" ]; then
  version="$(curl -fsSL "https://api.github.com/repos/$repo/releases/latest" |
    sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' |
    head -n 1)"
fi

case "$version" in
  v*) tag="$version"; bare="${version#v}" ;;
  *) tag="v$version"; bare="$version" ;;
esac

[ -n "$bare" ] || { printf 'could not resolve an r2g release version\n' >&2; exit 1; }

asset="r2g-$bare.tgz"
base="https://github.com/$repo/releases/download/$tag"
tmp="$(mktemp -d "${TMPDIR:-/tmp}/r2g-install.XXXXXX")"
trap 'rm -rf "$tmp"' EXIT HUP INT TERM

curl -fsSL "$base/$asset" -o "$tmp/$asset"
curl -fsSL "$base/$asset.sha256" -o "$tmp/$asset.sha256"

if command -v sha256sum >/dev/null 2>&1; then
  (cd "$tmp" && sha256sum -c "$asset.sha256")
elif command -v shasum >/dev/null 2>&1; then
  expected="$(awk '{print $1}' "$tmp/$asset.sha256")"
  actual="$(shasum -a 256 "$tmp/$asset" | awk '{print $1}')"
  [ "$expected" = "$actual" ] || { printf 'r2g checksum verification failed\n' >&2; exit 1; }
else
  printf 'r2g installer requires sha256sum or shasum for verification\n' >&2
  exit 1
fi

npm install --global "$tmp/$asset"
printf 'r2g %s installed successfully\n' "$bare"
