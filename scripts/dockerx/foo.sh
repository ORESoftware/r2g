#!/usr/bin/env bash

docker stop ts-project;
docker rm ts-project
docker build -t ts-project .
docker run -it -v "$HOME":/host_user_home:ro --name ts-project ts-project
