var MusicRegistry = artifacts.require("./MusicRegistry.sol");
var ProxyFactory = artifacts.require("./ProxyFactory.sol");
var OwnershipRoyaltiesAgreements = artifacts.require("./OwnershipRoyaltiesAgreements.sol");
var EthereumDIDRegistry = artifacts.require("./EthereumDIDRegistry.sol");

module.exports = async function(deployer, network, accounts) {
  // let musicRegistry = await MusicRegistry.deployed();
  // let ownershipContract = await OwnershipRoyaltiesAgreements.deployed();
  // let proxyFactory = await ProxyFactory.deployed();
  // let didReg = await EthereumDIDRegistry.deployed();

  // console.log('Setting _owner, _registry, _implementation for ProxyFactory');
  // let tx = await proxyFactory.contract.methods.init(accounts[0], musicRegistry.address, ownershipContract.address).send({from: accounts[0], gas: 2000000});
  // console.log('Setting ethDIDAddress, factory for MusicRegistry');
  // tx = await musicRegistry.contract.methods.init(didReg.address, proxyFactory.address).send({from: accounts[0], gas: 2000000});
};
