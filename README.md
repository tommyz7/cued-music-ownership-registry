Music Smart Contracts - CUED Music smart contracts

-----------------------
## Commands
Run Ganache (dev blockchain) in deterministic mode:
`ganache-cli -d`

Compile smart contracts:
`truffle compile --all`

Run unit tests
`truffle test`

Migrate (deploy) smart contracts to given network (if `--network` omitted, development by default):
`truffle migrate --reset --network <network>`

For development on Rinkeby or Mainnet networks, wallet private key is taken from `MNEMONIC` environment variable.

Build Ganache-cli docker image with pre-deployed CUED smart contracts
`docker build -t cued_blockchain -f compose/ganache/Dockerfile .`
