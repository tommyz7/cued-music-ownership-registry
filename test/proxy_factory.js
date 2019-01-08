import { shouldBehaveLikeProxyFactory } from './proxy_factory.behaviour.js';
import { getEvent } from './utils.js';
var ProxyFactory = artifacts.require("./ProxyFactory.sol");
var OwnershipRoyaltiesAgreements = artifacts.require("./mock/OwnershipRoyaltiesAgreementsPublic.sol");
var EthereumDIDRegistry = artifacts.require("./EthereumDIDRegistry.sol")
var AdminUpgradeabilityProxy = artifacts.require("./AdminUpgradeabilityProxy.sol")

contract("ProxyFactory", (accounts) => {
  let Setup = {}

  before("deploy Registry, Implementation and ProxyFactory", async () => {
    Setup.admin = accounts[0];
    Setup.originalOwner = accounts[1];
    Setup.proxyAdmin = accounts[2];
    Setup.newProxyAdmin = accounts[5];
    Setup.fakeOwner = accounts[4];
    Setup.registry = accounts[3];
    Setup.accounts = accounts;

    Setup.ethDIDReg = await EthereumDIDRegistry.new();

    Setup.implementation = await OwnershipRoyaltiesAgreements.new({from: Setup.admin});
    Setup.implementation = new web3.eth.Contract(
      Setup.implementation.abi,
      Setup.implementation.address,
      {from: Setup.admin}
    );

    Setup.wrongImplementation = await OwnershipRoyaltiesAgreements.new({from: Setup.admin});
    Setup.wrongImplementation = new web3.eth.Contract(
      Setup.wrongImplementation.abi,
      Setup.wrongImplementation.address,
      {from: Setup.admin}
    );

    Setup.proxyFactory = await ProxyFactory.new({from: Setup.admin});
    Setup.proxyFactory = new web3.eth.Contract(
      Setup.proxyFactory.abi,
      Setup.proxyFactory.address,
      {from: Setup.admin}
    );

    Setup.initialTX = await Setup.proxyFactory.methods.init(
      Setup.originalOwner,
      Setup.registry,
      Setup.wrongImplementation.options.address
    ).send({gas: 300000});
  });

  beforeEach("deploy new proxy contract", async () => {
    let tx = await Setup.proxyFactory.methods.deploy(Setup.proxyAdmin, '0x')
      .send({from: Setup.registry, gas: 500000});

    let ProxyDeploy = getEvent(tx, 'ProxyDeploy');
    Setup.newAdminUpgradeabilityProxy = new web3.eth.Contract(
      AdminUpgradeabilityProxy._json.abi,
      ProxyDeploy.proxy,
      {from: Setup.admin}
    );
  })

  shouldBehaveLikeProxyFactory(Setup);
})
