cp -r build ./compose/production/nexus/npm/
cd ./compose/production/nexus/npm/
cp .npmrc /root/.npmrc
npm publish
