FROM node:8

RUN mkdir ~/coreum-truffle
WORKDIR ~/coreum-truffle
RUN npm install -g truffle
COPY . .
RUN npm install
