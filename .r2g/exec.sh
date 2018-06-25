#!/usr/bin/env bash

set -e;

if [ ! -f package.json ]; then
  echo "there is no package.json file in your PWD." >&2;
  false; // since there is no package.json file, probably should abort here
fi


map="$docker_r2g_fs_map"
search_root="$docker_r2g_search_root"
shared="$docker_r2g_shared_dir";
name="$docker_r2g_package_name"  # your project's package.json name field
base_image="node:$r2g_node_version"


container="docker_r2g.$name";
docker stop "$container" || echo "no container with name $container running."
docker rm "$container" || echo "no container with name $container could be removed."

tag="docker_r2g_image/$name";

export zmx_gray='\033[1;30m'
export zmx_magenta='\033[1;35m'
export zmx_cyan='\033[1;36m'
export zmx_orange='\033[1;33m'
export zmx_yellow='\033[1;33m'
export zmx_green='\033[1;32m'
export zmx_no_color='\033[0m'

zmx(){
    local v1="$1"; local v2="$2"; "$@"  \
        2> >( while read line; do echo -e "${zmx_magenta}[${v1} ${v2}] ${zmx_no_color} $line"; done ) \
        1> >( while read line; do echo -e "${zmx_gray}[${v1} ${v2}] ${zmx_no_color} $line"; done )
}

export -f zmx;

docker build \
    -f Dockerfile.r2g \
    -t "$tag" \
    --build-arg base_image="$base_image" \
    --build-arg CACHEBUST="$(date +%s)" .


docker run \
    -v "$search_root:$shared:ro"  \
    -e docker_r2g_fs_map="$map" \
    -e r2g_container_id="$container" \
    --entrypoint "dkr2g" \
    --name "$container" "$tag" \
      run --allow-unknown "$@"



## to debug:
# docker exec -ti <container-name> /bin/bash
