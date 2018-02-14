FROM ubuntu:16.04

# ARGs
ARG ANDROID_SDK_URL="https://dl.google.com/android/repository/tools_r25.2.3-linux.zip"
ARG ANDROID_BUILD_TOOLS="build-tools-25.0.2"
ARG ANDROID_APIS="android-21,android-22,android-23,android-24,android-25"
ARG ANDROID_EXTRA_PACKAGES="extra-android-m2repository,extra-google-m2repository,extra-google-google_play_services"
ARG NPM_CONFIG_LOGLEVEL=error

# ENVs
ENV ANDROID_HOME /opt/android-sdk
ENV NODE_VERSION 8.9.3
ENV JAVA_HOME /usr/lib/jvm/java-8-openjdk-amd64
ENV PATH ${PATH}:${ANDROID_HOME}/tools:${ANDROID_HOME}/platform-tools
ENV NPM_CONFIG_LOGLEVEL=error

RUN dpkg --add-architecture i386 && \
    apt-get update && \
    apt-get install -y --no-install-recommends 	apt-transport-https build-essential curl g++ git gradle lib32z1 libc6 lib32ncurses5 lib32stdc++6 maven openjdk-8-jdk software-properties-common unzip usbutils && \
    rm -rf /var/lib/apt/lists/*

# install node 8.9.3
RUN groupadd --gid 1004 node && \
    useradd --uid 1004 --gid node --shell /bin/bash --create-home node && \
    set -ex && \
    for key in \
        94AE36675C464D64BAFA68DD7434390BDBE9B9C5 \
        FD3A5288F042B6850C66B31F09FE44734EB7990E \
        71DCFD284A79C3B38668286BC97EC7A07EDE3FC1 \
        DD8F2338BAE7501E3DD5AC78C273792F7D83545D \
        C4F0DFFF4E8C1A8236409D08E73BC641CC11F4C8 \
        B9AE9905FFD7803F25714661B63B535A4C206CA9 \
        56730D5401028683275BD23C23EFEFE93C4CFFFE \
        77984A986EBC2AA786BC0F66B01FBB92821C587A \
    ; do \
        gpg --keyserver pgp.mit.edu --recv-keys "$key" || \
        gpg --keyserver keyserver.pgp.com --recv-keys "$key" || \
        gpg --keyserver ha.pool.sks-keyservers.net --recv-keys "$key" ; \
    done && \
    ARCH= && dpkgArch="$(dpkg --print-architecture)" && \
    case "${dpkgArch##*-}" in \
        amd64) ARCH='x64';; \
        ppc64el) ARCH='ppc64le';; \
        s390x) ARCH='s390x';; \
        arm64) ARCH='arm64';; \
        armhf) ARCH='armv7l';; \
        i386) ARCH='x86';; \
    *) echo "unsupported architecture"; exit 1 ;; \
    esac \
    && curl -SLO "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-$ARCH.tar.xz" \
    && curl -SLO --compressed "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt.asc" \
    && gpg --batch --decrypt --output SHASUMS256.txt SHASUMS256.txt.asc \
    && grep " node-v$NODE_VERSION-linux-$ARCH.tar.xz\$" SHASUMS256.txt | sha256sum -c - \
    && tar -xJf "node-v$NODE_VERSION-linux-$ARCH.tar.xz" -C /usr/local --strip-components=1 --no-same-owner \
    && rm "node-v$NODE_VERSION-linux-$ARCH.tar.xz" SHASUMS256.txt.asc SHASUMS256.txt \
    && ln -s /usr/local/bin/node /usr/local/bin/nodejs					

# install android-sdk
RUN mkdir -p /tns /opt/android-sdk && \
    curl -o android-sdk.zip ${ANDROID_SDK_URL} && \
    unzip -q android-sdk.zip -d ${ANDROID_HOME} && \
    rm -f android-sdk.zip && \
    echo y | ${ANDROID_HOME}/tools/android update sdk --all --no-ui --filter platform-tools,${ANDROID_BUILD_TOOLS},${ANDROID_APIS},${ANDROID_EXTRA_PACKAGES}

# install nativescript
RUN useradd -m tns && \
    npm install nativescript -g --unsafe-perm && \
    tns error-reporting disable && \
    tns usage-reporting disable && \
    chown tns:tns -R ${ANDROID_HOME} /tns

# install docker cli
RUN apt-get --yes --force-yes --no-install-recommends update && \
    apt-get --yes --force-yes --no-install-recommends install apt-transport-https ca-certificates curl gnupg2 software-properties-common && \
    curl -fsSL https://download.docker.com/linux/$(. /etc/os-release; echo "$ID")/gpg | apt-key add -  && \
    add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/$(. /etc/os-release; echo "$ID") $(lsb_release -cs) stable" && \
    apt-get --yes --force-yes --no-install-recommends update && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get --yes --force-yes --no-install-recommends install docker-ce python make g++

# install AWS CLI
RUN curl "https://bootstrap.pypa.io/get-pip.py" -o "get-pip.py"  && \
    python get-pip.py && \
    pip install awscli --ignore-installed six

# install meteor, node-gyp, rimraf
RUN curl -sL https://install.meteor.com | sed s/--progress-bar/-sL/g | /bin/sh && \
    npm install -g node-gyp rimraf

# install smallstack cli
ADD . .

RUN npm install -g --unsafe-perm

# clear apt cache
RUN apt-get clean && \
    rm -rf /var/lib/apt/lists/*