FROM node:8.14.0-alpine

RUN apk update && apk upgrade && \
    apk add --no-cache python make g++ git

ENV MNEMONIC skip

RUN mkdir /log
RUN mkdir -p /app

WORKDIR /app
COPY . /app

RUN npm config set user 0
RUN npm config set unsafe-perm true
RUN npm install -g truffle@beta
RUN npm install
RUN truffle version
