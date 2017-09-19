FROM node:6.11.3

# install docker cli
RUN apt-get --yes --force-yes update
RUN apt-get --yes --force-yes install apt-transport-https ca-certificates curl gnupg2 software-properties-common
RUN curl -fsSL https://download.docker.com/linux/$(. /etc/os-release; echo "$ID")/gpg | apt-key add -
RUN add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/$(. /etc/os-release; echo "$ID") $(lsb_release -cs) stable"
RUN apt-get --yes --force-yes update
RUN apt-get --yes --force-yes install docker-ce


# install smallstack cli
ARG NPM_CONFIG_LOGLEVEL=error
ENV NPM_CONFIG_LOGLEVEL=error
RUN apt-get --yes --force-yes install python make g++
RUN mkdir /home/cli
WORKDIR /home/cli
ADD . .
RUN npm install -g
WORKDIR /home