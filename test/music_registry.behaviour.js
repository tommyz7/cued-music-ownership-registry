import { reverting } from 'openzeppelin-solidity/test/helpers/shouldFail';
import { shouldBehaveLikeOwnershipRoyaltiesAgreements } from './ownership_royalties_agreements.behaviour.js';
import { IpfsHash,ZERO_ADDRESS, stripHexPrefix, getEvent, printGas } from './utils.js';

var BN = web3.utils.BN;
var Account = require("eth-lib/lib/account");
var OwnershipRoyaltiesAgreements = artifacts.require("./mock/OwnershipRoyaltiesAgreementsPublic.sol");

async function getNonce(musicRegistry, addr) {
  return parseInt(await musicRegistry.contract.methods.nonce(addr).call());
}

function getArrayHash(arr, type="bytes") {
  let args = []
  arr.map((value, index) => {
    if (type == 'bytes32')
      args[index] = {t: type, v: value}
    else
      args[index] = {t: type, v: web3.utils.leftPad(value, 64)}
  })
  return args;
}

async function getWorkHash(Setup, contract, signer, funcName, workId, metadata, data = null, nonce = null) {
  let hash;
  if (nonce == null) nonce = await getNonce(contract, signer);
  if (workId == 0) {
    // getNewWorkHash
    if (data == null)
      data = Setup.ownershipImpl.contract.methods.init(
        Setup.firstOwner.address,
        Setup.ethDIDReg.address
      ).encodeABI();
    let publishers = getArrayHash(metadata.publishers)
    hash = web3.utils.soliditySha3(
      {t: 'bytes1', v: '0x19'},
      {t: 'bytes1', v: '0x0'},
      {t: 'address', v: contract.address},
      {t: 'string', v: funcName},
      {t: 'string', v: metadata.title},
      {t: 'string', v: metadata.titleSoundRecording},
      {t: 'bytes32', v: metadata.iswc},
      {t: 'bytes32', v: metadata.territory},
      ...publishers,
      {t: 'bytes', v: data},
      {t: 'uint', v: nonce}
    );
  } else if (metadata == '') {
    // getDeletedWorkHash
    hash = web3.utils.soliditySha3(
      {t: 'bytes1', v: '0x19'},
      {t: 'bytes1', v: '0x0'},
      {t: 'address', v: contract.address},
      {t: 'string', v: funcName},
      {t: 'bytes32', v: workId},
      {t: 'uint', v: nonce}
    );
  } else {
    // getUpdateWorkHash
    let publishers = getArrayHash(metadata.publishers)
    hash = web3.utils.soliditySha3(
      {t: 'bytes1', v: '0x19'},
      {t: 'bytes1', v: '0x0'},
      {t: 'address', v: contract.address},
      {t: 'string', v: funcName},
      {t: 'bytes32', v: workId},
      {t: 'string', v: metadata.title},
      {t: 'string', v: metadata.titleSoundRecording},
      {t: 'bytes32', v: metadata.iswc},
      {t: 'bytes32', v: metadata.territory},
      ...publishers,
      {t: 'uint', v: nonce}
    );
  }
  return {
    "work": metadata,
    "workId": workId,
    "funcName": funcName,
    "hash": hash,
    "data": data,
    "nonce": nonce
  }
}

async function getRecordingHash(Setup, contract, signer, funcName, recordingId, metadata, data = null, nonce = null) {
  let hash;
  if (nonce == null) nonce = await getNonce(contract, signer);

  if (recordingId == 0) {
    // New getRecordingHash
    if (data == null)
      data = Setup.ownershipImpl.contract.methods.init(
        Setup.firstOwner.address,
        Setup.ethDIDReg.address
      ).encodeABI();
    let labels = getArrayHash(metadata.labels)
    let workIds = getArrayHash(metadata.workIds, "bytes32")
    hash = web3.utils.soliditySha3(
      {t: 'bytes1', v: '0x19'},
      {t: 'bytes1', v: '0x0'},
      {t: 'address', v: contract.address},
      {t: 'string', v: funcName},
      {t: 'string', v: metadata.title},
      {t: 'string', v: metadata.versionTitle},
      {t: 'bytes32', v: metadata.isrc},
      {t: 'bytes32', v: metadata.territory},
      {t: 'bytes32', v: metadata.album_upc},
      ...labels,
      ...workIds,
      {t: 'bytes', v: data},
      {t: 'uint', v: nonce}
    );
  } else if (metadata == '') {
    // Deleted getRecordingHash
    hash = web3.utils.soliditySha3(
      {t: 'bytes1', v: '0x19'},
      {t: 'bytes1', v: '0x0'},
      {t: 'address', v: contract.address},
      {t: 'string', v: funcName},
      {t: 'bytes32', v: recordingId},
      {t: 'uint', v: nonce}
    );
  } else {
    // Update getRecordingHash
    let labels = getArrayHash(metadata.labels)
    let workIds = getArrayHash(metadata.workIds, "bytes32")
    hash = web3.utils.soliditySha3(
      {t: 'bytes1', v: '0x19'},
      {t: 'bytes1', v: '0x0'},
      {t: 'address', v: contract.address},
      {t: 'string', v: funcName},
      {t: 'bytes32', v: recordingId},
      {t: 'string', v: metadata.title},
      {t: 'string', v: metadata.versionTitle},
      {t: 'bytes32', v: metadata.isrc},
      {t: 'bytes32', v: metadata.territory},
      {t: 'bytes32', v: metadata.album_upc},
      ...labels,
      ...workIds,
      {t: 'uint', v: nonce}
    );
  }
  return {
    "recording": metadata,
    "recordingId": recordingId,
    "funcName": funcName,
    "hash": hash,
    "data": data,
    "nonce": nonce
  }
}

function shouldBehaveLikeInit(Setup) {
  it("should set factory and EthereumDIDRegistryregistry address", async () => {
    let proxyAddr = await Setup.musicRegistryConstant.contract.methods.proxyFactory().call()
    assert.equal(proxyAddr, Setup.proxyFactory.address,
      "ProxyFactory address has not been set correctly");

    let addr = await Setup.musicRegistryConstant.contract.methods.ethDIDReg().call()
    assert.equal(addr, Setup.ethDIDReg.address,
      "EthereumDIDRegistry address has not been set correctly");

    let EthRegistrySet = getEvent(Setup.initialTX, 'EthRegistrySet');
    EthRegistrySet.reg.should.eq(Setup.ethDIDReg.address);
  });

  it("should revert() when run init() again", async () => {
    await reverting(Setup.musicRegistryConstant.contract.methods.init(
      Setup.ethDIDReg.address,
      Setup.proxyFactory.address
    ).send({from: Setup.admin, gas: 500000}));
  });
}

