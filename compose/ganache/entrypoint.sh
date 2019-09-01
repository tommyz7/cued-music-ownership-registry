#!/bin/sh

# If an error occurs during migrations, cancel script
set -e

function shutdownGanache() {
    echo "Killing existing Ganache CLI process $GANACHE_PID"
    kill -9 $GANACHE_PID
}

function startupGanache() {
    node /app/ganache-core.docker.cli.js -d cued --networkId 2833 --db /var/ganache-cli/chaindata > /dev/null &
    export GANACHE_PID=$!
    echo "Started new Ganache CLI as process $GANACHE_PID"
}

startupGanache
echo "Preparing smart contracts..."
truffle migrate --reset --network development
shutdownGanache
echo "Smart Contract deployed"

# Start ganache-cli process
node /app/ganache-core.docker.cli.js -d cued --blockTime 5 --networkId 2833 --db /var/ganache-cli/chaindata
