FROM node:10.16-alpine

RUN apk update && apk upgrade && \
    apk add --no-cache python make g++ git

ENV MNEMONIC skip

RUN mkdir /log
RUN mkdir -p /app

WORKDIR /app

COPY ./package.json /app

RUN npm config set user 0
RUN npm config set unsafe-perm true
RUN npm install -g truffle@5.0.24
RUN npm install
RUN truffle version

COPY . /app