function shouldBehaveLikeValidateSignature(Setup) {
  describe("should match JS hashes with MusicLib hashes", () => {
    it("New getWorkHash", async () => {
      let nonce = await getNonce(Setup.musicRegistryPublicConstant, Setup.firstOwner.address);
      let obj = await getWorkHash(Setup, Setup.MusicLibPublic, Setup.firstOwner.address, "registerWork", 0, Setup.works[0], null, nonce);
      let solHash = await Setup.MusicLibPublic.contract.methods[
        'getWorkHash((string,string,bytes32,bytes32,address[],address),string,bytes,uint256)'
      ](obj.work, obj.funcName, obj.data, obj.nonce).call();
      assert.equal(solHash, obj.hash, 'hashes do not match');
    });

    it("Update getWorkHash", async () => {
      let nonce = await getNonce(Setup.musicRegistryPublicConstant, Setup.firstOwner.address);
      let obj = await getWorkHash(Setup, Setup.MusicLibPublic, Setup.firstOwner.address, "updateWork", web3.utils.asciiToHex('1'), Setup.works[1], null, nonce);
      let solHash = await Setup.MusicLibPublic.contract.methods.getWorkHash(
        obj.work, obj.funcName, obj.workId, obj.nonce).call();
      assert.equal(solHash, obj.hash, 'hashes do not match');
    });

    it("Delete getWorkHash", async () => {
      let nonce = await getNonce(Setup.musicRegistryPublicConstant, Setup.firstOwner.address);
      let funcName = "removeWork";
      let workId = web3.utils.asciiToHex('2');
      let data = '';
      let metadata = '';
      let obj = await getWorkHash(
        Setup,
        Setup.MusicLibPublic,
        Setup.firstOwner.address,
        funcName,
        workId,
        metadata,
        null,
        nonce
      );
      let solHash = await Setup.MusicLibPublic.contract.methods.getWorkHash(
        funcName, workId, nonce).call();
      assert.equal(solHash, obj.hash, 'hashes do not match');
    });

    it("New getRecordingHash", async () => {
      let nonce = await getNonce(Setup.musicRegistryPublicConstant, Setup.firstOwner.address);
      let obj = await getRecordingHash(Setup, Setup.MusicLibPublic, Setup.firstOwner.address, "registerRecording", 0, Setup.recordings[0], null, nonce)
      let solHash = await Setup.MusicLibPublic.contract.methods.getRecordingHash(
        obj.recording, obj.funcName, obj.data, obj.nonce).call();
      assert.equal(solHash, obj.hash, 'hashes do not match');
    });

    it("Update getRecordingHash", async () => {
      let nonce = await getNonce(Setup.musicRegistryPublicConstant, Setup.firstOwner.address);
      let obj = await getRecordingHash(Setup, Setup.MusicLibPublic, Setup.firstOwner.address, "updateRecording", web3.utils.asciiToHex('11'), Setup.recordings[1], null, nonce)
      let solHash = await Setup.MusicLibPublic.contract.methods[
        'getRecordingHash((string,string,bytes32,bytes32,bytes32,address[],bytes32[],address),string,bytes32,uint256)'
      ](obj.recording, obj.funcName, obj.recordingId, obj.nonce).call();
      assert.equal(solHash, obj.hash, 'hashes do not match');
    });

    it("Delete getRecordingHash", async () => {
      let nonce = await getNonce(Setup.musicRegistryPublicConstant, Setup.firstOwner.address);
      let obj = await getRecordingHash(Setup, Setup.MusicLibPublic, Setup.firstOwner.address, "removeRecording", web3.utils.asciiToHex('22'), '', null, nonce)
      let solHash = await Setup.MusicLibPublic.contract.methods.getRecordingHash(obj.funcName, obj.recordingId, obj.nonce).call();
      assert.equal(solHash, obj.hash, 'hashes do not match');
    });
  });

  it("should validate signature with correct data", async () => {
    let obj = await getWorkHash(Setup, Setup.musicRegistryPublicConstant, Setup.firstOwner.address, "registerWork", 0, Setup.works[0]);
    let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);
    let signer = await Setup.musicRegistryPublicConstant.contract.methods.validateSignature(
      obj.hash, signature, Setup.firstOwner.address).call();
    assert.equal(signer , Setup.firstOwner.address, 'Signer doesn not match');
  });

  it("should NOT validate signature with incorrect data", async () => {
    let obj = await getWorkHash(Setup, Setup.musicRegistryPublicConstant, Setup.firstOwner.address, "registerWork", 0, Setup.works[0]);
    let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);
    let wrongData = await getWorkHash(Setup, Setup.musicRegistryPublicConstant, Setup.firstOwner.address, "WRONG___registerWork", 0, Setup.works[0]);

    await reverting(Setup.musicRegistryPublicConstant.contract.methods.validateSignature(wrongData.hash, signature, Setup.firstOwner.address).call());
  });

  it("should NOT validate signature with wrong signer", async () => {
    let obj = await getWorkHash(Setup, Setup.musicRegistryPublicConstant, Setup.firstOwner.address, "registerWork", 0, Setup.works[0]);
    let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);

    await reverting(Setup.musicRegistryPublicConstant.contract.methods.validateSignature(obj.hash, signature, Setup.random.address).call());
  });

}

