import { ZERO_ADDRESS } from './utils.js';
import { shouldBehaveLikeMusicRegistry } from './music_registry.behaviour.js';

var MusicRegistry = artifacts.require("./MusicRegistry.sol");
var MusicRegistryPublic = artifacts.require("./MusicRegistryPublic.sol");
var MusicLib = artifacts.require("./library/MusicLib.sol");

var ProxyFactory = artifacts.require("./ProxyFactory.sol");
var EthereumDIDRegistry = artifacts.require("./EthereumDIDRegistry.sol");
var OwnershipRoyaltiesAgreements = artifacts.require("./OwnershipRoyaltiesAgreements.sol");
var BN = web3.utils.BN;


contract("MusicRegistry", (accounts) => {
  let accountsPrivate = [];
  let Setup = {works: [], recordings: []};

  for (var i = 0; i < 10; i++) {
    accountsPrivate[i] = web3.eth.accounts.create();

    let metadata = {}
    metadata.title = 'title' + i
    metadata.titleSoundRecording = 'titleSoundRecording' + i
    metadata.iswc = web3.utils.asciiToHex('T-123.456.789-C:' + i)
    metadata.territory = web3.utils.asciiToHex('usa')
    metadata.publishers = [
      web3.eth.accounts.create().address,
      web3.eth.accounts.create().address
    ]
    metadata.ownershipContract = ZERO_ADDRESS
    Setup.works[i] = metadata

    let recording = {}
    recording.title = 'title recording' + i
    recording.versionTitle = 'versionTitle' + i
    recording.isrc = web3.utils.asciiToHex('R-123.456.789-C:' + i)
    recording.territory = web3.utils.asciiToHex('usa')
    recording.album_upc = web3.utils.asciiToHex('Album-123-:' + i)
    recording.labels = [
      web3.eth.accounts.create().address,
      web3.eth.accounts.create().address,
      web3.eth.accounts.create().address
    ]
    recording.workIds = [
      web3.utils.padRight(web3.utils.asciiToHex('870:' + i), 64),
      web3.utils.padRight(web3.utils.asciiToHex('820:' + i), 64),
      web3.utils.padRight(web3.utils.asciiToHex('871:' + i), 64)
    ]
    recording.ownershipContract = ZERO_ADDRESS
    Setup.recordings[i] = recording
  }

  // for (var i = 0; i < 10; i++) {
  //   Setup.owner[i] = web3.eth.accounts.create();
  // }

  // for (var i = 0; i < 10; i++) {
  //   Setup.contributor[i] = web3.eth.accounts.create();
  // }

  before("deploy contracts", async () => {
    Setup.accounts = accounts;
    Setup.admin = accounts[0];
    Setup.firstOwner = accountsPrivate[1];
    Setup.factoryOwner = accountsPrivate[2];
    Setup.random = accountsPrivate[3];

    Setup.ethDIDReg = await EthereumDIDRegistry.new({from: Setup.admin});
    Setup.ownershipImpl = await OwnershipRoyaltiesAgreements.new({from: Setup.admin});
    Setup.proxyFactory = await ProxyFactory.new({from: Setup.admin});

    Setup.MusicLib = await MusicLib.new({from: Setup.admin});
    MusicRegistry.link("MusicLib", Setup.MusicLib.address);
    MusicRegistryPublic.link("MusicLib", Setup.MusicLib.address);
    Setup.musicRegistryConstant = await MusicRegistry.new({from: Setup.admin});

    await Setup.proxyFactory.contract.methods.init(
      Setup.factoryOwner.address,
      Setup.musicRegistryConstant.address,
      Setup.ownershipImpl.address
    ).send({from: Setup.admin, gas: 500000});

    Setup.initialTX = await Setup.musicRegistryConstant.contract.methods.init(
      Setup.ethDIDReg.address,
      Setup.proxyFactory.address
    ).send({from: Setup.admin, gas: 500000});

    Setup.musicRegistryPublicConstant = await MusicRegistryPublic.new({from: Setup.admin});
    Setup.initialTX = await Setup.musicRegistryPublicConstant.contract.methods.init(
      Setup.ethDIDReg.address,
      Setup.proxyFactory.address
    ).send({from: Setup.admin, gas: 500000});
  });

  beforeEach("deploy new instance of MusicRegistry", async () => {
    Setup.musicRegistry = await MusicRegistry.new({from: Setup.admin});
    Setup.initialTX = await Setup.musicRegistry.contract.methods.init(
      Setup.ethDIDReg.address,
      Setup.proxyFactory.address
    ).send({from: Setup.admin, gas: 500000});
  });

  shouldBehaveLikeMusicRegistry(Setup);
})
