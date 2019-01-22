# replace local truffle v4 with global v5 - not sure why but it's necessary
rm /app/node_modules/.bin/truffle
ln -s /usr/local/bin/truffle /app/node_modules/.bin/truffle
truffle version
truffle test --network development