function shouldBehaveLikeRegisterWork(Setup) {
  describe("revert() if required data is missing or incorrect", () => {
    let obj, signature, data;
    before(async () => {
      obj = await getWorkHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "registerWork", 0, Setup.works[0]);
      signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);
      data = Setup.ownershipImpl.contract.methods.init(
        Setup.firstOwner.address,
        Setup.ethDIDReg.address
      ).encodeABI();
    })

    it("should revert() if metadata.title is missing", async () => {
      let metadata = Setup.works[9];
      metadata.title = '';
      await reverting(Setup.musicRegistryConstant.contract.methods.registerWork(
        metadata,
        signature,
        data,
        Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 1900000}))
    });

    it("should revert() if metadata.titleSoundRecording is missing", async () => {
      let metadata = Setup.works[8];
      metadata.titleSoundRecording = '';
      await reverting(Setup.musicRegistryConstant.contract.methods.registerWork(
          metadata,
          signature,
          data,
          Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 1900000}))
    });

    it("should revert() if signature is missing", async () => {
      await reverting(Setup.musicRegistryConstant.contract.methods.registerWork(
          Setup.works[0],
          "0x0",
          data,
          Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 1900000}))
    });

    it("should revert() if signer is missing", async () => {
      await reverting(Setup.musicRegistryConstant.contract.methods.registerWork(
          Setup.works[0],
          signature,
          data,
          ZERO_ADDRESS
      ).send({from: Setup.admin, gas: 1900000}))
    });

    it("should revert() if function name is corrupted", async () => {
      let obj = await getWorkHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "WRONG___registerWork", 0, Setup.works[0]);
      let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);
      await reverting(Setup.musicRegistryConstant.contract.methods.registerWork(
          Setup.works[0],
          signature,
          data,
          Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 1900000}))
    });

    it("should revert() if nonce is corrupted", async () => {
      let nonce = await getNonce(Setup.musicRegistryConstant, Setup.firstOwner.address);
      let obj = await getWorkHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "registerWork", 0, Setup.works[0], data, nonce+1);
      let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);
      await reverting(Setup.musicRegistryConstant.contract.methods.registerWork(
          Setup.works[0],
          signature,
          data,
          Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 1900000}))
    });
  })

  describe("register new work", () => {
    let WorkRegistered, WorkRegisteredTX;

    it("should register new work", async () => {
      let data = Setup.ownershipImpl.contract.methods.init(
        Setup.firstOwner.address,
        Setup.ethDIDReg.address
      ).encodeABI();
      let obj = await getWorkHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "registerWork", 0, Setup.works[0], data);
      let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);

      WorkRegisteredTX = await Setup.musicRegistryConstant.contract.methods.registerWork(
          Setup.works[0],
          signature,
          data,
          Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 1900000})
      printGas(WorkRegisteredTX, "Registering new work", 9);

      WorkRegistered = getEvent(WorkRegisteredTX, 'WorkRegistered');
    });

    it("should return correct data from musicRegistry smart contract", async () => {
      let work = await Setup.musicRegistryConstant.contract.methods.works(WorkRegistered.workId).call()

      assert.equal(work.title, Setup.works[0].title, "Title should match")
      assert.equal(work.titleSoundRecording, Setup.works[0].titleSoundRecording, "titleSoundRecording should match")
      assert.equal(work.iswc, web3.utils.padRight(Setup.works[0].iswc, 64), "iswc should match")
      assert.equal(work.territory, web3.utils.padRight(Setup.works[0].territory, 64), "territory should match")
      assert.equal(work.ownershipContract, WorkRegistered.ownershipContract, "ownershipContract should match")

      let publishers = await Setup.musicRegistryConstant.contract.methods.getPublishers(WorkRegistered.workId).call()
      assert.deepEqual(publishers, Setup.works[0].publishers, "publishers should match")
    });

    it("should confirm OwnershipTransfer and RoyaltiesTransfer balance in ownershipContract", async () => {
      let ownershipContract = new web3.eth.Contract(
        Setup.ownershipImpl.abi,
        WorkRegistered.ownershipContract,
        {from: Setup.admin}
      );

      let own = await ownershipContract.methods.balanceOfOwnership(Setup.firstOwner.address).call()
      assert.equal(own, web3.utils.toWei('100', 'ether'), 'should have ownership of 100 eth')

      let royal = await ownershipContract.methods.balanceOfRoyalties(Setup.firstOwner.address).call()
      assert.equal(royal, web3.utils.toWei('100', 'ether'), 'should have royalties of 100 eth')
    });

    describe("check events data", () => {
      it("WorkRegistered event", async () => {
        assert.equal(WorkRegistered.title, Setup.works[0].title, "Title should match")
        assert.equal(WorkRegistered.titleSoundRecording, Setup.works[0].titleSoundRecording, "titleSoundRecording should match")
        assert.equal(WorkRegistered.iswc, web3.utils.padRight(Setup.works[0].iswc, 64), "iswc should match")
        assert.equal(WorkRegistered.territory, web3.utils.padRight(Setup.works[0].territory, 64), "territory should match")
        assert.deepEqual(WorkRegistered.publishers, Setup.works[0].publishers, "publishers should match")
      });

      it("UUID event", async () => {
        let UUID = getEvent(WorkRegisteredTX, 'UUID');
        assert.equal(WorkRegistered.workId, UUID.uuid, "ID is not equal")
      });

      it("EthRegistrySet event", async () => {
        let EthRegistrySet = getEvent(WorkRegisteredTX, 'EthRegistrySet');
        assert.equal(EthRegistrySet.reg, Setup.ethDIDReg.address, "Incorrect registry")
      });

      it("OwnershipTransfer event", async () => {
        let OwnershipTransfer = web3.eth.abi.decodeLog([{
            type: 'address',
            name: 'from'
        },{
            type: 'address',
            name: 'to'
        },{
            type: 'uint256',
            name: 'value'
        }],WorkRegisteredTX.events['0'].raw.data, WorkRegisteredTX.events['0'].raw.topics)

        assert.equal(OwnershipTransfer.from, ZERO_ADDRESS, "from address should be ZERO_ADDRESS")
        assert.equal(OwnershipTransfer.to, Setup.firstOwner.address,
          "first owner should be given ownership")
        assert.equal(OwnershipTransfer.value, web3.utils.toWei('100', "ether"),
          "should give 100% (1 ETH) ownershup")
      });

      it("RoyaltiesTransfer event", async () => {
        let RoyaltiesTransfer = web3.eth.abi.decodeLog([{
            type: 'address',
            name: 'from'
        },{
            type: 'address',
            name: 'to'
        },{
            type: 'uint256',
            name: 'value'
        }],WorkRegisteredTX.events['1'].raw.data, WorkRegisteredTX.events['1'].raw.topics)

        assert.equal(RoyaltiesTransfer.from, ZERO_ADDRESS, "from address should be ZERO_ADDRESS")
        assert.equal(RoyaltiesTransfer.to, Setup.firstOwner.address,
          "first owner should be given royalties")
        assert.equal(RoyaltiesTransfer.value, web3.utils.toWei('100', "ether"),
          "should give 100% (1 ETH) royalties")
      });

      it("ProxyDeploy event", async () => {
        let ProxyDeploy = web3.eth.abi.decodeLog([{
            type: 'address',
            name: 'proxy',
            indexed: true
        },{
            type: 'address',
            name: 'admin'
        },{
            type: 'address',
            name: 'sender'
        }],WorkRegisteredTX.events['2'].raw.data, WorkRegisteredTX.events['2'].raw.topics)
        ProxyDeploy.proxy = web3.utils.toChecksumAddress('0x' + WorkRegisteredTX.events['2'].raw.topics['1'].slice(26))
        assert.equal(ProxyDeploy.proxy, WorkRegistered.ownershipContract,
          "ownershipContract address should match the one from WorkRegistered event")
        assert.equal(ProxyDeploy.admin, Setup.firstOwner.address,
          "admin should be the signer")
        assert.equal(ProxyDeploy.sender, Setup.musicRegistryConstant.address,
          "sender should be MusicRegistry contract")
      });
    })
  })

  describe("deployed ownershipContract should behave like OwnershipRoyaltiesAgreements smart contract", () => {
    let SetupOwnership = {};
    let accountsPrivate = [];
    SetupOwnership.owner = [];
    SetupOwnership.contributor = [];

    for (var i = 0; i < 10; i++) {
      accountsPrivate[i] = web3.eth.accounts.create();
      SetupOwnership.owner[i] = web3.eth.accounts.create();
      SetupOwnership.contributor[i] = web3.eth.accounts.create();
    }

    before("deploy EthereumDIDRegistry & OwnershipRoyaltiesAgreements", async () => {
      SetupOwnership.admin = Setup.accounts[0];
      SetupOwnership.identity = Setup.accounts[1];
      SetupOwnership.identityNew = Setup.accounts[2];
      SetupOwnership.originalOwner = accountsPrivate[1];
      SetupOwnership.owner1 = accountsPrivate[2];
      SetupOwnership.owner2 = accountsPrivate[3];
      SetupOwnership.contributor1 = accountsPrivate[4];
      SetupOwnership.contributor2 = accountsPrivate[5];
      SetupOwnership.contributor3 = accountsPrivate[6];
      SetupOwnership.revokedOwner1 = accountsPrivate[7];
      SetupOwnership.revokedOwner2 = accountsPrivate[8];

      SetupOwnership.ethDIDReg = Setup.ethDIDReg;
      SetupOwnership.ownershipContractConstant = await OwnershipRoyaltiesAgreements.new({from: SetupOwnership.admin});
      SetupOwnership.ownershipContractConstant = new web3.eth.Contract(
        SetupOwnership.ownershipContractConstant.abi,
        SetupOwnership.ownershipContractConstant.address,
        {from: SetupOwnership.admin}
      );
      SetupOwnership.initialTX = await SetupOwnership.ownershipContractConstant.methods.init(
        SetupOwnership.originalOwner.address,
        SetupOwnership.ethDIDReg.address
      ).send({from: SetupOwnership.admin, gas: 300000});
    });

    beforeEach("deploy new instance of OwnershipRoyaltiesAgreements proxy", async () => {
      SetupOwnership.ownershipContract = await OwnershipRoyaltiesAgreements.new({from: SetupOwnership.admin});
      SetupOwnership.ownershipContract = new web3.eth.Contract(
        SetupOwnership.ownershipContract.abi,
        SetupOwnership.ownershipContract.address,
        {from: SetupOwnership.admin}
      );

      await SetupOwnership.ownershipContract.methods.init(
        SetupOwnership.originalOwner.address,
        SetupOwnership.ethDIDReg.address,
      ).send({from: SetupOwnership.admin, gas: 300000});
    });

    shouldBehaveLikeOwnershipRoyaltiesAgreements(SetupOwnership);
  })
}

