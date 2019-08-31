#!/bin/sh

# If an error occurs during migrations, cancel script
set -e

# Run database migratiosn
/bin/sh /app/compose/ganache/migrate.sh

# Start ganache-cli process
ganache-cli -d --networkId 2833 --db /var/ganache-cli/chaindata --account="0xF0F637DBBBB802D5DCEC6E7629F7AEE958235173222E8A5520DACCE760490CE6,1000000000000000000000000000"
