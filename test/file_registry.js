import { reverting } from 'openzeppelin-solidity/test/helpers/shouldFail';
import { IpfsHash, ZERO_ADDRESS, stripHexPrefix, getEvent, printGas } from './utils.js';
var FileRegistry = artifacts.require("./mock/FileRegistryPublic.sol");
var Web3 = require('web3');
var web3 = new Web3(Web3.givenProvider || "ws://localhost:8546");
var BN = web3.utils.BN;


contract("FileRegistry", (accounts) => {
  let fileReg, admin;
  admin = accounts[0];
  const FILES = [{
    id: web3.utils.padLeft("0x0", 32),
    ipfsHash: "",
    name: "",
    url: "",
    fileType: 0
  },
  {
    id: web3.utils.padLeft("0x570000000000000000000eda873fab21", 32),
    ipfsHash: "QmahqCsAUAw7zMv6P6Ae8PjCTck7taQA6FgGQLnWdKG7U8",
    name: "File 1",
    url: "https://ipfs.com/<hash>",
    fileType: 6
  },
  {
    id: web3.utils.padLeft("0x520000000000000000000883193ff9a0", 32),
    ipfsHash: "Qmb4atcgbbN5v4CDJ8nz5QG5L2pgwSTLd3raDrnyhLjnUH",
    name: "File 2",
    url: "https://ipfs.com/<hash>",
    fileType: 7
  }]

  before("deploy FileRegistry", async () => {
    fileReg = await FileRegistry.new();
    fileReg = new web3.eth.Contract(
        fileReg.abi, fileReg.address, {from: admin});
  });

  it("should revert() while trying to add file to registry with invalid data", async () => {
    await reverting(fileReg.methods.addFile(
      FILES[0].id,
      FILES[1].ipfsHash,
      FILES[1].name,
      FILES[1].url,
      FILES[1].fileType
    ).send({gas: 200000}));

    await reverting(fileReg.methods.addFile(
      FILES[1].id,
      FILES[0].ipfsHash,
      FILES[1].name,
      FILES[1].url,
      FILES[1].fileType
    ).send({gas: 200000}));

    await reverting(fileReg.methods.addFile(
      FILES[1].id,
      FILES[1].ipfsHash,
      FILES[1].name,
      FILES[1].url,
      FILES[0].fileType
    ).send({gas: 200000}));
  });

  it("should add file to registry", async () => {
    let txReceipt = await fileReg.methods.addFile(
      FILES[1].id,
      FILES[1].ipfsHash,
      FILES[1].name,
      FILES[1].url,
      FILES[1].fileType
    ).send({gas: 200000});

    printGas(txReceipt, "Add one file");
    let NewFile = getEvent(txReceipt, "NewFile");
    NewFile.projectId.should.eq(FILES[1].id);
    NewFile.ipfsHash.should.eq(FILES[1].ipfsHash);
    NewFile.name.should.eq(FILES[1].name);
    NewFile.url.should.eq(FILES[1].url);
    new BN(NewFile.fileType).toNumber().should.eq(FILES[1].fileType);

    txReceipt = await fileReg.methods.addFile(
      FILES[2].id,
      FILES[2].ipfsHash,
      FILES[2].name,
      FILES[2].url,
      FILES[2].fileType
    ).send({gas: 200000});

    printGas(txReceipt, "Add one file");
    NewFile = getEvent(txReceipt, "NewFile");
    NewFile.projectId.should.eq(FILES[2].id);
    NewFile.ipfsHash.should.eq(FILES[2].ipfsHash);
    NewFile.name.should.eq(FILES[2].name);
    NewFile.url.should.eq(FILES[2].url);
    new BN(NewFile.fileType).toNumber().should.eq(FILES[2].fileType);
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

  it("should update file in registry", async () => {
    let txReceipt = await fileReg.methods.updateFile(
        FILES[1].id,
        FILES[1].ipfsHash,
        FILES[2].name,
        FILES[2].url,
        FILES[2].fileType
    ).send({gas: 200000});

    printGas(txReceipt, "Update one file");
    let UpdateFile = getEvent(txReceipt, "UpdateFile");
    UpdateFile.projectId.should.eq(FILES[1].id);
    UpdateFile.ipfsHash.should.eq(FILES[1].ipfsHash);
    UpdateFile.name.should.eq(FILES[2].name);
    UpdateFile.url.should.eq(FILES[2].url);
    new BN(UpdateFile.fileType).toNumber().should.eq(FILES[2].fileType);

    let files = await fileReg.methods.getFiles(FILES[1].id, FILES[2].fileType).call();
    assert.equal(FILES[2].fileType, files[0].fileType);
    assert.equal(FILES[1].ipfsHash, files[0].ipfsHash);
    let type = await fileReg.methods.getFileType(FILES[1].id, FILES[1].ipfsHash).call();
    assert.equal(FILES[2].fileType, type);
    let isfile = await fileReg.methods.isProjectFile(FILES[1].id, FILES[1].ipfsHash).call();
    assert.equal(isfile, true);
  });

  it("should remove file from registry", async () => {
    let txReceipt = await fileReg.methods.removeFile(FILES[1].id, FILES[1].ipfsHash).send({gas: 100000});
    printGas(txReceipt, "Delete one file");

    let files = await fileReg.methods.getFiles(FILES[1].id, FILES[1].fileType).call();
    files.should.eql([]);

    let type = await fileReg.methods.getFileType(FILES[1].id, FILES[1].ipfsHash).call();
    type.should.eq('0');

    let isfile = await fileReg.methods.isProjectFile(FILES[1].id, FILES[1].ipfsHash).call();
    assert.equal(isfile, false);
  });

  it("should revert() while trying to remove non-existing file", async () => {
    await reverting(fileReg.methods.removeFile(FILES[1].id, FILES[1].ipfsHash).send());
  });

  it("should confirm that file is NOT in registry", async () => {
    let files = await fileReg.methods.getFiles(FILES[1].id, FILES[1].fileType).call();
    assert.deepEqual([], files);

    let f = await fileReg.methods.files(FILES[1].id, web3.utils.soliditySha3({t: 'string', v: FILES[1].ipfsHash})).call();
    assert.equal(0, new BN(f.fileType).toNumber());
    assert.equal('', f.ipfsHash);
  });
})
