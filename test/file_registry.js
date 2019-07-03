const { expectRevert } = require('openzeppelin-test-helpers');
import { getEvent, printGas, ZERO_ADDRESS } from './utils.js';
import { getWorkHash } from './music_registry.behaviour.js';
var FileRegistry = artifacts.require("./mock/FileRegistryPublic.sol");
var BN = web3.utils.BN;
var Account = require("eth-lib/lib/account");

var MusicRegistry = artifacts.require("./MusicRegistry.sol");
var MusicLib = artifacts.require("./library/MusicLib.sol");

var ProxyFactory = artifacts.require("./ProxyFactory.sol");
var EthereumDIDRegistry = artifacts.require("./EthereumDIDRegistry.sol");
var OwnershipRoyaltiesAgreements = artifacts.require("./OwnershipRoyaltiesAgreements.sol");

function getHash(contractAddress, funcName, FILES, nonce) {
  return web3.utils.soliditySha3(
    {t: 'bytes1', v: '0x19'},
    {t: 'bytes1', v: '0x0'},
    {t: 'address', v: contractAddress},
    {t: 'string', v: funcName},
    {t: 'bytes32', v: FILES.id},
    {t: 'string', v: FILES.ipfsHash},
    {t: 'string', v: FILES.name},
    {t: 'string', v: FILES.url},
    {t: 'uint8', v: FILES.fileType},
    {t: 'uint', v: nonce}
  );
}

