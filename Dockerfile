FROM node:7.10

RUN mkdir /home/cli
WORKDIR /home/cli
ADD . .
RUN npm install -g
WORKDIR /home