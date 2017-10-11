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

# install android
RUN apt-get install openjdk-7-jdk lib32stdc++6 lib32z1 wget
RUN wget http://dl.google.com/android/android-sdk_r24.2-linux.tgz
RUN tar -xvf android-sdk_r24.2-linux.tgz
RUN cd android-sdk-linux/tools
RUN ./android update sdk --no-ui
ENV PATH="/home/android-sdk-linux/tools:/home/android-sdk-linux/platform-tools:${PATH}"
ENV ANDROID_HOME=/home/android-sdk-linux

# install nativescript
RUN npm install -g nativescript