function shouldBehaveLikeUpdateWork(Setup) {
  describe("revert() if required data is missing or incorrect", () => {
    let obj, signature, data, WorkRegistered, WorkRegisteredTX;
    before(async () => {
      data = Setup.ownershipImpl.contract.methods.init(
        Setup.firstOwner.address,
        Setup.ethDIDReg.address
      ).encodeABI();
      obj = await getWorkHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "registerWork", 0, Setup.works[0], data);
      signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);

      WorkRegisteredTX = await Setup.musicRegistryConstant.contract.methods.registerWork(
          Setup.works[0],
          signature,
          data,
          Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 900000})
      WorkRegistered = getEvent(WorkRegisteredTX, 'WorkRegistered');
    })

    it("should revert() if workId is missing", async () => {
      let metadata = Setup.works[7];
      obj = await getWorkHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "updateWork", WorkRegistered.workId, metadata, data);
      signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);
      await reverting(Setup.musicRegistryConstant.contract.methods.updateWork(
        '0x0',
        metadata,
        signature,
        Setup.firstOwner.address
      ).send({from: Setup.admin}))
    });

    it("should revert() if workId is incorrect", async () => {
      let wrongWorkId = WorkRegistered.workId.slice(0, -3) + 999
      let obj = await getWorkHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "updateWork", wrongWorkId, Setup.works[7]);
      let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);

      await reverting(Setup.musicRegistryConstant.contract.methods.updateWork(
        wrongWorkId,
        Setup.works[7],
        signature,
        Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 500000}))
    });

    it("should revert() if metadata.title is missing", async () => {
      let metadata = Setup.works[7];
      metadata.title = '';
      let obj = await getWorkHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "updateWork", WorkRegistered.workId, metadata);
      let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);
      await reverting(Setup.musicRegistryConstant.contract.methods.updateWork(
        WorkRegistered.workId,
        metadata,
        signature,
        Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 500000}))
    });

    it("should revert() if metadata.titleSoundRecording is missing", async () => {
      let metadata = Setup.works[6];
      metadata.titleSoundRecording = '';
      let obj = await getWorkHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "updateWork", WorkRegistered.workId, metadata);
      let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);
      await reverting(Setup.musicRegistryConstant.contract.methods.updateWork(
          WorkRegistered.workId,
          metadata,
          signature,
          Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 500000}))
    });

    it("should revert() if signature is missing", async () => {
      await reverting(Setup.musicRegistryConstant.contract.methods.updateWork(
          WorkRegistered.workId,
          Setup.works[0],
          "0x0",
          Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 500000}))
    });

    it("should revert() if signer is missing", async () => {
      await reverting(Setup.musicRegistryConstant.contract.methods.updateWork(
          WorkRegistered.workId,
          Setup.works[0],
          signature,
          ZERO_ADDRESS
      ).send({from: Setup.admin, gas: 500000}))
    });

    it("should revert() if signer is not an owner", async () => {
      let obj = await getWorkHash(Setup, Setup.musicRegistryConstant, Setup.random.address, "updateWork", WorkRegistered.workId, Setup.works[0]);
      let signature = Account.sign(obj.hash, Setup.random.privateKey);

      await reverting(Setup.musicRegistryConstant.contract.methods.updateWork(
          WorkRegistered.workId,
          Setup.works[0],
          signature,
          Setup.random.address
      ).send({from: Setup.admin, gas: 500000}))
    });

    it("should revert() if non owner in isOwner()", async () => {
      await reverting(Setup.musicRegistryConstant.contract.methods.isOwner(WorkRegistered.workId, Setup.random.address).call())
    });

    it("should revert() if function name is corrupted", async () => {
      let obj = await getWorkHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "WRONG___registerWork", WorkRegistered.workId, Setup.works[1]);
      let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);
      await reverting(Setup.musicRegistryConstant.contract.methods.updateWork(
          WorkRegistered.workId,
          Setup.works[1],
          signature,
          Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 500000}))
    });

    it("should revert() if nonce is corrupted", async () => {
      let nonce = await getNonce(Setup.musicRegistryConstant, Setup.firstOwner.address);
      let obj = await getWorkHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "updateWork", WorkRegistered.workId, Setup.works[1], null, nonce+1);
      let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);
      await reverting(Setup.musicRegistryConstant.contract.methods.updateWork(
          WorkRegistered.workId,
          Setup.works[1],
          signature,
          Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 500000}))
    });
  })

  describe("with valid data", () => {
    let obj, signature, data, WorkRegistered, WorkRegisteredTX;
    before(async () => {
      data = Setup.ownershipImpl.contract.methods.init(
        Setup.firstOwner.address,
        Setup.ethDIDReg.address
      ).encodeABI();
      obj = await getWorkHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "registerWork", 0, Setup.works[0], data);
      signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);

      WorkRegisteredTX = await Setup.musicRegistryConstant.contract.methods.registerWork(
          Setup.works[0],
          signature,
          data,
          Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 900000})
      WorkRegistered = getEvent(WorkRegisteredTX, 'WorkRegistered');
    })

    it("should confirm ownership in isOwner()", async () => {
      let isOwner = await Setup.musicRegistryConstant.contract.methods.isOwner(WorkRegistered.workId, Setup.firstOwner.address).call()
      assert.equal(isOwner, true)
    });

    it("should update work", async () => {
      let obj = await getWorkHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "updateWork", WorkRegistered.workId, Setup.works[5]);
      let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);

      let WorkUpdatedTX = await Setup.musicRegistryConstant.contract.methods.updateWork(
        WorkRegistered.workId,
        Setup.works[5],
        signature,
        Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 500000})
      printGas(WorkUpdatedTX, "Updating work", 9);

      let work = await Setup.musicRegistryConstant.contract.methods.works(WorkRegistered.workId).call()
      assert.equal(work.title, Setup.works[5].title, "Title should match")
      assert.equal(work.titleSoundRecording, Setup.works[5].titleSoundRecording,
        "titleSoundRecording should match")
      assert.equal(work.iswc, web3.utils.padRight(Setup.works[5].iswc, 64),
        "iswc should match")
      assert.equal(work.territory, web3.utils.padRight(Setup.works[5].territory, 64),
        "territory should match")
      assert.equal(work.ownershipContract, WorkRegistered.ownershipContract,
        "ownershipContract should NOT update")

      let publishers = await Setup.musicRegistryConstant.contract.methods.getPublishers(WorkRegistered.workId).call()
      assert.deepEqual(publishers, Setup.works[5].publishers, "publishers should match")

      let WorkUpdated = getEvent(WorkUpdatedTX, 'WorkUpdated');
      assert.equal(WorkUpdated.title, Setup.works[5].title, "Title should match")
      assert.equal(WorkUpdated.titleSoundRecording, Setup.works[5].titleSoundRecording,
        "titleSoundRecording should match")
      assert.equal(WorkUpdated.iswc, web3.utils.padRight(Setup.works[5].iswc, 64),
        "iswc should match")
      assert.equal(WorkUpdated.territory, web3.utils.padRight(Setup.works[5].territory, 64),
        "territory should match")
      assert.deepEqual(WorkUpdated.publishers, Setup.works[5].publishers, "publishers should match")
      assert.equal(WorkUpdated.ownershipContract, WorkRegistered.ownershipContract,
        "ownershipContract should NOT update")
    });
  })
}

