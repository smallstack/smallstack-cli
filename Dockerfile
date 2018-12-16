FROM ubuntu:16.04

RUN dpkg --add-architecture i386 && \
  apt-get update && \
  apt-get install -y --no-install-recommends 	apt-transport-https \
  build-essential \
  curl \
  g++ \
  git \
  lib32z1 \
  libc6 \
  lib32ncurses5 \
  lib32stdc++6 \
  software-properties-common \
  unzip \
  usbutils \
  dirmngr \
  wget

# install node 8.9.3
RUN groupadd --gid 1004 node \
  && useradd --uid 1004 --gid node --shell /bin/bash --create-home node

RUN set -ex \
  && for key in \
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
  done

ENV NODE_VERSION 8.9.3

RUN ARCH= && dpkgArch="$(dpkg --print-architecture)" \
  && case "${dpkgArch##*-}" in \
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

RUN apt-get clean && \
  rm -rf /var/lib/apt/lists/*


# install docker cli
RUN apt-get --yes --force-yes update
RUN apt-get --yes --force-yes install apt-transport-https ca-certificates curl gnupg2 software-properties-common
RUN curl -fsSL https://download.docker.com/linux/$(. /etc/os-release; echo "$ID")/gpg | apt-key add -
RUN add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/$(. /etc/os-release; echo "$ID") $(lsb_release -cs) stable"
RUN apt-get --yes --force-yes update
RUN apt-get --yes --force-yes install docker-ce
RUN apt-get --yes --force-yes install python make g++

# install AWS CLI
RUN curl "https://bootstrap.pypa.io/get-pip.py" -o "get-pip.py"
RUN python get-pip.py
RUN pip install awscli --ignore-installed six

# install rancher CLI
RUN wget https://releases.rancher.com/cli2/v2.0.6/rancher-linux-amd64-v2.0.6.tar.gz
RUN tar -xvzf rancher-linux-amd64-v2.0.6.tar.gz
RUN cp ./rancher-v2.0.6/rancher /usr/local/bin
RUN rancher -v

# install kubectl
RUN curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add -
RUN echo "deb https://apt.kubernetes.io/ kubernetes-xenial main" | tee -a /etc/apt/sources.list.d/kubernetes.list
RUN apt-get update
RUN apt-get install -y kubectl

# install meteor
RUN curl -sL https://install.meteor.com | sed s/--progress-bar/-sL/g | /bin/sh

# install node-gyp
RUN npm install -g node-gyp

# install rimraf
RUN npm install -g rimraf

# install smallstack cli
ADD . .
ARG NPM_CONFIG_LOGLEVEL=error
ENV NPM_CONFIG_LOGLEVEL=error
RUN npm install -g --unsafe-perm