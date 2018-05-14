FROM node:9

RUN apt-get -y update
RUN apt-get -y install sudo
RUN sudo apt-get -y update
RUN apt-get install -y netcat

RUN sudo echo "newuser ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

RUN useradd -ms /bin/bash newuser
USER newuser
ENV HOME=/home/newuser
WORKDIR /home/newuser

RUN mkdir -p "$HOME/.npm-global"
ENV NPM_CONFIG_PREFIX="$HOME/.npm-global"
#RUN npm config set prefix "$HOME/.npm-global"
ENV PATH="$HOME/.npm-global/bin:$PATH"

RUN sudo chown -R $(whoami) "$HOME/.npm-global"
RUN  npm install -g typescript

COPY package.json .
RUN npm install --loglevel=warn

#RUN sudo chown -R $(whoami) "$HOME/.npm-global"


ENV PATH="./node_modules/.bin:${PATH}"

RUN echo "our user is $USER";

COPY . .
RUN tsc


ENTRYPOINT ["./test/index.sh"]
#ENTRYPOINT ["r2g"]