function shouldBehaveLikeRemoveWork(Setup) {
  describe("revert() if required data is missing or incorrect", () => {
    let obj, signature, data, WorkRegistered, WorkRegisteredTX;
    before(async () => {
      data = Setup.ownershipImpl.contract.methods.init(
        Setup.firstOwner.address,
        Setup.ethDIDReg.address
      ).encodeABI();
      obj = await getWorkHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "registerWork", 0, Setup.works[0], data);
      signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);

      WorkRegisteredTX = await Setup.musicRegistryConstant.contract.methods.registerWork(
          Setup.works[0],
          signature,
          data,
          Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 900000})
      WorkRegistered = getEvent(WorkRegisteredTX, 'WorkRegistered');

      obj = await getWorkHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "removeWork", WorkRegistered.workId, '');
      signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);
    })

    it("should revert() if workId is missing", async () => {
      await reverting(Setup.musicRegistryConstant.contract.methods.removeWork(
        '0x0',
        signature,
        Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 500000}))
    });

    it("should revert() if workId is incorrect", async () => {
      let wrongWorkId = WorkRegistered.workId.slice(0, -3) + 999
      let obj = await getWorkHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "removeWork", wrongWorkId, '');
      let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);

      await reverting(Setup.musicRegistryConstant.contract.methods.removeWork(
        wrongWorkId,
        signature,
        Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 500000}))
    });

    it("should revert() if signature is missing", async () => {
      await reverting(Setup.musicRegistryConstant.contract.methods.removeWork(
        WorkRegistered.workId,
        '0x0',
        Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 500000}))
    });

    it("should revert() if signer is missing", async () => {
      await reverting(Setup.musicRegistryConstant.contract.methods.removeWork(
        WorkRegistered.workId,
        signature,
        ZERO_ADDRESS
      ).send({from: Setup.admin, gas: 500000}))
    });

    it("should revert() if signer is not an owner", async () => {
      let obj = await getWorkHash(Setup, Setup.musicRegistryConstant, Setup.random.address, "removeWork", WorkRegistered.workId, '');
      let signature = Account.sign(obj.hash, Setup.random.privateKey);

      await reverting(Setup.musicRegistryConstant.contract.methods.removeWork(
        WorkRegistered.workId,
        signature,
        Setup.random.address
      ).send({from: Setup.admin, gas: 500000}))
    });

    it("should revert() if function name is corrupted", async () => {
      let obj = await getWorkHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "WRONG___removeWork", WorkRegistered.workId, '');
      let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);
      await reverting(Setup.musicRegistryConstant.contract.methods.removeWork(
        WorkRegistered.workId,
        signature,
        Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 500000}))
    });

    it("should revert() if nonce is corrupted", async () => {
      let nonce = await getNonce(Setup.musicRegistryConstant, Setup.firstOwner.address);
      let obj = await getWorkHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "removeWork", WorkRegistered.workId, '', null, nonce+1);
      let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);
      await reverting(Setup.musicRegistryConstant.contract.methods.removeWork(
        WorkRegistered.workId,
        signature,
        Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 500000}))
    });
  })

  describe("with valid data", () => {
    let obj, signature, data, WorkRegistered, WorkRegisteredTX;
    before(async () => {
      data = Setup.ownershipImpl.contract.methods.init(
        Setup.firstOwner.address,
        Setup.ethDIDReg.address
      ).encodeABI();
      obj = await getWorkHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "registerWork", 0, Setup.works[0], data);
      signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);

      WorkRegisteredTX = await Setup.musicRegistryConstant.contract.methods.registerWork(
          Setup.works[0],
          signature,
          data,
          Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 900000})
      WorkRegistered = getEvent(WorkRegisteredTX, 'WorkRegistered');
    })

    it("should delete work", async () => {
      let obj = await getWorkHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "removeWork", WorkRegistered.workId, '');
      let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);

      let WorkRemovedTX = await Setup.musicRegistryConstant.contract.methods.removeWork(
        WorkRegistered.workId,
        signature,
        Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 500000})
      printGas(WorkRemovedTX, "Removing work", 9);

      let WorkRemoved = getEvent(WorkRemovedTX, 'WorkRemoved');
      assert.equal(WorkRemoved.workId, WorkRegistered.workId);

      let work = await Setup.musicRegistryConstant.contract.methods.works(WorkRegistered.workId).call()
      assert.equal(work.title, '', "Title should be empty")
      assert.equal(work.titleSoundRecording, '', "titleSoundRecording should be empty")
      assert.equal(work.iswc, web3.utils.padRight('0x', 64), "iswc should be zero")
      assert.equal(work.territory, web3.utils.padRight('0x', 64), "territory should be zero")
      assert.equal(work.ownershipContract, ZERO_ADDRESS, "ownershipContract should zero address")

      let publishers = await Setup.musicRegistryConstant.contract.methods.getPublishers(WorkRegistered.workId).call()
      assert.deepEqual(publishers, [], "publishers should be empty")
    });
  })

}