contract("FileRegistry", (accounts) => {
  let fileReg, ethDIDReg, ownershipImpl, proxyFactory, musicRegistry, initialTX;
  let admin = accounts[0];
  let firstOwner = web3.eth.accounts.create();
  let secondOwner = web3.eth.accounts.create();
  let random = web3.eth.accounts.create();
  let factoryOwner = web3.eth.accounts.create();

  const FILES = [{
    id: web3.utils.padLeft("0x0", 64),
    ipfsHash: "",
    name: "",
    url: "",
    fileType: 10
  },
  {
    id: "0x57" + web3.utils.padLeft("123", 62),
    ipfsHash: "QmahqCsAUAw7zMv6P6Ae8PjCTck7taQA6FgGQLnWdKG7U8",
    name: "File 1",
    url: "https://ipfs.com/<hash>",
    fileType: 6
  },
  {
    id: "0x52" + web3.utils.padLeft("456", 62),
    ipfsHash: "Qmb4atcgbbN5v4CDJ8nz5QG5L2pgwSTLd3raDrnyhLjnUH",
    name: "File 2",
    url: "https://ipfs.com/<hash>",
    fileType: 8
  },
  {
    id: "0x52" + web3.utils.padLeft("789", 62),
    ipfsHash: "Qmbsjy28ehwod3028sh12903jf92hieunkop03nspowu83",
    name: "File 3",
    url: "https://ipfs.com/<hash>",
    fileType: 7
  }]

  before("deploy FileRegistry", async () => {
    fileReg = await FileRegistry.new();
    fileReg = new web3.eth.Contract(
        fileReg.abi, fileReg.address, {from: admin});

    ethDIDReg = await EthereumDIDRegistry.new({from: admin});
    ownershipImpl = await OwnershipRoyaltiesAgreements.new({from: admin});
    proxyFactory = await ProxyFactory.new({from: admin});

    MusicLib = await MusicLib.new({from: admin});
    MusicRegistry.link("MusicLib", MusicLib.address);
    musicRegistry = await MusicRegistry.new({from: admin});

    await proxyFactory.contract.methods.init(
      factoryOwner.address,
      musicRegistry.address,
      ownershipImpl.address
    ).send({from: admin, gas: 500000});

    await musicRegistry.contract.methods.init(
      ethDIDReg.address,
      proxyFactory.address
    ).send({from: admin, gas: 500000});

    initialTX = await fileReg.methods.init(musicRegistry.address).send({from: admin, gas: 400000})
  })

  describe("init()", () => {
    it("should set musicRegistryAddr address", async () => {
      let musicRegistryAddr = await fileReg.methods.musicRegistry().call()
      assert.equal(musicRegistryAddr, musicRegistry.address,
        "musicRegistry address has not been set correctly");

      let MusicRegistrySet = getEvent(initialTX, "MusicRegistrySet");
      assert.equal(MusicRegistrySet.musicRegistry, musicRegistry.address,
        "musicRegistry address is incorrect")
    });

    it("should revert() when run init() again", async () => {
      await expectRevert.unspecified(
        fileReg.methods.init(musicRegistry.address).send({from: admin, gas: 400000}))
    });
  })

  describe("test internal functions", () => {
    describe("_addFileType()", () => {
      it("should add new file type", async () => {
        let orgft = await fileReg.methods.getAllFileTypes().call();
        let newFt = 'new File Type';
        let txReceipt = await fileReg.methods.addFileType(newFt).send({gas: 500000});
        printGas(txReceipt, "Add one file type", 9);
        let NewFileType = getEvent(txReceipt, "NewFileType");
        assert.equal(new BN(NewFileType.index).toNumber(), orgft.length, "New file index incorrect")
        assert.equal(NewFileType.fileType, newFt, "New file type incorrect")
      })
    })

    describe("_addFile()", () => {
      it("should revert() if ID is 0x0", async () => {
        await expectRevert(fileReg.methods.addFilePublic(
          FILES[0].id,
          FILES[1].ipfsHash,
          FILES[1].name,
          FILES[1].url,
          FILES[1].fileType
        ).send({gas: 500000}), 'Must have projectId')
      })

      it("should revert() if ipfsHash is empty", async () => {
        await expectRevert(fileReg.methods.addFilePublic(
          FILES[1].id,
          FILES[0].ipfsHash,
          FILES[1].name,
          FILES[1].url,
          FILES[1].fileType
        ).send({gas: 500000}), 'Must have non-zero IPFS hash');
      })

      it("should revert() if fileType is incorrect", async () => {
        await expectRevert(fileReg.methods.addFilePublic(
          FILES[1].id,
          FILES[1].ipfsHash,
          FILES[1].name,
          FILES[1].url,
          FILES[0].fileType
        ).send({gas: 500000}), "FileType must be correct value");
      });

      it("should add file to registry", async () => {
        let txReceipt = await fileReg.methods.addFilePublic(
          FILES[1].id,
          FILES[1].ipfsHash,
          FILES[1].name,
          FILES[1].url,
          FILES[1].fileType
        ).send({gas: 500000});

        printGas(txReceipt, "Add one file", 9);
        let NewFile = getEvent(txReceipt, "NewFile");
        assert.equal(NewFile.projectId, FILES[1].id, "project ID incorrect")
        assert.equal(NewFile.ipfsHash, FILES[1].ipfsHash, "ipfsHash incorrect")
        assert.equal(NewFile.name, FILES[1].name, "name incorrect")
        assert.equal(NewFile.url, FILES[1].url, "url incorrect")
        assert.equal(NewFile.fileType, FILES[1].fileType, "fileType incorrect")
        txReceipt = await fileReg.methods.addFilePublic(
          FILES[2].id,
          FILES[2].ipfsHash,
          FILES[2].name,
          FILES[2].url,
          FILES[2].fileType
        ).send({gas: 500000});

        NewFile = getEvent(txReceipt, "NewFile");
        assert.equal(NewFile.projectId, FILES[2].id, "project ID incorrect")
        assert.equal(NewFile.ipfsHash, FILES[2].ipfsHash, "ipfsHash incorrect")
        assert.equal(NewFile.name, FILES[2].name, "name incorrect")
        assert.equal(NewFile.url, FILES[2].url, "url incorrect")
        assert.equal(NewFile.fileType, FILES[2].fileType, "fileType incorrect")
      });

      it("should confirm that file is in registry", async () => {
        let files = await fileReg.methods.getFiles(FILES[1].id, FILES[1].fileType).call();
        assert.equal(FILES[1].fileType, files[0].fileType);
        assert.equal(FILES[1].ipfsHash, files[0].ipfsHash);
        let type = await fileReg.methods.getFileType(FILES[1].id, FILES[1].ipfsHash).call();
        assert.equal(FILES[1].fileType, type);
        let isfile = await fileReg.methods.isProjectFile(FILES[1].id, FILES[1].ipfsHash).call();
        assert.equal(isfile, true);

        files = await fileReg.methods.getFiles(FILES[2].id, FILES[2].fileType).call();
        assert.equal(
          FILES[2].fileType,
          files[0].fileType);
        assert.equal(FILES[2].ipfsHash, files[0].ipfsHash);
        type = await fileReg.methods.getFileType(FILES[2].id, FILES[2].ipfsHash).call();
        assert.equal(FILES[2].fileType, type);
        isfile = await fileReg.methods.isProjectFile(FILES[2].id, FILES[2].ipfsHash).call();
        assert.equal(isfile, true);
      });

      it("should return proper indexes", async () => {
        let result = await fileReg.methods.getIndexes(FILES[1].id, FILES[1].fileType).call();
        let hash = web3.utils.soliditySha3(
          {t: 'string', v: FILES[1].ipfsHash}
        );
        assert.equal(result[0], hash);

        result = await fileReg.methods.getIndexes(FILES[2].id, FILES[2].fileType).call();
        hash = web3.utils.soliditySha3(
          {t: 'string', v: FILES[2].ipfsHash}
        );
        assert.equal(result[0], hash);
      });
    })
  })

  describe("_updateFile()", () => {
    it("should update file in registry", async () => {
      let txReceipt = await fileReg.methods.updateFilePublic(
          FILES[1].id,
          FILES[1].ipfsHash,
          FILES[2].name,
          FILES[2].url,
          FILES[2].fileType
      ).send({gas: 500000});

      printGas(txReceipt, "Update one file", 9);
      let UpdateFile = getEvent(txReceipt, "UpdateFile");
      assert.equal(UpdateFile.projectId, FILES[1].id, "project ID incorrect")
      assert.equal(UpdateFile.ipfsHash, FILES[1].ipfsHash, "ipfsHash incorrect")
      assert.equal(UpdateFile.name, FILES[2].name, "name incorrect")
      assert.equal(UpdateFile.url, FILES[2].url, "url incorrect")
      assert.equal(UpdateFile.fileType, FILES[2].fileType, "fileType incorrect")

      let files = await fileReg.methods.getFiles(FILES[1].id, FILES[2].fileType).call();
      assert.equal(FILES[2].fileType, files[0].fileType);
      assert.equal(FILES[1].ipfsHash, files[0].ipfsHash);
      let type = await fileReg.methods.getFileType(FILES[1].id, FILES[1].ipfsHash).call();
      assert.equal(FILES[2].fileType, type);
      let isfile = await fileReg.methods.isProjectFile(FILES[1].id, FILES[1].ipfsHash).call();
      assert.equal(isfile, true);
    });
  })

  describe("_removeFile()", () => {
    it("should remove file from registry", async () => {
      let txReceipt = await fileReg.methods.removeFilePublic(FILES[1].id, FILES[1].ipfsHash).send({gas: 100000});
      printGas(txReceipt, "Delete one file", 9);

      let files = await fileReg.methods.getFiles(FILES[1].id, FILES[1].fileType).call();
      assert.deepEqual(files, [], "files should be empty");

      let type = await fileReg.methods.getFileType(FILES[1].id, FILES[1].ipfsHash).call();
      assert.equal(type, 0, "type should be empty");

      let isfile = await fileReg.methods.isProjectFile(FILES[1].id, FILES[1].ipfsHash).call();
      assert.equal(isfile, false);
    });

    it("should revert() while trying to remove non-existing file", async () => {
      await expectRevert.unspecified(fileReg.methods.removeFilePublic(FILES[1].id, FILES[1].ipfsHash).send());
    });

    it("should confirm that file is NOT in registry", async () => {
      let files = await fileReg.methods.getFiles(FILES[1].id, FILES[1].fileType).call();
      assert.deepEqual([], files);

      let f = await fileReg.methods.files(FILES[1].id, web3.utils.soliditySha3({t: 'string', v: FILES[1].ipfsHash})).call();
      assert.equal(0, new BN(f.fileType).toNumber());
      assert.equal('', f.ipfsHash);
    });

    describe("_validateSignature()", () => {
      it("should match JS hash with FileRegistry getHash", async () => {
        let hash = getHash(fileReg.options.address, "addFile", FILES[1], 10)
        let hashFR = await fileReg.methods.getHash(
          "addFile",
          FILES[1].id,
          FILES[1].ipfsHash,
          FILES[1].name,
          FILES[1].url,
          FILES[1].fileType,
          10
        ).call({from: admin, gas: 400000})
        assert.equal(hash, hashFR)
      })

      it("should validate signature", async () => {
        let hash = getHash(fileReg.options.address, "addFile", FILES[1], 10)
        let signature = Account.sign(hash, firstOwner.privateKey);
        let addr = await fileReg.methods.validateSignature(hash, signature, firstOwner.address)
          .call()
        assert.equal(addr, firstOwner.address)

        let n = await fileReg.methods.nonce(firstOwner.address).call()
        let tx = await fileReg.methods.validateSignature(hash, signature, firstOwner.address)
          .send({from: admin, gas: 400000})
        let nPrim = await fileReg.methods.nonce(firstOwner.address).call()
        assert.equal(++n, nPrim, "nonce did not increase")
      })

      it("should NOT validate signature for incorrect data", async () => {
        let hash = getHash(fileReg.options.address, "addFile", FILES[1], 10)
        let signature = Account.sign(hash, firstOwner.privateKey);
        await expectRevert(fileReg.methods.validateSignature(hash, signature, random.address)
          .send({from: admin, gas: 400000}), "Message has not been signed properly by signer")
      })
    })
  })

  describe("test public functions" , () => {
    let WorkRegistered, updateFileData;

    before("add music project", async () => {
      let data = ownershipImpl.contract.methods.init(
        secondOwner.address,
        ethDIDReg.address
      ).encodeABI();

      let metadata = {}
      metadata.title = 'title'
      metadata.titleSoundRecording = 'titleSoundRecording'
      metadata.iswc = web3.utils.asciiToHex('T-123.456.789-C:')
      metadata.territory = web3.utils.asciiToHex('usa')
      metadata.publishers = [
        web3.eth.accounts.create().address,
        web3.eth.accounts.create().address
      ]
      metadata.ownershipContract = ZERO_ADDRESS

      let obj = await getWorkHash({}, musicRegistry, secondOwner.address, "registerWork", 0, metadata, data);
      let signature = Account.sign(obj.hash, secondOwner.privateKey);

      let WorkRegisteredTX = await musicRegistry.contract.methods.registerWork(
          metadata,
          signature,
          data,
          secondOwner.address
      ).send({from: admin, gas: 1900000})
      WorkRegistered = getEvent(WorkRegisteredTX, 'WorkRegistered');
      FILES[3].id = WorkRegistered.workId
      updateFileData = {
        id: FILES[3].id,
        ipfsHash: FILES[3].ipfsHash,
        name: "File 3_2",
        url: "https://ipfs.com/<hash>",
        fileType: 1
      }
    })

    it("should addFile()", async () => {
      let nonce = await fileReg.methods.nonce(secondOwner.address).call()
      let hash = getHash(fileReg.options.address, "addFile", FILES[3], nonce)
      let signature = Account.sign(hash, secondOwner.privateKey)
      let txReceipt = await fileReg.methods.addFile(
        FILES[3].id,
        FILES[3].ipfsHash,
        FILES[3].name,
        FILES[3].url,
        FILES[3].fileType,
        signature,
        secondOwner.address
      ).send({from: admin, gas: 400000})
      printGas(txReceipt, "Add file with meta-tx", 9);

      let file = await fileReg.methods.getFile(FILES[3].id, FILES[3].ipfsHash).call()
      assert.equal(file.fileType, FILES[3].fileType)
      assert.equal(file.ipfsHash, FILES[3].ipfsHash)

      let NewFile = getEvent(txReceipt, "NewFile");
      assert.equal(NewFile.projectId, WorkRegistered.workId, "project ID incorrect")
      assert.equal(NewFile.ipfsHash, FILES[3].ipfsHash, "ipfsHash incorrect")
      assert.equal(NewFile.name, FILES[3].name, "name incorrect")
      assert.equal(NewFile.url, FILES[3].url, "url incorrect")
      assert.equal(NewFile.fileType, FILES[3].fileType, "fileType incorrect")
    })

    it("should updateFile()", async () => {
      let nonce = await fileReg.methods.nonce(secondOwner.address).call()
      let hash = getHash(fileReg.options.address, "updateFile", updateFileData, nonce)
      let signature = Account.sign(hash, secondOwner.privateKey)
      let txReceipt = await fileReg.methods.updateFile(
        updateFileData.id,
        updateFileData.ipfsHash,
        updateFileData.name,
        updateFileData.url,
        updateFileData.fileType,
        signature,
        secondOwner.address
      ).send({from: admin, gas: 400000})
      printGas(txReceipt, "Update file with meta-tx", 9);

      let file = await fileReg.methods.getFile(updateFileData.id, updateFileData.ipfsHash).call()
      assert.equal(file.fileType, updateFileData.fileType)
      assert.equal(file.ipfsHash, updateFileData.ipfsHash)

      let UpdateFile = getEvent(txReceipt, "UpdateFile");
      assert.equal(UpdateFile.projectId, updateFileData.id, "project ID incorrect")
      assert.equal(UpdateFile.ipfsHash, updateFileData.ipfsHash, "ipfsHash incorrect")
      assert.equal(UpdateFile.name, updateFileData.name, "name incorrect")
      assert.equal(UpdateFile.url, updateFileData.url, "url incorrect")
      assert.equal(UpdateFile.fileType, updateFileData.fileType, "fileType incorrect")
    })

    it("should NOT updateFile() if not owner", async () => {
      let nonce = await fileReg.methods.nonce(random.address).call()
      let hash = getHash(fileReg.options.address, "updateFile", updateFileData, nonce)
      let signature = Account.sign(hash, random.privateKey)
      await expectRevert.unspecified(fileReg.methods.updateFile(
        updateFileData.id,
        updateFileData.ipfsHash,
        updateFileData.name,
        updateFileData.url,
        updateFileData.fileType,
        signature,
        random.address
      ).send({from: admin, gas: 400000}))
    })

    it("should NOT removeFile() if not owner", async () => {
      let nonce = await fileReg.methods.nonce(random.address).call()
      let hash = web3.utils.soliditySha3(
        {t: 'bytes1', v: '0x19'},
        {t: 'bytes1', v: '0x0'},
        {t: 'address', v: fileReg.options.address},
        {t: 'string', v: "removeFile"},
        {t: 'bytes32', v: updateFileData.id},
        {t: 'string', v: updateFileData.ipfsHash},
        {t: 'uint', v: nonce}
      );
      let signature = Account.sign(hash, random.privateKey)

      await expectRevert.unspecified(fileReg.methods.removeFile(
        updateFileData.id,
        updateFileData.ipfsHash,
        signature,
        random.address
      ).send({from: admin, gas: 400000}))

      let file = await fileReg.methods.getFile(updateFileData.id, updateFileData.ipfsHash).call()
      assert.equal(file.fileType, updateFileData.fileType)
      assert.equal(file.ipfsHash, updateFileData.ipfsHash)
    })

    it("should removeFile()", async () => {
      let nonce = await fileReg.methods.nonce(secondOwner.address).call()
      let hash = web3.utils.soliditySha3(
        {t: 'bytes1', v: '0x19'},
        {t: 'bytes1', v: '0x0'},
        {t: 'address', v: fileReg.options.address},
        {t: 'string', v: "removeFile"},
        {t: 'bytes32', v: updateFileData.id},
        {t: 'string', v: updateFileData.ipfsHash},
        {t: 'uint', v: nonce}
      );
      let signature = Account.sign(hash, secondOwner.privateKey)

      let txReceipt = await fileReg.methods.removeFile(
        updateFileData.id,
        updateFileData.ipfsHash,
        signature,
        secondOwner.address
      ).send({from: admin, gas: 400000})
      printGas(txReceipt, "Remove file with meta-tx", 9);

      let file = await fileReg.methods.getFile(updateFileData.id, updateFileData.ipfsHash).call()
      assert.equal(file.fileType, 0, "fileType should be 0")
      assert.equal(file.ipfsHash, '', "ipfsHash should be empty")

      let DeleteFile = getEvent(txReceipt, "DeleteFile");
      assert.equal(DeleteFile.projectId, updateFileData.id, "id incorrect")
      assert.equal(DeleteFile.ipfsHash, updateFileData.ipfsHash, "ipfsHash incorrect")
    })
  })
})
