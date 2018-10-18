<img src="https://truffleframework.com/img/truffle-logo-dark.svg" width="200">

-----------------------


Truffle is a development environment, testing framework and asset pipeline for Ethereum, aiming to make life as an Ethereum developer easier. With Truffle, you get:

Built-in smart contract compilation, linking, deployment and binary management.
Automated contract testing with Mocha and Chai.
Configurable build pipeline with support for custom build processes.
Scriptable deployment & migrations framework.
Network management for deploying to many public & private networks.
Interactive console for direct contract communication.
Instant rebuilding of assets during development.
External script runner that executes scripts within a Truffle environment.


## Setup
- Build the image

`docker-compose -f local.yml build`
- Run docker container

`docker-compose -f local.yml up`
- Enter container terminal

`docker exec -it musicsmartcontracts_truffle_1 sh`
