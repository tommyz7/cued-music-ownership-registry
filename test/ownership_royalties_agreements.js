import { shouldBehaveLikeOwnershipRoyaltiesAgreements } from './ownership_royalties_agreements.behaviour.js';

var OwnershipRoyaltiesAgreements = artifacts.require("./mock/OwnershipRoyaltiesAgreementsPublic.sol");
var EthereumDIDRegistry = artifacts.require("./EthereumDIDRegistry.sol")

contract("OwnershipRoyaltiesAgreements", function(accounts){
  let accountsPrivate = [];
  let Setup = {owner: [], contributor: []};

  for (var i = 0; i < 10; i++) {
    accountsPrivate[i] = web3.eth.accounts.create();
    Setup.owner[i] = web3.eth.accounts.create();
    Setup.contributor[i] = web3.eth.accounts.create();
  }

  before("deploy EthereumDIDRegistry & OwnershipRoyaltiesAgreements", async () => {
    Setup.admin = accounts[0];
    Setup.identity = accounts[1];
    Setup.identityNew = accounts[2];
    Setup.originalOwner = accountsPrivate[1];
    Setup.owner1 = accountsPrivate[2];
    Setup.owner2 = accountsPrivate[3];
    Setup.contributor1 = accountsPrivate[4];
    Setup.contributor2 = accountsPrivate[5];
    Setup.contributor3 = accountsPrivate[6];
    Setup.revokedOwner1 = accountsPrivate[7];
    Setup.revokedOwner2 = accountsPrivate[8];

    Setup.ethDIDReg = await EthereumDIDRegistry.new();
    Setup.ownershipContractConstant = await OwnershipRoyaltiesAgreements.new({from: Setup.admin});
    Setup.ownershipContractConstant = new web3.eth.Contract(
      Setup.ownershipContractConstant.abi,
      Setup.ownershipContractConstant.address,
      {from: Setup.admin}
    );
    Setup.initialTX = await Setup.ownershipContractConstant.methods.init(
      Setup.originalOwner.address,
      Setup.ethDIDReg.address
    ).send({from: Setup.admin, gas: 300000});
  });

  beforeEach("deploy new instance of OwnershipRoyaltiesAgreements", async () => {
    Setup.ownershipContract = await OwnershipRoyaltiesAgreements.new({from: Setup.admin});
    await Setup.ownershipContract.init(
      Setup.originalOwner.address,
      Setup.ethDIDReg.address,
      {from: Setup.admin}
    );
    Setup.ownershipContract = new web3.eth.Contract(
      Setup.ownershipContract.abi,
      Setup.ownershipContract.address,
      {from: Setup.admin}
    );
  });

  shouldBehaveLikeOwnershipRoyaltiesAgreements(Setup);
})