function shouldBehaveLikeRegisterRecording(Setup) {
  describe("revert() if required data is missing or incorrect", () => {
    let obj, signature, data;
    before(async () => {
      data = Setup.ownershipImpl.contract.methods.init(
        Setup.firstOwner.address,
        Setup.ethDIDReg.address
      ).encodeABI();
      obj = await getRecordingHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "registerRecording", 0, Setup.recordings[0], data);
      signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);
    })

    it("should revert() if metadata.title is missing", async () => {
      let metadata = Setup.recordings[9];
      metadata.title = '';
      obj = await getRecordingHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "registerRecording", 0, metadata, data);
      signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);

      await reverting(Setup.musicRegistryConstant.contract.methods.registerRecording(
        metadata,
        signature,
        data,
        Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 1900000}))
    });

    it("should revert() if signature is missing", async () => {
      await reverting(Setup.musicRegistryConstant.contract.methods.registerRecording(
          Setup.recordings[0],
          "0x0",
          data,
          Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 1900000}))
    });

    it("should revert() if signer is missing", async () => {
      await reverting(Setup.musicRegistryConstant.contract.methods.registerRecording(
          Setup.recordings[0],
          signature,
          data,
          ZERO_ADDRESS
      ).send({from: Setup.admin, gas: 1900000}))
    });

    it("should revert() if function name is corrupted", async () => {
      let obj = await getRecordingHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "WRONG___registerRecording", 0, Setup.recordings[0]);
      let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);
      await reverting(Setup.musicRegistryConstant.contract.methods.registerRecording(
          Setup.recordings[0],
          signature,
          data,
          Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 1900000}))
    });

    it("should revert() if nonce is corrupted", async () => {
      let nonce = await getNonce(Setup.musicRegistryConstant, Setup.firstOwner.address);
      let obj = await getRecordingHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "registerRecording", 0, Setup.recordings[0], data, nonce+1);
      let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);
      await reverting(Setup.musicRegistryConstant.contract.methods.registerRecording(
          Setup.recordings[0],
          signature,
          data,
          Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 1900000}))
    });
  })

  describe("register new recording", () => {
    let RecordingRegistered, RecordingRegisteredTX;

    it("should register new recording", async () => {
      let data = Setup.ownershipImpl.contract.methods.init(
        Setup.firstOwner.address,
        Setup.ethDIDReg.address
      ).encodeABI();
      let obj = await  getRecordingHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "registerRecording", 0, Setup.recordings[0], data);
      let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);

      RecordingRegisteredTX = await Setup.musicRegistryConstant.contract.methods.registerRecording(
          Setup.recordings[0],
          signature,
          data,
          Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 1900000})
      printGas(RecordingRegisteredTX, "Registering new recording", 9);

      RecordingRegistered = getEvent(RecordingRegisteredTX, 'RecordingRegistered');
    });

    it("should return correct data from musicRegistry smart contract", async () => {
      let recording = await Setup.musicRegistryConstant.contract.methods.recordings(RecordingRegistered.recordingId).call()

      assert.equal(recording.title, Setup.recordings[0].title, "Title should match")
      assert.equal(recording.versionTitle, Setup.recordings[0].versionTitle, "versionTitle should match")
      assert.equal(recording.isrc, web3.utils.padRight(Setup.recordings[0].isrc, 64), "isrc should match")
      assert.equal(recording.territory, web3.utils.padRight(Setup.recordings[0].territory, 64), "territory match")
      assert.equal(recording.album_upc, web3.utils.padRight(Setup.recordings[0].album_upc, 64), "album_upc should match")
      assert.equal(recording.ownershipContract, RecordingRegistered.ownershipContract, "ownershipContract should match")

      let labels = await Setup.musicRegistryConstant.contract.methods.getLabels(RecordingRegistered.recordingId).call()
      assert.deepEqual(labels, Setup.recordings[0].labels, "labels should match")

      let workIds = await Setup.musicRegistryConstant.contract.methods.getWorkIds(RecordingRegistered.recordingId).call()
      assert.deepEqual(workIds, Setup.recordings[0].workIds, "workIds should match")
    });

    it("should confirm OwnershipTransfer and RoyaltiesTransfer balance in ownershipContract", async () => {
      let ownershipContract = new web3.eth.Contract(
        Setup.ownershipImpl.abi,
        RecordingRegistered.ownershipContract,
        {from: Setup.admin}
      );

      let own = await ownershipContract.methods.balanceOfOwnership(Setup.firstOwner.address).call()
      assert.equal(own, web3.utils.toWei('100', 'ether'), 'should have ownership of 100 eth')

      let royal = await ownershipContract.methods.balanceOfRoyalties(Setup.firstOwner.address).call()
      assert.equal(royal, web3.utils.toWei('100', 'ether'), 'should have royalties of 100 eth')
    });

    describe("check events data", () => {
      it("RecordingRegistered event", async () => {
        assert.equal(RecordingRegistered.title, Setup.recordings[0].title, "Title should match")
        assert.equal(RecordingRegistered.versionTitle, Setup.recordings[0].versionTitle, "versionTitle should match")
        assert.equal(RecordingRegistered.isrc, web3.utils.padRight(Setup.recordings[0].isrc, 64), "isrc should match")
        assert.equal(RecordingRegistered.territory, web3.utils.padRight(Setup.recordings[0].territory, 64), "territory should match")
        assert.equal(RecordingRegistered.album_upc, web3.utils.padRight(Setup.recordings[0].album_upc, 64), "album_upc should match")
        assert.deepEqual(RecordingRegistered.labels, Setup.recordings[0].labels, "labels should match")
        assert.deepEqual(RecordingRegistered.workIds, Setup.recordings[0].workIds, "workIds should match")
      });

      it("UUID event", async () => {
        let UUID = getEvent(RecordingRegisteredTX, 'UUID');
        assert.equal(RecordingRegistered.recordingId, UUID.uuid, "ID is not equal")
      });

      it("EthRegistrySet event", async () => {
        let EthRegistrySet = getEvent(RecordingRegisteredTX, 'EthRegistrySet');
        assert.equal(EthRegistrySet.reg, Setup.ethDIDReg.address, "Incorrect registry")
      });

      it("OwnershipTransfer event", async () => {
        let OwnershipTransfer = web3.eth.abi.decodeLog([{
            type: 'address',
            name: 'from'
        },{
            type: 'address',
            name: 'to'
        },{
            type: 'uint256',
            name: 'value'
        }],RecordingRegisteredTX.events['0'].raw.data, RecordingRegisteredTX.events['0'].raw.topics)

        assert.equal(OwnershipTransfer.from, ZERO_ADDRESS, "from address should be ZERO_ADDRESS")
        assert.equal(OwnershipTransfer.to, Setup.firstOwner.address,
          "first owner should be given ownership")
        assert.equal(OwnershipTransfer.value, web3.utils.toWei('100', "ether"),
          "should give 100% (1 ETH) ownershup")
      });

      it("RoyaltiesTransfer event", async () => {
        let RoyaltiesTransfer = web3.eth.abi.decodeLog([{
            type: 'address',
            name: 'from'
        },{
            type: 'address',
            name: 'to'
        },{
            type: 'uint256',
            name: 'value'
        }],RecordingRegisteredTX.events['1'].raw.data, RecordingRegisteredTX.events['1'].raw.topics)

        assert.equal(RoyaltiesTransfer.from, ZERO_ADDRESS, "from address should be ZERO_ADDRESS")
        assert.equal(RoyaltiesTransfer.to, Setup.firstOwner.address,
          "first owner should be given royalties")
        assert.equal(RoyaltiesTransfer.value, web3.utils.toWei('100', "ether"),
          "should give 100% (1 ETH) royalties")
      });

      it("ProxyDeploy event", async () => {
        let ProxyDeploy = web3.eth.abi.decodeLog([{
            type: 'address',
            name: 'proxy',
            indexed: true
        },{
            type: 'address',
            name: 'admin'
        },{
            type: 'address',
            name: 'sender'
        }],RecordingRegisteredTX.events['2'].raw.data, RecordingRegisteredTX.events['2'].raw.topics)
        ProxyDeploy.proxy = web3.utils.toChecksumAddress('0x' + RecordingRegisteredTX.events['2'].raw.topics['1'].slice(26))
        assert.equal(ProxyDeploy.proxy, RecordingRegistered.ownershipContract,
          "ownershipContract address should match the one from RecordingRegistered event")
        assert.equal(ProxyDeploy.admin, Setup.firstOwner.address,
          "admin should be the signer")
        assert.equal(ProxyDeploy.sender, Setup.musicRegistryConstant.address,
          "sender should be MusicRegistry contract")
      });
    })
  })

  describe("deployed ownershipContract should behave like OwnershipRoyaltiesAgreements smart contract", () => {
    let SetupOwnership = {};
    let accountsPrivate = [];
    SetupOwnership.owner = [];
    SetupOwnership.contributor = [];

    for (var i = 0; i < 10; i++) {
      accountsPrivate[i] = web3.eth.accounts.create();
      SetupOwnership.owner[i] = web3.eth.accounts.create();
      SetupOwnership.contributor[i] = web3.eth.accounts.create();
    }

    before("deploy EthereumDIDRegistry & OwnershipRoyaltiesAgreements", async () => {
      SetupOwnership.admin = Setup.accounts[0];
      SetupOwnership.identity = Setup.accounts[3];
      SetupOwnership.identityNew = Setup.accounts[4];
      SetupOwnership.originalOwner = accountsPrivate[1];
      SetupOwnership.owner1 = accountsPrivate[2];
      SetupOwnership.owner2 = accountsPrivate[3];
      SetupOwnership.contributor1 = accountsPrivate[4];
      SetupOwnership.contributor2 = accountsPrivate[5];
      SetupOwnership.contributor3 = accountsPrivate[6];
      SetupOwnership.revokedOwner1 = accountsPrivate[7];
      SetupOwnership.revokedOwner2 = accountsPrivate[8];

      SetupOwnership.ethDIDReg = Setup.ethDIDReg;
      SetupOwnership.ownershipContractConstant = await OwnershipRoyaltiesAgreements.new({from: SetupOwnership.admin});
      SetupOwnership.ownershipContractConstant = new web3.eth.Contract(
        SetupOwnership.ownershipContractConstant.abi,
        SetupOwnership.ownershipContractConstant.address,
        {from: SetupOwnership.admin}
      );
      SetupOwnership.initialTX = await SetupOwnership.ownershipContractConstant.methods.init(
        SetupOwnership.originalOwner.address,
        SetupOwnership.ethDIDReg.address
      ).send({from: SetupOwnership.admin, gas: 300000});
    });

    beforeEach("deploy new instance of OwnershipRoyaltiesAgreements proxy", async () => {
      SetupOwnership.ownershipContract = await OwnershipRoyaltiesAgreements.new({from: SetupOwnership.admin});
      SetupOwnership.ownershipContract = new web3.eth.Contract(
        SetupOwnership.ownershipContract.abi,
        SetupOwnership.ownershipContract.address,
        {from: SetupOwnership.admin}
      );

      await SetupOwnership.ownershipContract.methods.init(
        SetupOwnership.originalOwner.address,
        SetupOwnership.ethDIDReg.address,
      ).send({from: SetupOwnership.admin, gas: 300000});
    });

    shouldBehaveLikeOwnershipRoyaltiesAgreements(SetupOwnership);
  })
}

