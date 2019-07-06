#!/bin/bash

function shutdownGanache() {
    echo "Killing existing Ganache CLI process $GANACHE_PID"
    kill -9 $GANACHE_PID
}

function startupGanache() {
    ganache-cli -d --networkId 2833 --db /var/ganache-cli/chaindata > /dev/null &
    export GANACHE_PID=$!
    echo "Started new Ganache CLI as process $GANACHE_PID"
}


startupGanache
#give ganache a bit to startup
sleep 2
truffle migrate --reset --network development
shutdownGanache
