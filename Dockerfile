FROM node:6.11.3-alpine

# install docker cli
RUN apk add --no-cache \
		ca-certificates

ENV DOCKER_CHANNEL stable
ENV DOCKER_VERSION 17.06.2-ce
RUN set -ex; \
	apk add --no-cache --virtual .fetch-deps \
		curl \
		tar \
	; \
	\
	apkArch="$(apk --print-arch)"; \
	case "$apkArch" in \
		x86_64) dockerArch='x86_64' ;; \
		s390x) dockerArch='s390x' ;; \
		*) echo >&2 "error: unsupported architecture ($apkArch)"; exit 1 ;;\
	esac; \
	\
	if ! curl -fL -o docker.tgz "https://download.docker.com/linux/static/${DOCKER_CHANNEL}/${dockerArch}/docker-${DOCKER_VERSION}.tgz"; then \
		echo >&2 "error: failed to download 'docker-${DOCKER_VERSION}' from '${DOCKER_CHANNEL}' for '${dockerArch}'"; \
		exit 1; \
	fi; \
	\
	tar --extract \
		--file docker.tgz \
		--strip-components 1 \
		--directory /usr/local/bin/ \
	; \
	rm docker.tgz; \
	\
	apk del .fetch-deps; \
	\
	dockerd -v; \
	docker -v


# install smallstack cli
ARG NPM_CONFIG_LOGLEVEL=error
ENV NPM_CONFIG_LOGLEVEL=error
RUN apk update
RUN apk add --no-cache python make g++ curl bash
RUN mkdir /home/cli
WORKDIR /home/cli
ADD . .
RUN npm install -g
WORKDIR /home