function shouldBehaveLikeUpdateRecording(Setup) {
  describe("revert() if required data is missing or incorrect", () => {
    let obj, signature, data, RecordingRegistered, RecordingRegisteredTX;
    before(async () => {
      data = Setup.ownershipImpl.contract.methods.init(
        Setup.firstOwner.address,
        Setup.ethDIDReg.address
      ).encodeABI();
      obj = await getRecordingHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "registerRecording", 0, Setup.recordings[0], data);
      signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);

      RecordingRegisteredTX = await Setup.musicRegistryConstant.contract.methods.registerRecording(
          Setup.recordings[0],
          signature,
          data,
          Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 1900000})
      RecordingRegistered = getEvent(RecordingRegisteredTX, 'RecordingRegistered');

      obj = await getRecordingHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "updateRecording", RecordingRegistered.recordingId, Setup.recordings[0], data);
      signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);
    })

    it("should revert() if recordingId is missing", async () => {
      let metadata = Setup.recordings[0];
      await reverting(Setup.musicRegistryConstant.contract.methods.updateRecording(
        '0x0',
        metadata,
        signature,
        Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 500000}))
    });

    it("should revert() if recordingId is incorrect", async () => {
      let wrongRecordingId = RecordingRegistered.recordingId.slice(0, -3) + 999
      let obj = await getRecordingHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "updateRecording", wrongRecordingId, Setup.recordings[7]);
      let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);

      await reverting(Setup.musicRegistryConstant.contract.methods.updateRecording(
        wrongRecordingId,
        Setup.recordings[7],
        signature,
        Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 500000}))
    });

    it("should revert() if metadata.title is missing", async () => {
      let metadata = Setup.recordings[7];
      metadata.title = '';
      let obj = await getRecordingHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "updateRecording", RecordingRegistered.recordingId, metadata);
      let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);
      await reverting(Setup.musicRegistryConstant.contract.methods.updateRecording(
        RecordingRegistered.recordingId,
        metadata,
        signature,
        Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 500000}))
    });

    it("should revert() if signature is missing", async () => {
      await reverting(Setup.musicRegistryConstant.contract.methods.updateRecording(
          RecordingRegistered.recordingId,
          Setup.recordings[0],
          "0x0",
          Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 500000}))
    });

    it("should revert() if signer is missing", async () => {
      await reverting(Setup.musicRegistryConstant.contract.methods.updateRecording(
          RecordingRegistered.recordingId,
          Setup.recordings[0],
          signature,
          ZERO_ADDRESS
      ).send({from: Setup.admin, gas: 500000}))
    });

    it("should revert() if signer is not an owner", async () => {
      let obj = await getRecordingHash(Setup, Setup.musicRegistryConstant, Setup.random.address, "updateRecording", RecordingRegistered.recordingId, Setup.recordings[0]);
      let signature = Account.sign(obj.hash, Setup.random.privateKey);

      await reverting(Setup.musicRegistryConstant.contract.methods.updateRecording(
          RecordingRegistered.recordingId,
          Setup.recordings[0],
          signature,
          Setup.random.address
      ).send({from: Setup.admin, gas: 500000}))
    });

    it("should revert() if function name is corrupted", async () => {
      let obj = await getRecordingHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "WRONG___updateRecording", RecordingRegistered.recordingId, Setup.recordings[1]);
      let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);
      await reverting(Setup.musicRegistryConstant.contract.methods.updateRecording(
          RecordingRegistered.recordingId,
          Setup.recordings[1],
          signature,
          Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 500000}))
    });

    it("should revert() if nonce is corrupted", async () => {
      let nonce = await getNonce(Setup.musicRegistryConstant, Setup.firstOwner.address);
      let obj = await getRecordingHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "updateRecording", RecordingRegistered.recordingId, Setup.recordings[1], null, nonce+1);
      let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);
      await reverting(Setup.musicRegistryConstant.contract.methods.updateRecording(
          RecordingRegistered.recordingId,
          Setup.recordings[1],
          signature,
          Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 500000}))
    });
  })

  describe("with valid data", () => {
    let obj, signature, data, RecordingRegistered, RecordingRegisteredTX;
    before(async () => {
      data = Setup.ownershipImpl.contract.methods.init(
        Setup.firstOwner.address,
        Setup.ethDIDReg.address
      ).encodeABI();
      obj = await getRecordingHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "registerRecording", 0, Setup.recordings[0], data);
      signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);

      RecordingRegisteredTX = await Setup.musicRegistryConstant.contract.methods.registerRecording(
          Setup.recordings[0],
          signature,
          data,
          Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 1900000})
      RecordingRegistered = getEvent(RecordingRegisteredTX, 'RecordingRegistered');
    })

    it("should update recording", async () => {
      let obj = await getRecordingHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "updateRecording", RecordingRegistered.recordingId, Setup.recordings[5]);
      let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);

      let RecordingUpdatedTX = await Setup.musicRegistryConstant.contract.methods.updateRecording(
        RecordingRegistered.recordingId,
        Setup.recordings[5],
        signature,
        Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 900000})
      printGas(RecordingUpdatedTX, "Updating recording", 9);

      let recording = await Setup.musicRegistryConstant.contract.methods.recordings(RecordingRegistered.recordingId).call()

      assert.equal(recording.title, Setup.recordings[5].title, "Title should match")
      assert.equal(recording.versionTitle, Setup.recordings[5].versionTitle,
        "versionTitle should match")
      assert.equal(recording.isrc, web3.utils.padRight(Setup.recordings[5].isrc, 64),
        "isrc should match")
      assert.equal(recording.territory, web3.utils.padRight(Setup.recordings[5].territory, 64),
        "territory should match")
      assert.equal(recording.album_upc, web3.utils.padRight(Setup.recordings[5].album_upc, 64),
        "album_upc should match")
      assert.equal(recording.ownershipContract, RecordingRegistered.ownershipContract,
        "ownershipContract should NOT update")

      let labels = await Setup.musicRegistryConstant.contract.methods.getLabels(RecordingRegistered.recordingId).call()
      assert.deepEqual(labels, Setup.recordings[5].labels, "labels should match")

      let workIds = await Setup.musicRegistryConstant.contract.methods.getWorkIds(RecordingRegistered.recordingId).call()
      assert.deepEqual(workIds, Setup.recordings[5].workIds, "workIds should match")

      let RecordingUpdated = getEvent(RecordingUpdatedTX, 'RecordingUpdated');
      assert.equal(RecordingUpdated.title, Setup.recordings[5].title, "Title should match")
      assert.equal(RecordingUpdated.versionTitle, Setup.recordings[5].versionTitle,
        "versionTitle should match")
      assert.equal(RecordingUpdated.isrc, web3.utils.padRight(Setup.recordings[5].isrc, 64),
        "isrc should match")
      assert.equal(RecordingUpdated.territory, web3.utils.padRight(Setup.recordings[5].territory, 64), "territory should match")
      assert.equal(RecordingUpdated.album_upc, web3.utils.padRight(Setup.recordings[5].album_upc, 64), "album_upc should match")
      assert.deepEqual(RecordingUpdated.labels, Setup.recordings[5].labels, "labels should match")
      assert.deepEqual(RecordingUpdated.workIds, Setup.recordings[5].workIds, "workIds should match")
      assert.equal(RecordingUpdated.ownershipContract, RecordingRegistered.ownershipContract,
        "ownershipContract should NOT update")
    });
  })
}

