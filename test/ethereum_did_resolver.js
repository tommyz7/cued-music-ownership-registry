const { expectRevert } = require('openzeppelin-test-helpers');
var EthereumDIDRegistry = artifacts.require("./EthereumDIDRegistry.sol");
var EthereumDIDResolver = artifacts.require("./mock/EthereumDIDResolverPublic.sol");
var EthereumDIDResolverProd = artifacts.require("./EthereumDIDResolver.sol");


contract("EthereumDIDResolver", (accounts) => {
  let ethDIDReg, ethDIDResolver, ethDIDResolverProd;
  let identity, identity2, identity3;
  identity = accounts[1];
  identity2 = accounts[2];
  identity3 = accounts[3];

  describe("setRegistry()", () => {
    before("deploy EthereumDIDResolver", async () => {
      ethDIDReg = await EthereumDIDRegistry.new();
      ethDIDResolver = await EthereumDIDResolver.new();
      await ethDIDResolver._setRegistry(ethDIDReg.address);
      ethDIDResolverProd = await EthereumDIDResolverProd.new();
    });

    it("should set registry address", async () => {
      assert.equal(await ethDIDResolver.ethDIDReg(), ethDIDReg.address,
        "EthereumDIDRegistry address has not been set correctly");
    });

    it("should fail when run setRegistry() on production contract", async () => {
      try {
        await ethDIDResolverProd.setRegistry(ethDIDReg.address);
        assert.fail();
      } catch(err) {
        assert.equal('TypeError', err.name);
      }
    });
  })

  describe("isIdentityOwner()", () => {
    describe("default owner", () => {
      it("should confirm default owner", async () => {
        const result = await ethDIDResolver.isIdentityOwner(identity, identity);
        assert.equal(result, true);
      })
    });

    describe("changed owner", () => {
      before(async () => {
        await ethDIDReg.addOwner(identity, identity2, { from: identity });
        await ethDIDReg.revokeOwner(identity, identity, { from: identity });
      });
      it("should confirm removal of old owner", async () => {
        const result = await ethDIDResolver.isIdentityOwner(identity, identity);
        assert.equal(result, false);
      });

      it("should confirm the delegate address as owner", async () => {
        const newResult = await ethDIDResolver.isIdentityOwner(identity, identity2);
        assert.equal(newResult, true);
      });
    });
  })

  describe("getIdentity()", () => {
    describe("default owner", () => {
      it("should return the identity address itself", async () => {
        const owner = await ethDIDResolver.getIdentity(identity2);
        assert.equal(owner, identity);
      });
    });

    describe("changed owner", () => {
      before(async () => {
        await ethDIDReg.addOwner(identity, identity3, { from: identity2 });
        await ethDIDReg.revokeOwner(identity, identity2, { from: identity2 });
      });

      it("should return self address for old owner", async () => {
        const id = await ethDIDResolver.getIdentity(identity2);
        assert.equal(id, identity2);
      });

      it("should return the identity address for delegate", async () => {
        const id = await ethDIDResolver.getIdentity(identity3);
        assert.equal(id, identity);
      });
    });

    describe("remove default owner", () => {
      before(async () => {
        await ethDIDReg.revokeOwner(identity2, identity2, { from: identity2 });
      });
      it("should return zero address for old owner", async () => {
        const result = await ethDIDResolver.isIdentityOwner(identity2, identity2);
        assert.equal(result, false);
        await expectRevert(ethDIDResolver.getIdentity(identity2), "0x0 Identity is not allowed to perform any action");
      });
    })
  })
})
