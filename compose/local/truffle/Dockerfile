FROM node:8.14.0-alpine

RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh yarn python make g++ vim

RUN apk add -t .gyp --no-cache  \
    && npm install -g truffle \
    && apk del .gyp \
    && npm install nodemon -g \
    && git --version && bash --version && ssh -V && npm -v && node -v && yarn -v

RUN mkdir /log

# install smart-contracts dependencies
RUN mkdir -p /app
WORKDIR /app
COPY ./package.json /app/package.json
# when you have one, copy it as well
# COPY ./package-lock.json /app/package-lock.json
RUN npm install

EXPOSE 8080

# if we want to compile and migrate contracts on container start, uncomment below
# ENTRYPOINT ["npm", "run"]
CMD ["deploy"]
