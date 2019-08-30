FROM trufflesuite/ganache-cli:v6.6.0

RUN apk update && apk upgrade && \
    apk add --no-cache python make g++ git

ENV MNEMONIC skip

RUN mkdir /log
RUN mkdir -p /var/ganache-cli/chaindata
RUN mkdir -p /app

WORKDIR /app

COPY ./package.json /app

RUN npm config set user 0
RUN npm config set unsafe-perm true
RUN npm install -g ganache-cli@6.6.0
RUN npm install -g truffle@5.0.24
RUN npm install
RUN truffle version

COPY . /app
ENV DOCKER true

EXPOSE 8545

RUN sh ./compose/ganache/migrate.sh
ENTRYPOINT ["node", "/app/ganache-core.docker.cli.js"]
