#!/usr/bin/env bash


set -e;
my_cwd="$PWD";

mkdir -p "$HOME/.r2g"

if [[ -f package.json ]]; then
   root="$(node "$HOME/.r2g/node/find-root.js")"
   if [[ -z "$root" ]]; then
     echo "You are not within an NPM project.";
     exit 1;
   fi

fi

result="$(npm pack)"
if [[ -z "$result" ]]; then
    echo "NPM pack command did not appear to yield a .tgz file.";
    exit 1;
fi

tgz_path="$my_cwd/$result";

rm -rf "$HOME/.r2g/temp"
mkdir -p "$HOME/.r2g/temp/project"
dest="$HOME/.r2g/temp/project"

copy_test="$(node "$HOME/.r2g/node/axxel.js" package.json 'scripts.r2g-copy-tests')"

if [[ -z "$copy_test" ]]; then
    echo "No NPM script named 'r2g-copy-tests' in your package.json file.";
    exit 1;
fi

run_test="$(node "$HOME/.r2g/node/axxel.js" package.json 'scripts.r2g-run-tests')"

if [[ -z "$copy_test" ]]; then
    echo "No NPM script named 'r2g-run-tests' in your package.json file.";
    exit 1;
fi

(
  set -e;
  cd "$dest";
  ( npm init -f ) &> /dev/null;
  npm install "$tgz_path";
)

# run the user's copy command
echo "$copy_test" | bash;

# run the tests
cd "$dest";
echo "$run_test" | bash;
