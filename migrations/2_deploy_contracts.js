var EthereumDIDRegistry = artifacts.require("./EthereumDIDRegistry.sol");
var MusicRegistry = artifacts.require("./MusicRegistry.sol");
var MusicLib = artifacts.require("./library/MusicLib.sol");
var ProxyFactory = artifacts.require("./ProxyFactory.sol");
var OwnershipRoyaltiesAgreements = artifacts.require("./OwnershipRoyaltiesAgreements.sol");


module.exports = async function(deployer) {
  await deployer.deploy(EthereumDIDRegistry);
  await deployer.deploy(MusicLib);
  let ml = await MusicLib.deployed();
  MusicRegistry.link("MusicLib", ml.address);
  await deployer.deploy(MusicRegistry);
  await deployer.deploy(ProxyFactory);
  await deployer.deploy(OwnershipRoyaltiesAgreements);
};
