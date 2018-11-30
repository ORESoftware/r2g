FROM node:10

RUN apt-get -y update
RUN apt-get -y install sudo
RUN sudo apt-get -y update
RUN apt-get install -y netcat
RUN apt-get install -y rsync

RUN sudo echo "node ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

ENV FORCE_COLOR=1
ENV docker_r2g_in_container=yes
ENV MY_DOCKER_R2G_SEARCH_ROOT="/home/node"

USER node
ENV USER="node"
ENV HOME="/home/node"
RUN mkdir -p /home/node/.docker_r2g_cache
RUN mkdir -p /home/node/app/node_modules
WORKDIR /home/node/app

RUN sudo chmod -R 777  /home/node
RUN sudo chown -R $(whoami) $(npm config get prefix)/lib
RUN sudo chown -R $(whoami) $(npm config get prefix)/lib/node_modules
RUN sudo chown -R $(whoami) $(npm config get prefix)/bin
RUN sudo chown -R $(whoami) $(npm config get prefix)/share
RUN sudo chown -R $(whoami) /usr/local/lib
RUN sudo chown -R $(whoami) /usr/local/etc

RUN npm set unsafe-perm true
RUN npm set cache-min 9999999
RUN npm set progress=false

ARG CACHEBUST=1

# RUN npm install --loglevel=warn -g \
#  "https://raw.githubusercontent.com/oresoftware/tarballs/master/tgz/oresoftware/npm.cache.tgz?$(date +%s)"
#
# COPY package.json .
# COPY .r2g .r2g
# RUN update_npm_cache

RUN npm i -s -g "@oresoftware/r2g.docker@latest"
RUN npm i -s -g "@oresoftware/r2g@latest"

COPY . .

RUN sudo chmod -R 777  /home/node

ENTRYPOINT dkr2g run --allow-unknown

