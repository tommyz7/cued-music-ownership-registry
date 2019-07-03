const { expectRevert } = require('openzeppelin-test-helpers');
import { IpfsHash, ZERO_ADDRESS, stripHexPrefix, getEvent, printGas } from './utils.js';
import { shouldBehaveLikeInit, shouldBehaveLikeOwnershipRoyaltiesAgreements } from './ownership_royalties_agreements.behaviour.js';

var AdminUpgradeabilityProxy = artifacts.require("./AdminUpgradeabilityProxy.sol")
var OwnershipRoyaltiesAgreements = artifacts.require("./mock/OwnershipRoyaltiesAgreementsPublic.sol");
var UpgradedOwnershipRoyaltiesAgreementsPublic = artifacts.require("./mock/UpgradedOwnershipRoyaltiesAgreementsPublic.sol");

function shouldBehaveLikeProxyFactory (Setup) {
  describe("init()", () => {
    it("should set owner, registry and implementation address", async () => {
      let roleOwner = await Setup.proxyFactory.methods.hasRole(
        Setup.originalOwner, "owner").call();
      assert.equal(roleOwner, true);

      let roleRegistry = await Setup.proxyFactory.methods.hasRole(
        Setup.registry, "registry").call();
      assert.equal(roleRegistry, true);

      let RoleAdded0 = getEvent(Setup.initialTX, 'RoleAdded', 0);
      assert.equal(RoleAdded0.operator, Setup.originalOwner, "operator incorrect");
      assert.equal(RoleAdded0.role, "owner", "role incorrect");

      let RoleAdded1 = getEvent(Setup.initialTX, 'RoleAdded', 1);
      assert.equal(RoleAdded1.operator, Setup.registry, "operator incorrent");
      assert.equal(RoleAdded1.role, "registry", "role incorrent");

      let impl = await Setup.proxyFactory.methods.implementation().call();
      assert.equal(impl, Setup.wrongImplementation.options.address);
    });

    it("should revert() when run init() again", async () => {
      await expectRevert.unspecified(Setup.proxyFactory.methods.init(
        Setup.originalOwner,
        Setup.registry,
        Setup.wrongImplementation.options.address
      ).send({gas: 300000}));
    });
  })

  describe("setImplementation()", () => {
    it("should set implementation to new address", async () => {
      let tx = await Setup.proxyFactory.methods.setImplementation(
        Setup.implementation.options.address
      ).send({from: Setup.originalOwner, gas: 300000});
      printGas(tx, "Set implementation", 6);

      let ImplementationUpdate = getEvent(tx, 'ImplementationUpdate');
      assert.equal(ImplementationUpdate.oldImpl, Setup.wrongImplementation.options.address);
      assert.equal(ImplementationUpdate.newImpl, Setup.implementation.options.address);

      let impl = await Setup.proxyFactory.methods.implementation().call();
      assert.equal(impl, Setup.implementation.options.address);

    });

    it("should revert() if not called by owner", async () => {
      await expectRevert.unspecified(Setup.proxyFactory.methods.setImplementation(
        Setup.implementation.options.address
      ).send({from: Setup.admin}));
    });
  })

  describe("deploy()", () => {
    it("should deploy new proxy", async () => {
      let tx = await Setup.proxyFactory.methods.deploy(Setup.proxyAdmin, '0x')
        .send({from: Setup.registry, gas: 500000});
      printGas(tx, "Deploy new proxy", 6);

      let ProxyDeploy = getEvent(tx, 'ProxyDeploy');
      assert.notEqual(ProxyDeploy.proxy, ZERO_ADDRESS);
      assert.equal(ProxyDeploy.admin, Setup.proxyAdmin);
      assert.equal(ProxyDeploy.sender, Setup.registry);
    });

    it("should deploy new proxy and call init", async () => {
      const data = Setup.implementation.methods.init(
        Setup.originalOwner,
        Setup.ethDIDReg.address
      ).encodeABI();

      Setup.initialTX = await Setup.proxyFactory.methods.deploy(Setup.proxyAdmin, data)
        .send({from: Setup.registry, gas: 700000});
      printGas(Setup.initialTX, "Deploy new proxy and call init", 6);

      let ProxyDeploy = getEvent(Setup.initialTX, 'ProxyDeploy');
      assert.notEqual(ProxyDeploy.proxy, ZERO_ADDRESS);
      assert.equal(ProxyDeploy.admin, Setup.proxyAdmin);
      assert.equal(ProxyDeploy.sender, Setup.registry);

      Setup.ownershipContractConstant = new web3.eth.Contract(
        OwnershipRoyaltiesAgreements._json.abi,
        ProxyDeploy.proxy,
        {from: Setup.admin}
      );

      shouldBehaveLikeInit(Setup);
    });

    it("should revert() deploy if not called by registry", async () => {
      await expectRevert.unspecified(Setup.proxyFactory.methods.deploy(Setup.proxyAdmin, '0x')
        .send({from: Setup.fakeOwner, gas: 500000}));
    });
  });

  describe("AdminUpgradeabilityProxy", () => {
    it("should change proxy admin", async () => {
      let tx = await Setup.newAdminUpgradeabilityProxy.methods.changeAdmin(
        Setup.newProxyAdmin
      ).send({from: Setup.proxyAdmin, gas: 50000});
      printGas(tx, "Change proxy admin", 6);

      let AdminChanged = getEvent(tx, 'AdminChanged');
      assert.equal(AdminChanged.previousAdmin, Setup.proxyAdmin);
      assert.equal(AdminChanged.newAdmin, Setup.newProxyAdmin);

      let newAdmin = await Setup.newAdminUpgradeabilityProxy.methods.admin()
        .call({from: Setup.newProxyAdmin});
      assert.equal(newAdmin, Setup.newProxyAdmin);
    });

    it("should upgrade implementation to new version", async () => {
      let upgradeImpl = await UpgradedOwnershipRoyaltiesAgreementsPublic.new();

      let upgradedOwnershipContract = new web3.eth.Contract(
        UpgradedOwnershipRoyaltiesAgreementsPublic._json.abi,
        Setup.newAdminUpgradeabilityProxy.options.address,
        {from: Setup.proxyAdmin}
      );

      await expectRevert.unspecified(upgradedOwnershipContract.methods.getHashOfNumber(10).call());

      let tx = await Setup.newAdminUpgradeabilityProxy.methods.upgradeTo(
        upgradeImpl.address
      ).send({from: Setup.proxyAdmin, gas: 50000});
      printGas(tx, "Upgrade to new implementation", 6);

      let Upgraded = getEvent(tx, 'Upgraded');
      assert.equal(Upgraded.implementation, upgradeImpl.address);

      let result = await upgradedOwnershipContract.methods.getHashOfNumber(10).call();
      assert.equal(web3.utils.soliditySha3({t: 'uint', v: 10}), result);
    });

    it("should upgrade implementation to new version and call init()", async () => {
      let upgradeImpl = await UpgradedOwnershipRoyaltiesAgreementsPublic.new();

      let upgradedOwnershipContract = new web3.eth.Contract(
        UpgradedOwnershipRoyaltiesAgreementsPublic._json.abi,
        upgradeImpl.address,
        {from: Setup.proxyAdmin}
      );

      const data = upgradedOwnershipContract.methods.init(
        Setup.originalOwner,
        Setup.ethDIDReg.address
      ).encodeABI();

      Setup.initialTX = await Setup.newAdminUpgradeabilityProxy.methods.upgradeToAndCall(
        upgradeImpl.address,
        data
      ).send({from: Setup.proxyAdmin, gas: 250000});
      printGas(Setup.initialTX, "Upgrade to new implementation and call init", 6);

      Setup.ownershipContractConstant = new web3.eth.Contract(
        UpgradedOwnershipRoyaltiesAgreementsPublic._json.abi,
        Setup.newAdminUpgradeabilityProxy.options.address,
        {from: Setup.admin}
      );

      shouldBehaveLikeInit(Setup);
    });
  })

  describe("deployed proxy should behave like OwnershipRoyaltiesAgreements smart contract", () => {
    let accountsPrivate = [];
    Setup.owner = [];
    Setup.contributor = [];

    for (var i = 0; i < 10; i++) {
      accountsPrivate[i] = web3.eth.accounts.create();
    }

    for (var i = 0; i < 10; i++) {
      Setup.owner[i] = web3.eth.accounts.create();
    }

    for (var i = 0; i < 10; i++) {
      Setup.contributor[i] = web3.eth.accounts.create();
    }

    before("deploy EthereumDIDRegistry & OwnershipRoyaltiesAgreements", async () => {
      Setup.admin = Setup.accounts[0];
      Setup.identity = Setup.accounts[1];
      Setup.identityNew = Setup.accounts[2];
      Setup.originalOwner = accountsPrivate[1];
      Setup.owner1 = accountsPrivate[2];
      Setup.owner2 = accountsPrivate[3];
      Setup.contributor1 = accountsPrivate[4];
      Setup.contributor2 = accountsPrivate[5];
      Setup.contributor3 = accountsPrivate[6];
      Setup.revokedOwner1 = accountsPrivate[7];
      Setup.revokedOwner2 = accountsPrivate[8];

      Setup.initialTX = await Setup.proxyFactory.methods.deploy(Setup.admin, '0x')
        .send({from: Setup.registry, gas: 700000});

      Setup.ownershipContractConstant = new web3.eth.Contract(
        OwnershipRoyaltiesAgreements._json.abi,
        getEvent(Setup.initialTX, 'ProxyDeploy').proxy,
        {from: Setup.admin}
      );
      Setup.initialTX = await Setup.ownershipContractConstant.methods.init(
        Setup.originalOwner.address,
        Setup.ethDIDReg.address
      ).send({from: Setup.admin, gas: 300000});
    });

    beforeEach("deploy new instance of OwnershipRoyaltiesAgreements proxy", async () => {
      let proxyTX = await Setup.proxyFactory.methods.deploy(Setup.admin, '0x')
        .send({from: Setup.registry, gas: 700000});

      Setup.ownershipContract = new web3.eth.Contract(
        OwnershipRoyaltiesAgreements._json.abi,
        getEvent(proxyTX, 'ProxyDeploy').proxy,
        {from: Setup.admin}
      );

      await Setup.ownershipContract.methods.init(
        Setup.originalOwner.address,
        Setup.ethDIDReg.address
      ).send({from: Setup.admin, gas: 300000});
    });

    shouldBehaveLikeOwnershipRoyaltiesAgreements(Setup);
  })
}

module.exports = {
  shouldBehaveLikeProxyFactory
};
