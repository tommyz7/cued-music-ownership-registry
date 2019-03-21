var MusicRegistry = artifacts.require("./MusicRegistry.sol");
var ProxyFactory = artifacts.require("./ProxyFactory.sol");
var OwnershipRoyaltiesAgreements = artifacts.require("./OwnershipRoyaltiesAgreements.sol");
var EthereumDIDRegistry = artifacts.require("./EthereumDIDRegistry.sol");

module.exports = async function(deployer, network, accounts) {
  let mr = await MusicRegistry.deployed();
  let ora = await OwnershipRoyaltiesAgreements.deployed();
  let pf = await ProxyFactory.deployed();
  let er = await EthereumDIDRegistry.deployed();

  let tx = await pf.contract.methods.init(accounts[0], mr.address, ora.address).send({from: accounts[0], gas: 2000000});
  console.log(tx);
  tx = await mr.contract.methods.init(er.address, pf.address).send({from: accounts[0], gas: 2000000});
  console.log(tx);
};
