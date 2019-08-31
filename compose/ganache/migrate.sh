#!/bin/bash

function shutdownGanache() {
    echo "Killing existing Ganache CLI process $GANACHE_PID"
    kill -9 $GANACHE_PID
}

function startupGanache() {
    ganache-cli -d --networkId 2833 --db /var/ganache-cli/chaindata --account="0xF0F637DBBBB802D5DCEC6E7629F7AEE958235173222E8A5520DACCE760490CE6,1000000000000000000000000000" > /dev/null &
    export GANACHE_PID=$!
    echo "Started new Ganache CLI as process $GANACHE_PID"
}

startupGanache
echo "Preparing smart contracts..."
truffle migrate --reset --network development
shutdownGanache
echo "Smart Contract deployed"
