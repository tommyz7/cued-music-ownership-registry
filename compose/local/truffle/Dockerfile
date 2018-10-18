FROM node:8.7.0-alpine

RUN apk add -t .gyp --no-cache git python g++ make vim \
    && npm install -g truffle \
    && apk del .gyp \
    && npm install nodemon -g

RUN mkdir /log

# install smart-contracts dependencies
RUN mkdir -p /app
WORKDIR /app
COPY ./package.json /app/package.json
# COPY ./package-lock.json /app/package-lock.json
RUN npm install

EXPOSE 8080

# if we want to compile and migrate contracts on container start, uncomment below
# ENTRYPOINT ["npm", "run"]
# CMD ["deploy"]
