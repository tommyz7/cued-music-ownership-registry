#!/bin/bash

# set -e

# ganache-cli -d --networkId 2833 2> /dev/null 1> /dev/null
# # & sleep 5 # to make sure ganache-cli is up and running before compiling
# truffle migrate --reset --network development

# kill -9 $(lsof -t -i:8545)


# Helper script for starting/stopping ganache and running tests
#

function shutdownGanache() {
    # GANACHE_SEARCH="$(ps -ef | grep "[g]anache" | awk '{print $2}')"
    # echo "Ganche PID $(lsof -t -i:8545)"
    # export GANACHE_PID="${GANACHE_SEARCH}"
    # if [ "$GANACHE_PID" != "" ]
    # then
        echo "Killing existing Ganache CLI process $GANACHE_PID"
        kill -9 $GANACHE_PID
    # fi
}

function startupGanache() {
    # GANACHE_SEARCH="$(ps -ef | grep "[g]anache" | awk '{print $2}')"
    # echo "Ganche PID $(lsof -t -i:8545)"
    # export GANACHE_PID="${GANACHE_SEARCH}"
    # if [ "$GANACHE_PID" != "" ]
    # then
        # echo "Killing existing Ganache CLI process $GANACHE_PID"
        # kill -9 $GANACHE_PID

        ganache-cli -d --networkId 2833 --db /var/ganache-cli/chaindata > /dev/null &
        export GANACHE_PID=$!
        echo "Started new Ganache CLI as process $GANACHE_PID"
    # fi
}


startupGanache
#give ganache a bit to startup
sleep 2
truffle migrate --reset --network development
shutdownGanache
