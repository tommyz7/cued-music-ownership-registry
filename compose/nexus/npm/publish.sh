mkdir -p compose/nexus/npm/build/contracts
cp build/contracts/EthereumDIDRegistry.json compose/nexus/npm/build/contracts/EthereumDIDRegistry.json
cp build/contracts/MusicRegistry.json compose/nexus/npm/build/contracts/MusicRegistry.json
cp build/contracts/OwnershipRoyaltiesAgreements.json compose/nexus/npm/build/contracts/OwnershipRoyaltiesAgreements.json

cd ./compose/nexus/npm/
cp .npmrc /root/.npmrc
npm publish