function shouldBehaveLikeRemoveRecording(Setup) {
  describe("revert() if required data is missing or incorrect", () => {
    let obj, signature, data, RecordingRegistered, RecordingRegisteredTX;
    before(async () => {
      data = Setup.ownershipImpl.contract.methods.init(
        Setup.firstOwner.address,
        Setup.ethDIDReg.address
      ).encodeABI();
      obj = await getRecordingHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "registerRecording", 0, Setup.recordings[0], data);
      signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);

      RecordingRegisteredTX = await Setup.musicRegistryConstant.contract.methods.registerRecording(
          Setup.recordings[0],
          signature,
          data,
          Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 1900000})
      RecordingRegistered = getEvent(RecordingRegisteredTX, 'RecordingRegistered');

      obj = await getRecordingHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "removeRecording", RecordingRegistered.recordingId, '');
      signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);
    })

    it("should revert() if recordingId is missing", async () => {
      await reverting(Setup.musicRegistryConstant.contract.methods.removeRecording(
        '0x0',
        signature,
        Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 500000}))
    });

    it("should revert() if recordingId is incorrect", async () => {
      let wrongRecordingId = RecordingRegistered.recordingId.slice(0, -3) + 999
      let obj = await getRecordingHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "removeRecording", wrongRecordingId, '');
      let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);

      await reverting(Setup.musicRegistryConstant.contract.methods.removeRecording(
        wrongRecordingId,
        signature,
        Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 500000}))
    });

    it("should revert() if signature is missing", async () => {
      await reverting(Setup.musicRegistryConstant.contract.methods.removeRecording(
        RecordingRegistered.recordingId,
        '0x0',
        Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 500000}))
    });

    it("should revert() if signer is missing", async () => {
      await reverting(Setup.musicRegistryConstant.contract.methods.removeRecording(
        RecordingRegistered.recordingId,
        signature,
        ZERO_ADDRESS
      ).send({from: Setup.admin, gas: 500000}))
    });

    it("should revert() if signer is not an owner", async () => {
      let obj = await getRecordingHash(Setup, Setup.musicRegistryConstant, Setup.random.address, "removeRecording", RecordingRegistered.recordingId, '');
      let signature = Account.sign(obj.hash, Setup.random.privateKey);

      await reverting(Setup.musicRegistryConstant.contract.methods.removeRecording(
        RecordingRegistered.recordingId,
        signature,
        Setup.random.address
      ).send({from: Setup.admin, gas: 500000}))
    });

    it("should revert() if function name is corrupted", async () => {
      let obj = await getRecordingHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "WRONG___removeRecording", RecordingRegistered.recordingId, '');
      let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);
      await reverting(Setup.musicRegistryConstant.contract.methods.removeRecording(
        RecordingRegistered.recordingId,
        signature,
        Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 500000}))
    });

    it("should revert() if nonce is corrupted", async () => {
      let nonce = await getNonce(Setup.musicRegistryConstant, Setup.firstOwner.address);
      let obj = await getRecordingHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "removeRecording", RecordingRegistered.recordingId, '', null, nonce+1);
      let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);
      await reverting(Setup.musicRegistryConstant.contract.methods.removeRecording(
        RecordingRegistered.recordingId,
        signature,
        Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 500000}))
    });
  })

  describe("with valid data", () => {
    let obj, signature, data, RecordingRegistered, RecordingRegisteredTX;
    before(async () => {
      data = Setup.ownershipImpl.contract.methods.init(
        Setup.firstOwner.address,
        Setup.ethDIDReg.address
      ).encodeABI();
      obj = await getRecordingHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "registerRecording", 0, Setup.recordings[0], data);
      signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);

      RecordingRegisteredTX = await Setup.musicRegistryConstant.contract.methods.registerRecording(
          Setup.recordings[0],
          signature,
          data,
          Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 1900000})
      RecordingRegistered = getEvent(RecordingRegisteredTX, 'RecordingRegistered');

      obj = await getRecordingHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "updateRecording", RecordingRegistered.recordingId, Setup.recordings[0], data);
      signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);
    })

    it("should delete recording", async () => {
      let obj = await getRecordingHash(Setup, Setup.musicRegistryConstant, Setup.firstOwner.address, "removeRecording", RecordingRegistered.recordingId, '');
      let signature = Account.sign(obj.hash, Setup.firstOwner.privateKey);

      let RecordingRemovedTX = await Setup.musicRegistryConstant.contract.methods.removeRecording(
        RecordingRegistered.recordingId,
        signature,
        Setup.firstOwner.address
      ).send({from: Setup.admin, gas: 500000})
      printGas(RecordingRemovedTX, "Removing recording", 9);

      let RecordingRemoved = getEvent(RecordingRemovedTX, 'RecordingRemoved');
      assert.equal(RecordingRemoved.recordingId, RecordingRegistered.recordingId);

      let recording = await Setup.musicRegistryConstant.contract.methods.recordings(RecordingRegistered.recordingId).call()

      assert.equal(recording.title, '', "Title should be empty")
      assert.equal(recording.versionTitle, '', "versionTitle should be empty")
      assert.equal(recording.isrc, web3.utils.padRight('0x', 64), "isrc should be 0x0")
      assert.equal(recording.territory, web3.utils.padRight('0x', 64), "territory should be 0x0")
      assert.equal(recording.album_upc, web3.utils.padRight('0x', 64), "album_upc should be 0x0")
      assert.equal(recording.ownershipContract, ZERO_ADDRESS, "ownershipContract should be ZERO_ADDRESS")

      let labels = await Setup.musicRegistryConstant.contract.methods.getLabels(RecordingRegistered.recordingId).call()
      assert.deepEqual(labels, [], "labels should be empty array")

      let workIds = await Setup.musicRegistryConstant.contract.methods.getWorkIds(RecordingRegistered.recordingId).call()
      assert.deepEqual(workIds, [], "workIds should be empty array")
    });
  })
}

function shouldBehaveLikeMusicRegistry(Setup) {
  describe("init()", () => {
    shouldBehaveLikeInit(Setup);
  })

  describe("_validateSignature()", () => {
    shouldBehaveLikeValidateSignature(Setup);
  })

  describe("registerWork()", () => {
    shouldBehaveLikeRegisterWork(Setup);
  })

  describe("updateWork()", () => {
    shouldBehaveLikeUpdateWork(Setup);
  })

  describe("removeWork()", () => {
    shouldBehaveLikeRemoveWork(Setup);
  })

  describe("registerRecording()", () => {
    shouldBehaveLikeRegisterRecording(Setup);
  })

  describe("updateRecording()", () => {
    shouldBehaveLikeUpdateRecording(Setup);
  })

  describe("removeRecording()", () => {
    shouldBehaveLikeRemoveRecording(Setup);
  })
}

module.exports = {
  shouldBehaveLikeMusicRegistry,
  getWorkHash
};
