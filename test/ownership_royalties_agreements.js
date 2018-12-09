import { reverting } from 'openzeppelin-solidity/test/helpers/shouldFail';
import { IpfsHash, ZERO_ADDRESS, stripHexPrefix, getEvent, printGas } from './utils.js';
var Web3 = require('web3');
var web3 = new Web3(Web3.givenProvider || "ws://localhost:8546");
var BN = web3.utils.BN;
var OwnershipRoyaltiesAgreements = artifacts.require("./mock/OwnershipRoyaltiesAgreementsPublic.sol");
var EthereumDIDRegistry = artifacts.require("./EthereumDIDRegistry.sol")
var Account = require("eth-lib/lib/account");

contract("OwnershipRoyaltiesAgreements", function(accounts){
  let ethDIDReg;
  let accountsPrivate = [];
  let owner = [];
  let contributor = [];

  for (var i = 0; i < 100; i++) {
    accountsPrivate[i] = web3.eth.accounts.create();
  }

  for (var i = 0; i < 100; i++) {
    owner[i] = web3.eth.accounts.create();
  }

  for (var i = 0; i < 100; i++) {
    contributor[i] = web3.eth.accounts.create();
  }

  let admin = accounts[0];
  let originalOwner = accountsPrivate[1];
  let owner1 = accountsPrivate[2];
  let owner2 = accountsPrivate[3];
  let revokedOwner = accountsPrivate[7];
  let contributor1 = accountsPrivate[4];
  let contributor2 = accountsPrivate[5];
  let contributor3 = accountsPrivate[6];

  function getHash(
    ownershipContractAddress,
    transferType,
    templateHash,
    senderIdentity,
    receiverIdentity,
    value,
    nonce) {
    return web3.utils.soliditySha3(
      {t: 'bytes1', v: '0x19'},
      {t: 'bytes1', v: '0x0'},
      {t: 'address', v: ownershipContractAddress},
      {t: 'string', v: transferType},
      {t: 'bytes32', v: templateHash},
      {t: 'address', v: senderIdentity},
      {t: 'address', v: receiverIdentity},
      {t: 'uint', v: value},
      {t: 'uint', v: nonce},
    );
  }

  function getHashIdentity(
    ethDIDRegAddress,
    nonce,
    identity,
    transactionType,
    oldOwner
    ) {
    return web3.utils.soliditySha3(
      {t: 'bytes1', v: '0x19'},
      {t: 'bytes1', v: '0x0'},
      {t: 'address', v: ethDIDRegAddress},
      {t: 'uint', v: nonce},
      {t: 'address', v: identity},
      {t: 'string', v: transactionType},
      {t: 'address', v: oldOwner}
    );
  }

  async function prepareRevokeOwnerSigned(ethDIDReg, identity, oldOwner) {
    let nonce = parseInt(await ethDIDReg.nonce(identity.address));
    let hash = getHashIdentity(
      ethDIDReg.address,
      nonce,
      identity.address,
      "revokeOwner",
      oldOwner.address
    );
    let sig = Account.sign(hash, identity.privateKey);
    return {
      identity: identity.address,
      nonce: nonce,
      sigV: '0x' + sig.slice(-2, sig.length),
      sigR: '0x' + sig.slice(2, 66),
      sigS: '0x' + sig.slice(66, 130),
      oldOwner: oldOwner.address
    }
  }

  function getUsers(n) {
    let users;
    for (var i = 0; i < n; i++) {
      users[i] = web3.eth.accounts.create();
      users[i].address = users[i].address.toLowerCase();
    }
    return users;
  }

  /**
   * @param  {array} from              define senders by index in definedUsers
   * @param  {array} to                define receivers by index in definedUsers
   * @param  {array} values            define transfer values in 'ether'
   * @param  {array} definedUsers      pre defined users to use for trasnfers
   * example: [0, 0], [2, 1], [10, 10] definedUsers[0] sends 10ether to definedUsers[2]
   *                                   definedUsers[0] sends 10ether to definedUsers[1]
   */
  async function prepareTransferData(from, to, values, definedUsers, transferType, ownershipContract) {
    function getUser(i) {
      if(!users[i]) {
        users[i] = web3.eth.accounts.create();
      }
      return users[i];
    }
    async function getNonce(addr) {
      let _nonce = 0;
      if (nonces[addr] == undefined) {
        _nonce = parseInt(await ownershipContract.methods.nonceFor(addr).call());
        nonces[addr] = _nonce + 1;
      } else {
        _nonce = nonces[addr]++;
      }
      return _nonce;
    }
    let nonces = {};
    let users = definedUsers;
    let templateHash = IpfsHash;
    let v0 = Math.floor((Math.random() * 10) + 1);
    let v1 = Math.floor((Math.random() * 10) + 1);
    let v2 = Math.floor((Math.random() * 10) + 1);
    let templateVersion = "TransferAgreement_v"+v0+"."+v1+"."+v2;

    assert.equal(true, from.length == to.length && to.length == values.length,
      "from, to and values must be equal length");
    let sigSenders = '';
    let sigReceivers = '';
    let senderSigners = [];
    let receiverSigners = [];
    let valuesTX = [];

    let sender, receiver, nonce, hash, senderSig, receiverSig, value;
    for (var i = 0; i < from.length; i++) {
      sender = getUser(from[i]);
      senderSigners.push(sender.address);
      receiver = getUser(to[i]);
      receiverSigners.push(receiver.address);
      nonce = await getNonce(sender.address);
      value = web3.utils.toWei(values[i].toString(), "ether");
      valuesTX.push(value);
      hash = getHash(
        ownershipContract.options.address,
        transferType,
        templateHash,
        sender.address,
        receiver.address,
        value,
        nonce);
      senderSig = Account.sign(hash, sender.privateKey);
      sigSenders += stripHexPrefix(senderSig);

      nonce = await getNonce(receiver.address);
      hash = getHash(
        ownershipContract.options.address,
        transferType,
        templateHash,
        sender.address,
        receiver.address,
        value,
        nonce);
      receiverSig = Account.sign(hash, receiver.privateKey);
      sigReceivers += stripHexPrefix(receiverSig);

    }
    return {
      templateHash: templateHash,
      templateVersion: templateVersion,
      sigSenders: '0x' + sigSenders,
      sigReceivers: '0x' + sigReceivers,
      senderSigners: senderSigners,
      receiverSigners: receiverSigners,
      values: valuesTX,
      users: users
    }
  }

  async function assertOwnershipBalances(originalBalances, from, to, values, users, ownershipContract) {
    assert.equal(true, from.length == to.length && to.length == values.length,
      "from, to and values must be equal length");
    let finalBalances = originalBalances;
    let royaltiesValue;
    for (var i = 0; i < from.length; i++) {
      royaltiesValue =
        finalBalances[from[i]].royalties * (values[i]/finalBalances[from[i]].ownership);
      finalBalances[from[i]].ownership -= values[i];
      finalBalances[to[i]].ownership += values[i];

      finalBalances[from[i]].royalties -= royaltiesValue;
      finalBalances[to[i]].royalties += royaltiesValue;
    }
    let balance;
    for (var i = 0; i < from.length; i++) {
      balance = await ownershipContract.methods.balanceOfOwnership(users[from[i]].address).call();
      assert.equal(web3.utils.toWei(finalBalances[from[i]].ownership.toString(), 'ether'), balance);

      balance = await ownershipContract.methods.balanceOfRoyalties(users[from[i]].address).call();
      assert.equal(web3.utils.toWei(finalBalances[from[i]].royalties.toString(), 'ether'), balance);

      balance = await ownershipContract.methods.balanceOfOwnership(users[to[i]].address).call();
      assert.equal(web3.utils.toWei(finalBalances[to[i]].ownership.toString(), 'ether'), balance);

      balance = await ownershipContract.methods.balanceOfRoyalties(users[to[i]].address).call();
      assert.equal(web3.utils.toWei(finalBalances[to[i]].royalties.toString(), 'ether'), balance);
    }
  }

  async function assertRoyaltiesBalances(originalBalances, from, to, values, users, ownershipContract) {
    assert.equal(true, from.length == to.length && to.length == values.length,
      "from, to and values must be equal length");
    let finalBalances = originalBalances;
    for (var i = 0; i < from.length; i++) {
      finalBalances[from[i]].royalties -= values[i];
      finalBalances[to[i]].royalties += values[i];
    }
    let balance;
    for (var i = 0; i < from.length; i++) {
      balance = await ownershipContract.methods.balanceOfRoyalties(users[from[i]].address).call();
      assert.equal(web3.utils.toWei(finalBalances[from[i]].royalties.toString(), 'ether'), balance);

      balance = await ownershipContract.methods.balanceOfRoyalties(users[to[i]].address).call();
      assert.equal(web3.utils.toWei(finalBalances[to[i]].royalties.toString(), 'ether'), balance);
    }
  }

  function assertOwnershipTransferEvents(txReceipt, originalBalances, from, to, values, users) {
    assert.equal(true, from.length == to.length && to.length == values.length,
      "from, to and values must be equal length");
    let finalBalances = originalBalances;
    let royaltiesValue = [];
    for (var i = 0; i < from.length; i++) {
      royaltiesValue[i] =
        finalBalances[from[i]].royalties * (values[i]/finalBalances[from[i]].ownership);
    }
    let RoyaltiesTransfer, OwnershipTransfer;
    for (var i = 0; i < from.length; i++) {
      OwnershipTransfer = getEvent(txReceipt, 'OwnershipTransfer', i)
      OwnershipTransfer.from.should.eq(users[from[i]].address);
      OwnershipTransfer.to.should.eq(users[to[i]].address);
      OwnershipTransfer.value.should.be.bignumber.equal(web3.utils.toWei(values[i].toString(), "ether"));

      RoyaltiesTransfer = getEvent(txReceipt, 'RoyaltiesTransfer', i)
      RoyaltiesTransfer.from.should.eq(users[from[i]].address);
      RoyaltiesTransfer.to.should.eq(users[to[i]].address);
      RoyaltiesTransfer.value.should.be.bignumber.equal(web3.utils.toWei(royaltiesValue[i].toString(), "ether"));
    }
  }

  function assertRoyaltiesTransferEvents(txReceipt, originalBalances, from, to, values, users) {
    assert.equal(true, from.length == to.length && to.length == values.length,
      "from, to and values must be equal length");
    let RoyaltiesTransfer;
    for (var i = 0; i < from.length; i++) {
      RoyaltiesTransfer = getEvent(txReceipt, 'RoyaltiesTransfer', i)
      RoyaltiesTransfer.from.should.eq(users[from[i]].address);
      RoyaltiesTransfer.to.should.eq(users[to[i]].address);
      RoyaltiesTransfer.value.should.be.bignumber.equal(web3.utils.toWei(values[i].toString(), "ether"));
    }
  }

  async function getOriginalBalances(users, ownershipContract) {
    let originalBalances = {};
    let balanceO, balanceR;
    for (var i = 0; i < users.length; i++) {
      balanceO = await ownershipContract.methods.balanceOfOwnership(users[i].address).call();
      balanceR = await ownershipContract.methods.balanceOfRoyalties(users[i].address).call();
      originalBalances[i] = {
        ownership: new BN(web3.utils.fromWei(balanceO, 'ether')).toNumber(),
        royalties: new BN(web3.utils.fromWei(balanceR, 'ether')).toNumber()
      };
    }
    return originalBalances;
  }

  function corrupt(obj) {
    function _corrupt(str) {
      let corrupt;
      let char = str.charAt(str.length-1);

      if (char == '0')
        corrupt = str.slice(0, -1) + '1'
      else
        corrupt = str.slice(0, -1) + '0'
      return corrupt;
    }

    if (Array.isArray(obj)) {
      let str = obj[obj.length-1];
      let res = obj;
      res[res.length-1] = _corrupt(str);
      return res;
    } else {
      return _corrupt(obj);
    }
  }

  function corruptAddress(obj) {
    function _corrupt() {
      let corrupt;
      let newAcc = web3.eth.accounts.create();
      return newAcc.address;
    }
    if (Array.isArray(obj)) {
      let addr = obj[obj.length-1];
      let res = obj;
      res[res.length-1] = _corrupt(addr);
      return res;
    } else {
      return _corrupt(obj);
    }
  }

  function assertNewOwnershipAgreementEvent(txReceipt, args) {
    let NewOwnershipAgreement = getEvent(txReceipt, "NewOwnershipAgreement");
    NewOwnershipAgreement.templateVersion.should.eq(args.templateVersion);
    NewOwnershipAgreement.templateHash.should.eq(args.templateHash);
    NewOwnershipAgreement.sigSenders.should.eq(args.sigSenders);
    NewOwnershipAgreement.sigReceivers.should.eq(args.sigReceivers);
    NewOwnershipAgreement.senderSigners.should.eql(args.senderSigners);
    NewOwnershipAgreement.senderIdentities.should.eql(args.senderSigners);
    NewOwnershipAgreement.receiverSigners.should.eql(args.receiverSigners);
    NewOwnershipAgreement.receiverIdentities.should.eql(args.receiverSigners);
    NewOwnershipAgreement.values.should.eql(args.values);
  }

  function assertNewRoyaltiesAgreementEvent(txReceipt, args) {
    let NewRoyaltiesAgreement = getEvent(txReceipt, "NewRoyaltiesAgreement");
    NewRoyaltiesAgreement.templateVersion.should.eq(args.templateVersion);
    NewRoyaltiesAgreement.templateHash.should.eq(args.templateHash);
    NewRoyaltiesAgreement.sigSenders.should.eq(args.sigSenders);
    NewRoyaltiesAgreement.sigReceivers.should.eq(args.sigReceivers);
    NewRoyaltiesAgreement.senderSigners.should.eql(args.senderSigners);
    NewRoyaltiesAgreement.senderIdentities.should.eql(args.senderSigners);
    NewRoyaltiesAgreement.receiverSigners.should.eql(args.receiverSigners);
    NewRoyaltiesAgreement.receiverIdentities.should.eql(args.receiverSigners);
    NewRoyaltiesAgreement.values.should.eql(args.values);
  }

  before("deploy EthereumDIDRegistry", async () => {
    ethDIDReg = await EthereumDIDRegistry.new();
  });

  describe("init()", () => {
    let initOwnership, initialTX;

    before("deploy OwnershipRoyaltiesAgreements", async () => {
      initOwnership = await OwnershipRoyaltiesAgreements.new({from: admin});
      initOwnership = new web3.eth.Contract(
        initOwnership.abi, initOwnership.address, {from: admin});
      initialTX = await initOwnership.methods
        .init(originalOwner.address, ethDIDReg.address)
        .send({from: admin, gas: 300000})
    });

    it("should set registry address", async () => {
      let addr = await initOwnership.methods.ethDIDReg().call()
      assert.equal(addr.toLowerCase(), ethDIDReg.address,
        "EthereumDIDRegistry address has not been set correctly");
    });

    it("should mint 100% ownership and royalties to original owner", async () => {
      let users = [originalOwner];
      let originalBalances = await getOriginalBalances(users, initOwnership);
      await assertOwnershipBalances(originalBalances, [0], [0], [100], users, initOwnership);

      let OwnershipTransfer = getEvent(initialTX, 'OwnershipTransfer');
      OwnershipTransfer.from.should.eq(ZERO_ADDRESS);
      OwnershipTransfer.to.should.eq(originalOwner.address);
      OwnershipTransfer.value.should.be.bignumber.equal(web3.utils.toWei('100', "ether"));

      let RoyaltiesTransfer = getEvent(initialTX, 'RoyaltiesTransfer');
      RoyaltiesTransfer.from.should.eq(ZERO_ADDRESS);
      RoyaltiesTransfer.to.should.eq(originalOwner.address);
      RoyaltiesTransfer.value.should.be.bignumber.equal(web3.utils.toWei('100', "ether"));
    });

    it("should revert() when run init() again", async () => {
      await reverting(initOwnership.methods.init(originalOwner.address, ethDIDReg.address).send({from: admin}));
    });
  })

  describe("getIdentity()", () => {
    let ownershipContract, initialTX, identity, identityNew;
    before("deploy OwnershipRoyaltiesAgreements", async () => {
      identity = accounts[5];
      identityNew = accounts[6];
      ownershipContract = await OwnershipRoyaltiesAgreements.new({from: admin});
      ownershipContract = new web3.eth.Contract(
        ownershipContract.abi, ownershipContract.address, {from: admin});
      initialTX = await ownershipContract.methods.init(originalOwner.address, ethDIDReg.address).send({from: admin, gas: 300000});
    });
    it("should return self as identity owner", async () => {
      let result = await ownershipContract.methods.getIdentity(originalOwner.address).call();
      assert(result, originalOwner.address, "originalOwner should be self owned");
    })

    it("should return identity for identityNew", async () => {
      await ethDIDReg.addOwner(identity, identityNew, {from: identity});
      let result = await ownershipContract.methods.getIdentity(identityNew).call();
      assert(result, identity, "originalOwner should be self owned");
    })
  })

  describe("validateSignatures()", () => {
    let ownershipContract;
    before(async () => {
      ownershipContract = await OwnershipRoyaltiesAgreements.new({from: admin});
      ownershipContract = new web3.eth.Contract(
        ownershipContract.abi, ownershipContract.address, {from: admin});
      await ownershipContract.methods.init(originalOwner.address, ethDIDReg.address)
        .send({gas: 300000});
    })

    it("should validate signatures", async () => {
      let users = [originalOwner, owner1, owner2];
      let transferType = "OwnershipTransfer";
      let args = await prepareTransferData([0, 1], [2, 2], [10, 10], users, transferType, ownershipContract);

      let result = await ownershipContract.methods.validateSignatures(
        transferType,
        args.templateHash,
        args.senderSigners[0],
        args.receiverSigners[0],
        args.values[0],
        args.sigSenders,
        args.sigReceivers,
        0
      ).call();

      // do .send() so nonce can increase
      await ownershipContract.methods.validateSignatures(
        transferType,
        args.templateHash,
        args.senderSigners[0],
        args.receiverSigners[0],
        args.values[0],
        args.sigSenders,
        args.sigReceivers,
        0
      ).send({gas: 300000});

      assert.equal(args.senderSigners[0], result.senderId);
      assert.equal(args.receiverSigners[0], result.receiverId);

      result = await ownershipContract.methods.validateSignatures(
        transferType,
        args.templateHash,
        args.senderSigners[1],
        args.receiverSigners[1],
        args.values[1],
        args.sigSenders,
        args.sigReceivers,
        1
      ).call();
      assert.equal(args.senderSigners[1], result.senderId);
      assert.equal(args.receiverSigners[1], result.receiverId);
    })

    it("should NOT validate signatures", async () => {
      let users = [originalOwner, owner1, owner2];
      let transferType = "OwnershipTransfer";
      let args = await prepareTransferData([0, 1], [2, 2], [10, 10], users, transferType, ownershipContract);
      let corruptSigSenders = corrupt(args.sigSenders);

      let result = await ownershipContract.methods.validateSignatures(
        transferType,
        args.templateHash,
        args.senderSigners[0],
        args.receiverSigners[0],
        args.values[0],
        corruptSigSenders,
        args.sigReceivers,
        0
      ).call();

      // do .send() so nonce can increase
      await ownershipContract.methods.validateSignatures(
        transferType,
        args.templateHash,
        args.senderSigners[0],
        args.receiverSigners[0],
        args.values[0],
        corruptSigSenders,
        args.sigReceivers,
        0
      ).send({gas: 300000});

      assert.equal(args.senderSigners[0], result.senderId);
      assert.equal(args.receiverSigners[0], result.receiverId);

      await reverting(ownershipContract.methods.validateSignatures(
        transferType,
        args.templateHash,
        args.senderSigners[1],
        args.receiverSigners[1],
        args.values[1],
        corruptSigSenders,
        args.sigReceivers,
        1
      ).call());
    })
  })

  describe("transferOwnership()", () => {
    let ownershipContract;
    before(async () => {
      ownershipContract = await OwnershipRoyaltiesAgreements.new({from: admin});
      await ownershipContract.init(originalOwner.address, ethDIDReg.address, {from: admin});
      ownershipContract = new web3.eth.Contract(
        ownershipContract.abi, ownershipContract.address, {from: admin});
    })

    it("should transfer ownership", async () => {
      let users = [originalOwner, owner1];
      let originalBalances = await getOriginalBalances(users, ownershipContract);
      let value = 10;
      let txReceipt = await ownershipContract.methods._transferOwnership(
        users[0].address,
        users[1].address,
        web3.utils.toWei(value.toString(), 'ether')
      ).send();
      await assertOwnershipBalances(originalBalances, [0], [1], [value], users, ownershipContract)
      assertOwnershipTransferEvents(txReceipt, originalBalances, [0], [1], [value], users);
    })

    it("should fail to transfer ownership", async () => {
      let users = [owner1, originalOwner];
      let value = 10;
      await reverting(
        ownershipContract.methods._transferOwnership(
          users[0].address,
          users[1].address,
          web3.utils.toWei(value.toString(), 'ether')
        ).send());
    })
  })

  describe("transferRoyalties()", () => {
    let ownershipContract;
    before(async () => {
      ownershipContract = await OwnershipRoyaltiesAgreements.new({from: admin});
      await ownershipContract.init(originalOwner.address, ethDIDReg.address, {from: admin});
      ownershipContract = new web3.eth.Contract(
        ownershipContract.abi, ownershipContract.address, {from: admin});
    })

    it("should transfer royalties", async () => {
      let users = [originalOwner, contributor1];
      let originalBalances = await getOriginalBalances(users, ownershipContract);
      let value = 20;
      let txReceipt = await ownershipContract.methods._transferRoyalties(
        users[0].address,
        users[1].address,
        web3.utils.toWei(value.toString(), 'ether')
      ).send();
      await assertRoyaltiesBalances(originalBalances, [0], [1], [value], users, ownershipContract)
      assertRoyaltiesTransferEvents(txReceipt, originalBalances, [0], [1], [value], users);
    })

    it("should fail to transfer royalties", async () => {
      let users = [owner1, originalOwner];
      let value = 10;
      await reverting(
        ownershipContract.methods._transferRoyalties(
          users[0].address,
          users[1].address,
          web3.utils.toWei(value.toString(), 'ether')
        ).send());
    })
  })

  describe("newOwnershipTransferAgreement()", () => {
    let ownershipContract;

    before("deploy new instance of OwnershipRoyaltiesAgreements", async () => {
      ownershipContract = await OwnershipRoyaltiesAgreements.new({from: admin});
      await ownershipContract.init(originalOwner.address, ethDIDReg.address, {from: admin});

      ownershipContract = new web3.eth.Contract(
        ownershipContract.abi, ownershipContract.address, {from: admin});
    });

    it("should match getHash and soliditySha3 result hashes", async () => {
      let solidityHash = await ownershipContract.methods.getHash(
        originalOwner.address,
        "OwnershipTransfer",
        IpfsHash,
        [originalOwner.address, owner2.address],
        web3.utils.toWei('10', "ether")
      ).call();

      let nonce = await ownershipContract.methods.nonceFor(originalOwner.address).call();
      let web3Hash = getHash(
        ownershipContract.options.address,
        "OwnershipTransfer",
        IpfsHash,
        originalOwner.address,
        owner2.address,
        web3.utils.toWei('10', "ether"),
        nonce);

      assert.equal(web3Hash, solidityHash, 'js and solidity hashes should match');
    });

    describe("with originalOwner as senders", () => {
      describe("using valid data", () => {
        beforeEach("deploy new instance of OwnershipRoyaltiesAgreements", async () => {
          ownershipContract = await OwnershipRoyaltiesAgreements.new({from: admin});
          await ownershipContract.init(originalOwner.address, ethDIDReg.address, {from: admin});

          ownershipContract = new web3.eth.Contract(
            ownershipContract.abi, ownershipContract.address, {from: admin});
        });
        it("should have proper starting balances", async () => {
          let users = [originalOwner, owner1, owner2];
          let originalBalances = {
            '0': {
              ownership: 100,
              royalties: 100
            },
            '1': {
              ownership: 0,
              royalties: 0
            },
            '2': {
              ownership: 0,
              royalties: 0
            }
          };

          await assertOwnershipBalances(originalBalances, [0], [0], [100], users, ownershipContract);
        })

        it("should transfer ownership and royalties", async () => {
          let users = [originalOwner, owner1, owner2];
          let originalBalances = await getOriginalBalances(users, ownershipContract);
          let args =
            await prepareTransferData([0, 0], [2, 1], [10, 10], users, "OwnershipTransfer", ownershipContract);

          let tx = await ownershipContract.methods.newOwnershipTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            args.senderSigners,
            args.receiverSigners,
            args.values
          ).send({from: admin, gas: 1500000});

          assertNewOwnershipAgreementEvent(tx, args);

          await assertOwnershipBalances(originalBalances, [0, 0], [2, 1], [10, 10], args.users, ownershipContract);

          assertOwnershipTransferEvents(tx, originalBalances, [0, 0], [2, 1], [10, 10], args.users);
        });

        describe("with 25% royalties transfered from originalOwner to contributor1", () => {
          it("should transfer ownership with proportional royalties from originalOwner to owner1 and owner2", async () => {
            let users = [originalOwner, owner1, owner2, contributor1];
            let originalBalances = await getOriginalBalances(users, ownershipContract);
            let args =
              await prepareTransferData([0], [3], [25], users, "RoyaltiesTransfer", ownershipContract);

            let tx = await ownershipContract.methods.newRoyaltiesTransferAgreement(
              args.templateHash,
              args.templateVersion,
              args.sigSenders,
              args.sigReceivers,
              args.senderSigners,
              args.receiverSigners,
              args.values
            ).send({from: admin, gas: 1500000});

            assertNewRoyaltiesAgreementEvent(tx, args);

            await assertRoyaltiesBalances(originalBalances, [0], [3], [25], users, ownershipContract);
            assertRoyaltiesTransferEvents(tx, originalBalances, [0], [3], [25], users);

            let afterRoyaltiesBalances = await getOriginalBalances(users, ownershipContract);
            args =
              await prepareTransferData([0, 0], [1, 2], [20, 20], users, "OwnershipTransfer", ownershipContract);
            tx = await ownershipContract.methods.newOwnershipTransferAgreement(
              args.templateHash,
              args.templateVersion,
              args.sigSenders,
              args.sigReceivers,
              args.senderSigners,
              args.receiverSigners,
              args.values
            ).send({from: admin, gas: 1500000});

            assertNewOwnershipAgreementEvent(tx, args);

            await assertOwnershipBalances(originalBalances, [0, 0], [1, 2], [20, 20], users, ownershipContract);
            assertOwnershipTransferEvents(tx, originalBalances, [0, 0], [1, 2], [20, 20], users);
          });

          it("should transfer ownership with proportional royalties from originalOwner to owner1 and owner2, then from owner1 to owner 2", async () => {
            let users = [originalOwner, owner1, owner2, contributor1];
            let originalBalances = await getOriginalBalances(users, ownershipContract);
            let args =
              await prepareTransferData([0], [3], [25], users, "RoyaltiesTransfer", ownershipContract);

            let tx = await ownershipContract.methods.newRoyaltiesTransferAgreement(
              args.templateHash,
              args.templateVersion,
              args.sigSenders,
              args.sigReceivers,
              args.senderSigners,
              args.receiverSigners,
              args.values
            ).send({from: admin, gas: 1500000});

            assertNewRoyaltiesAgreementEvent(tx, args);

            await assertRoyaltiesBalances(originalBalances, [0], [3], [25], users, ownershipContract);
            assertRoyaltiesTransferEvents(tx, originalBalances, [0], [3], [25], users);


            let afterRoyaltiesBalances = await getOriginalBalances(users, ownershipContract);
            args =
              await prepareTransferData([0, 0], [1, 2], [20, 20], users, "OwnershipTransfer", ownershipContract);

            tx = await ownershipContract.methods.newOwnershipTransferAgreement(
              args.templateHash,
              args.templateVersion,
              args.sigSenders,
              args.sigReceivers,
              args.senderSigners,
              args.receiverSigners,
              args.values
            ).send({from: admin, gas: 1500000});

            assertNewOwnershipAgreementEvent(tx, args);

            await assertOwnershipBalances(afterRoyaltiesBalances, [0, 0], [1, 2], [20, 20], users, ownershipContract);
            assertOwnershipTransferEvents(tx, afterRoyaltiesBalances, [0, 0], [1, 2], [20, 20], users);


            let afterOwnershipBalances = await getOriginalBalances(users, ownershipContract);
            args =
              await prepareTransferData([1], [2], [10], users, "OwnershipTransfer", ownershipContract);

            tx = await ownershipContract.methods.newOwnershipTransferAgreement(
              args.templateHash,
              args.templateVersion,
              args.sigSenders,
              args.sigReceivers,
              args.senderSigners,
              args.receiverSigners,
              args.values
            ).send({from: admin, gas: 1500000});

            assertNewOwnershipAgreementEvent(tx, args);

            await assertOwnershipBalances(afterOwnershipBalances, [1], [2], [10], users, ownershipContract);
            assertOwnershipTransferEvents(tx, afterOwnershipBalances, [1], [2], [10], users);
          })
        })
        describe("with high number of transfers", () => {

          let ownershipContractStatic;
          before("clone ownership contract", () => {
            ownershipContractStatic = ownershipContract;
          })

          it("should add proper owners and contributors with gas estimates", async () => {
            let users = [originalOwner, owner[1], owner[2]];
            let originalBalances = await getOriginalBalances(users, ownershipContract);
            let args = await prepareTransferData([0, 0], [1, 2], [30, 30], users, "OwnershipTransfer", ownershipContract)
            let tx = await ownershipContract.methods.newOwnershipTransferAgreement(
              args.templateHash,
              args.templateVersion,
              args.sigSenders,
              args.sigReceivers,
              args.senderSigners,
              args.receiverSigners,
              args.values
            ).send({from: admin, gas: 1500000});

            assertNewOwnershipAgreementEvent(tx, args);
            await assertOwnershipBalances(originalBalances, [0, 0], [1, 2], [30, 30], users, ownershipContract);
            assertOwnershipTransferEvents(tx, originalBalances, [0, 0], [1, 2], [30, 30], users);
            printGas(tx, "Update 1 owner and add 2 owners", 12);

            for (var i = 3; i < 8; i++) {
              users.push(owner[i]);
              let from= [], to = [], values = [];
              for (var j = 0; j < users.length - 1; j++) {
                from.push(j);
                to.push(i);
                values.push((7-i)*2+1);
              }

              originalBalances = await getOriginalBalances(users, ownershipContract);
              args = await prepareTransferData(from, to, values, users, "OwnershipTransfer", ownershipContract)
              tx = await ownershipContract.methods.newOwnershipTransferAgreement(
                args.templateHash,
                args.templateVersion,
                args.sigSenders,
                args.sigReceivers,
                args.senderSigners,
                args.receiverSigners,
                args.values
              ).send({from: admin, gas: 1500000});
              assertNewOwnershipAgreementEvent(tx, args);
              await assertOwnershipBalances(originalBalances, from, to, values, users, ownershipContract);
              assertOwnershipTransferEvents(tx, originalBalances, from, to, values, users);
              printGas(tx, "Update " + (users.length - 1) + " owners and add 1 owner", 12);
            }
            const ownersLength = users.length;
            for (var i = 1; i < 5; i++) {
              users.push(contributor[i]);
              let from= [], to = [], values = [];
              for (var j = 0; j < ownersLength; j++) {
                from.push(j);
                to.push(users.length - 1);
                values.push(1);
              }
              originalBalances = await getOriginalBalances(users, ownershipContract);
              args = await prepareTransferData(from, to, values, users, "RoyaltiesTransfer", ownershipContract)
              tx = await ownershipContract.methods.newRoyaltiesTransferAgreement(
                args.templateHash,
                args.templateVersion,
                args.sigSenders,
                args.sigReceivers,
                args.senderSigners,
                args.receiverSigners,
                args.values
              ).send({from: admin, gas: 1500000});
              assertNewRoyaltiesAgreementEvent(tx, args);
              await assertRoyaltiesBalances(originalBalances, from, to, values, users, ownershipContract);
              assertRoyaltiesTransferEvents(tx, originalBalances, from, to, values, users);
              let msg = i == 1 ? "Update " + ownersLength + " owners and add 1 contributor" : "Update " + ownersLength + " of " + (users.length - 1) + " members and add 1 contributor";
              printGas(tx, msg, 12);
            }
          })
        })
      })
      describe("using invalid data", () => {
        let ethDIDRegistry, ownershipContractRevert;
        beforeEach("deploy EthereumDIDRegistry", async () => {
          ethDIDRegistry = await EthereumDIDRegistry.new();
          ownershipContractRevert = await OwnershipRoyaltiesAgreements.new({from: admin});
          await ownershipContractRevert.init(originalOwner.address, ethDIDRegistry.address, {from: admin});

          ownershipContractRevert = new web3.eth.Contract(
            ownershipContractRevert.abi, ownershipContractRevert.address, {from: admin});
        })

        let ownershipContract;

        it("should revert() when revokedOwner is no longer an owner of identity signed", async () => {
          let args = await prepareRevokeOwnerSigned(ethDIDRegistry, revokedOwner, revokedOwner);
          await ethDIDRegistry.revokeOwnerSigned(args.identity, args.nonce, args.sigV, args.sigR, args.sigS, args.oldOwner);
          await reverting(ownershipContractRevert.methods.getIdentity(revokedOwner.address).send());

          let users = [originalOwner, revokedOwner];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          args =
            await prepareTransferData([0], [1], [10], users, "OwnershipTransfer", ownershipContractRevert);
          await reverting(ownershipContractRevert.methods.newOwnershipTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            args.senderSigners,
            args.receiverSigners,
            args.values
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when templateHash is different by single byte", async () => {
          let users = [originalOwner, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "OwnershipTransfer", ownershipContractRevert);

          let corruptedTemplateHash = corrupt(args.templateHash);

          await reverting(ownershipContractRevert.methods.newOwnershipTransferAgreement(
            corruptedTemplateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            args.senderSigners,
            args.receiverSigners,
            args.values
          ).send({from: admin, gas: 1500000}));
        })

        it("should revert() when sigSenders is different by single byte", async () => {
          let users = [originalOwner, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "OwnershipTransfer", ownershipContractRevert);

          let corruptSigSenders = corrupt(args.sigSenders);

          await reverting(ownershipContractRevert.methods.newOwnershipTransferAgreement(
            args.templateHash,
            args.templateVersion,
            corruptSigSenders,
            args.sigReceivers,
            args.senderSigners,
            args.receiverSigners,
            args.values
          ).send({from: admin, gas: 1500000}));
        })

        it("should revert() when sigReceivers is different by single byte", async () => {
          let users = [originalOwner, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "OwnershipTransfer", ownershipContractRevert);

          let corruptSigReceivers = corrupt(args.sigReceivers);

          await reverting(ownershipContractRevert.methods.newOwnershipTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            corruptSigReceivers,
            args.senderSigners,
            args.receiverSigners,
            args.values
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when senderSigners addresses are different by single byte", async () => {
          let users = [originalOwner, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "OwnershipTransfer", ownershipContractRevert);

          let corruptSenderSigners = corruptAddress(args.senderSigners);

          await reverting(ownershipContractRevert.methods.newOwnershipTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            corruptSenderSigners,
            args.receiverSigners,
            args.values
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when receiverSigners addresses are different by single byte", async () => {
          let users = [originalOwner, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "OwnershipTransfer", ownershipContractRevert);
          let corruptReceiverSigners = corruptAddress(args.receiverSigners);

          await reverting(ownershipContractRevert.methods.newOwnershipTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            args.senderSigners,
            corruptReceiverSigners,
            args.values
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when values are different by single byte", async () => {
          let users = [originalOwner, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "OwnershipTransfer", ownershipContractRevert);

          let corruptValues = corrupt(args.values);

          await reverting(ownershipContractRevert.methods.newOwnershipTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            args.senderSigners,
            args.receiverSigners,
            corruptValues
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when different sender identity signed", async () => {
          let users = [{address: originalOwner.address, privateKey: owner2.privateKey}, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "OwnershipTransfer", ownershipContractRevert);

          await reverting(ownershipContractRevert.methods.newOwnershipTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            args.senderSigners,
            args.receiverSigners,
            args.values
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when different receiver identity signed", async () => {
          let users = [originalOwner, {address: owner1.address, privateKey: owner2.privateKey}];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "OwnershipTransfer", ownershipContractRevert);

          await reverting(ownershipContractRevert.methods.newOwnershipTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            args.senderSigners,
            args.receiverSigners,
            args.values
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when sigSenders is missing", async () => {
          let users = [originalOwner, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "OwnershipTransfer", ownershipContractRevert);
          let zeroSigSenders = '0x00000000000000000000000000000000000000000000000000000000000000000';
          await reverting(ownershipContractRevert.methods.newOwnershipTransferAgreement(
            args.templateHash,
            args.templateVersion,
            zeroSigSenders,
            args.sigReceivers,
            args.senderSigners,
            args.receiverSigners,
            args.values
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when sigReceivers is missing", async () => {
          let users = [originalOwner, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "OwnershipTransfer", ownershipContractRevert);
          let zerosigReceivers = '0x00000000000000000000000000000000000000000000000000000000000000000';
          await reverting(ownershipContractRevert.methods.newOwnershipTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            zerosigReceivers,
            args.senderSigners,
            args.receiverSigners,
            args.values
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when senderSigners is 0x0", async () => {
          let users = [originalOwner, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "OwnershipTransfer", ownershipContractRevert);
          await reverting(ownershipContractRevert.methods.newOwnershipTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            [ZERO_ADDRESS],
            args.receiverSigners,
            args.values
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when receiverSigners is 0x0", async () => {
          let users = [originalOwner, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "OwnershipTransfer", ownershipContractRevert);
          await reverting(ownershipContractRevert.methods.newOwnershipTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            args.senderSigners,
            [ZERO_ADDRESS],
            args.values
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when missing a value", async () => {
          let users = [originalOwner, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "OwnershipTransfer", ownershipContractRevert);
          await reverting(ownershipContractRevert.methods.newOwnershipTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            args.senderSigners,
            args.receiverSigners,
            [0]
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when balance of sender is not sufficient for transfer", async () => {
          let users = [owner1, originalOwner];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "OwnershipTransfer", ownershipContractRevert);
          await reverting(ownershipContractRevert.methods.newOwnershipTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            args.senderSigners,
            args.receiverSigners,
            args.values
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when balance of sender goes under 0.1% after transfer", async ()
          => {
          let users = [originalOwner, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [99.91], users, "OwnershipTransfer", ownershipContractRevert);
          await reverting(ownershipContractRevert.methods.newOwnershipTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            args.senderSigners,
            args.receiverSigners,
            args.values
          ).send({from: admin, gas: 1500000}));
          });
        it("should revert() when transfer value is below 0.1%", async () => {
          let users = [originalOwner, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [0.09], users, "OwnershipTransfer", ownershipContractRevert);
          await reverting(ownershipContractRevert.methods.newOwnershipTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            args.senderSigners,
            args.receiverSigners,
            args.values
          ).send({from: admin, gas: 1500000}));
        });
      })
    })
  })


  describe("newRoyaltiesTransferAgreement()", () => {
    describe("with originalOwner as sender", () => {
      describe("using valid data", () => {
        let ownershipContract;

        beforeEach("deploy new instance of OwnershipRoyaltiesAgreements", async () => {
          ownershipContract = await OwnershipRoyaltiesAgreements.new({from: admin});
          await ownershipContract.init(originalOwner.address, ethDIDReg.address, {from: admin});

          ownershipContract = new web3.eth.Contract(
            ownershipContract.abi, ownershipContract.address, {from: admin});
        });

        it("should transfer royalties", async () => {
          let users = [originalOwner, contributor1, contributor2, contributor3]
          let originalBalances = await getOriginalBalances(users, ownershipContract);
          let args = await prepareTransferData([0, 0, 0], [1, 2, 3], [35, 25, 15], users, "RoyaltiesTransfer", ownershipContract);

          let txReceipt = await ownershipContract.methods.newRoyaltiesTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            args.senderSigners,
            args.receiverSigners,
            args.values
          ).send({gas: 400000});

          assertNewRoyaltiesAgreementEvent(txReceipt, args);

          await assertRoyaltiesBalances(originalBalances, [0, 0, 0], [1, 2, 3], [35, 25, 15], users, ownershipContract);
          assertRoyaltiesTransferEvents(txReceipt, originalBalances, [0, 0, 0], [1, 2, 3], [35, 25, 15], users);
        });
      })
      describe("using invalid data", () => {
        let ethDIDRegistry, ownershipContractRevert;
        beforeEach("deploy EthereumDIDRegistry", async () => {
          ethDIDRegistry = await EthereumDIDRegistry.new();
          ownershipContractRevert = await OwnershipRoyaltiesAgreements.new({from: admin});
          await ownershipContractRevert.init(originalOwner.address, ethDIDRegistry.address, {from: admin});

          ownershipContractRevert = new web3.eth.Contract(
            ownershipContractRevert.abi, ownershipContractRevert.address, {from: admin});
        })

        it("should revert() when revokedOwner is no longer an owner of identity signed", async () => {
          let args = await prepareRevokeOwnerSigned(ethDIDRegistry, revokedOwner, revokedOwner);
          await ethDIDRegistry.revokeOwnerSigned(args.identity, args.nonce, args.sigV, args.sigR, args.sigS, args.oldOwner);
          await reverting(ownershipContractRevert.methods.getIdentity(revokedOwner.address).send());

          let users = [originalOwner, revokedOwner]
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          args = await prepareTransferData([0], [1], [15], users, "RoyaltiesTransfer", ownershipContractRevert);

          await reverting(ownershipContractRevert.methods.newRoyaltiesTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            args.senderSigners,
            args.receiverSigners,
            args.values
          ).send({gas: 400000}));
        });

        it("should revert() when templateHash is different by single byte", async () => {
          let users = [originalOwner, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "RoyaltiesTransfer", ownershipContractRevert);

          let corruptedTemplateHash = corrupt(args.templateHash);

          await reverting(ownershipContractRevert.methods.newRoyaltiesTransferAgreement(
            corruptedTemplateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            args.senderSigners,
            args.receiverSigners,
            args.values
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when sigSenders is different by single byte", async () => {
          let users = [originalOwner, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "RoyaltiesTransfer", ownershipContractRevert);

          let corruptSigSenders = corrupt(args.sigSenders);

          await reverting(ownershipContractRevert.methods.newRoyaltiesTransferAgreement(
            args.templateHash,
            args.templateVersion,
            corruptSigSenders,
            args.sigReceivers,
            args.senderSigners,
            args.receiverSigners,
            args.values
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when sigReceivers is different by single byte", async () => {
          let users = [originalOwner, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "RoyaltiesTransfer", ownershipContractRevert);

          let corruptSigReceivers = corrupt(args.sigReceivers);

          await reverting(ownershipContractRevert.methods.newRoyaltiesTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            corruptSigReceivers,
            args.senderSigners,
            args.receiverSigners,
            args.values
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when senderSigners addresses are different by single byte", async () => {
          let users = [originalOwner, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "RoyaltiesTransfer", ownershipContractRevert);

          let corruptSenderSigners = corruptAddress(args.senderSigners);

          await reverting(ownershipContractRevert.methods.newRoyaltiesTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            corruptSenderSigners,
            args.receiverSigners,
            args.values
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when receiverSigners addresses are different by single byte", async () => {
          let users = [originalOwner, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "RoyaltiesTransfer", ownershipContractRevert);
          let corruptReceiverSigners = corruptAddress(args.receiverSigners);

          await reverting(ownershipContractRevert.methods.newRoyaltiesTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            args.senderSigners,
            corruptReceiverSigners,
            args.values
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when values are different by single byte", async () => {
          let users = [originalOwner, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "RoyaltiesTransfer", ownershipContractRevert);

          let corruptValues = corrupt(args.values);

          await reverting(ownershipContractRevert.methods.newRoyaltiesTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            args.senderSigners,
            args.receiverSigners,
            corruptValues
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when different sender identity signed", async () => {
          let users = [{address: originalOwner.address, privateKey: owner2.privateKey}, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "RoyaltiesTransfer", ownershipContractRevert);

          await reverting(ownershipContractRevert.methods.newRoyaltiesTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            args.senderSigners,
            args.receiverSigners,
            args.values
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when different receiver identity signed", async () => {
          let users = [originalOwner, {address: owner1.address, privateKey: owner2.privateKey}];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "RoyaltiesTransfer", ownershipContractRevert);

          await reverting(ownershipContractRevert.methods.newRoyaltiesTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            args.senderSigners,
            args.receiverSigners,
            args.values
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when sigSenders is missing", async () => {
          let users = [originalOwner, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "RoyaltiesTransfer", ownershipContractRevert);
          let zeroSigSenders = '0x00000000000000000000000000000000000000000000000000000000000000000';
          await reverting(ownershipContractRevert.methods.newRoyaltiesTransferAgreement(
            args.templateHash,
            args.templateVersion,
            zeroSigSenders,
            args.sigReceivers,
            args.senderSigners,
            args.receiverSigners,
            args.values
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when sigReceivers is missing", async () => {
          let users = [originalOwner, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "RoyaltiesTransfer", ownershipContractRevert);
          let zerosigReceivers = '0x00000000000000000000000000000000000000000000000000000000000000000';
          await reverting(ownershipContractRevert.methods.newRoyaltiesTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            zerosigReceivers,
            args.senderSigners,
            args.receiverSigners,
            args.values
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when senderSigners is 0x0", async () => {
          let users = [originalOwner, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "RoyaltiesTransfer", ownershipContractRevert);
          await reverting(ownershipContractRevert.methods.newRoyaltiesTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            [ZERO_ADDRESS],
            args.receiverSigners,
            args.values
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when receiverSigners is 0x0", async () => {
          let users = [originalOwner, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "RoyaltiesTransfer", ownershipContractRevert);
          await reverting(ownershipContractRevert.methods.newRoyaltiesTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            args.senderSigners,
            [ZERO_ADDRESS],
            args.values
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when missing a value", async () => {
          let users = [originalOwner, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "RoyaltiesTransfer", ownershipContractRevert);
          await reverting(ownershipContractRevert.methods.newRoyaltiesTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            args.senderSigners,
            args.receiverSigners,
            [0]
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when balance of sender is not sufficient for transfer", async () => {
          let users = [owner1, originalOwner];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [10], users, "RoyaltiesTransfer", ownershipContractRevert);
          await reverting(ownershipContractRevert.methods.newRoyaltiesTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            args.senderSigners,
            args.receiverSigners,
            args.values
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when balance of sender goes under 0.1% after transfer", async () => {
          let users = [originalOwner, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [99.91], users, "RoyaltiesTransfer", ownershipContractRevert);
          await reverting(ownershipContractRevert.methods.newRoyaltiesTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            args.senderSigners,
            args.receiverSigners,
            args.values
          ).send({from: admin, gas: 1500000}));
        });

        it("should revert() when transfer value is below 0.1%", async () => {
          let users = [originalOwner, owner1];
          let originalBalances = await getOriginalBalances(users, ownershipContractRevert);
          let args =
            await prepareTransferData([0], [1], [0.09], users, "RoyaltiesTransfer", ownershipContractRevert);
          await reverting(ownershipContractRevert.methods.newRoyaltiesTransferAgreement(
            args.templateHash,
            args.templateVersion,
            args.sigSenders,
            args.sigReceivers,
            args.senderSigners,
            args.receiverSigners,
            args.values
          ).send({from: admin, gas: 1500000}));
        });
      })
    })
  })
})
