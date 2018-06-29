#!/usr/bin/env bash


dir_name="$(dirname "$0")"
read_link="$(readlink "$0")";
exec_dir="$(dirname $(dirname "$read_link"))";
my_path="$dir_name/$exec_dir";
basic_path="$(cd $(dirname ${my_path}) && pwd)/$(basename ${my_path})"
commands="$basic_path/dist/commands"

if ! type -f read_json; then
  npm i -g -s '@oresoftware/read.json' || {
     echo "Could not install @oresoftware/read.json";
     exit 1;
  }
fi


project_root="$(r2g_get_project_root)"
package_name="$(read_json "$project_root/package.json" name)"

if [[ -z "$project_root" ]]; then
 echo "Could not find an NPM project root given your pwd: $PWD";
 exit 1;
fi

cd "$project_root";
npm install --loglevel=warn

symlinkable="$HOME/.r2g/temp/symlinkable"
mkdir -p "$symlinkable";
rm -rf "$symlinkable";
mkdir -p "$symlinkable";

packable="$HOME/.r2g/temp/packable";
mkdir -p "$packable";
rm -rf "$packable";
mkdir -p "$packable";

rsync -r --exclude="node_modules" "$project_root" "$packable"

base_name="$(basename "$project_root")"

(
     set -e;
     cd "$project_root/$base_name";
     pack="$(npm pack)"
     full_pack_path="$project_root/$base_name/$pack";
     cd "$symlinkable";
     npm init --silent -f
     npm install --loglevel=warn "$full_pack_path";
)


package_dir="$project_root/node_modules/$package_name";

mkdir -p "$package_dir";
rm -rf "$package_dir";


ln -sf "$symlinkable/node_modules/$package_name" "$package_dir"
