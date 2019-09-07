const { expectRevert } = require('openzeppelin-test-helpers');
import { getEvent, printGas, stripHexPrefix, ZERO_ADDRESS, ZERO_BYTES32 } from '../test/utils.js';
import { getWorkHash } from '../test/music_registry.behaviour.js';
import { prepareTransferData, assertNewOwnershipAgreementEvent } from '../test/ownership_royalties_agreements.behaviour.js';

var BN = web3.utils.BN;
var Account = require("eth-lib/lib/account");

var MusicRegistry = artifacts.require("./MusicRegistry.sol");
var MusicLib = artifacts.require("./library/MusicLib.sol");

var ProxyFactory = artifacts.require("./ProxyFactory.sol");
var EthereumDIDRegistry = artifacts.require("./EthereumDIDRegistry.sol");
var OwnershipRoyaltiesAgreements = artifacts.require("./OwnershipRoyaltiesAgreements.sol");

contract("Backend Test Data", (accounts) => {
  let musicRegistry, ownershipImpl;
  let users = [];
  const admin = accounts[0];
  const salt='SomeMagicSaltToEncrypt^#&^R%#@&%$%#R%@Data';
  const emailDomain = '@mail-desk.net';

  describe("login()", () => {
    console.log('salt', salt);
    let userEmail, messageToSign, signature, checkSignature;

    before(() => {
      // web3.eth.accounts.create();
    })

    it("should render login test data", async () => {
      let user = web3.eth.accounts.privateKeyToAccount('0xa453611d9419d0e56f499079478fd72c37b251a94bfde4d19872c44cf65386e3');
      users.push(user);

      // check email at https://temp-mail.org/en/
      userEmail = 'testemail2833_1' + emailDomain;
      messageToSign = userEmail + salt;

      checkSignature = web3.eth.accounts.sign(messageToSign, user.privateKey);
      console.log({
        "avatar": "RIUGHIRBVIWRH(2397ryhirREIWYRGWEYRGWEURE",
        "deviceType": "MOBILE",
        "email": userEmail,
        "name": "Devfrom",
        "publicKey": user.address,
        "signature": checkSignature.signature,
        "surname": "Oopfrom",
        "userType": "SONGWRITER"
      });

      user = web3.eth.accounts.privateKeyToAccount('0x829e924fdf021ba3dbbc4225edfece9aca04b929d6e75613329ca6f1d31c0bb4');
      users.push(user);

      // check email at https://temp-mail.org/en/
      userEmail = 'testemail2833_2' + emailDomain;
      messageToSign = userEmail + salt;

      checkSignature = web3.eth.accounts.sign(messageToSign, user.privateKey);
      console.log({
        "avatar": "RIUGHIRBVIWRH(2397ryhirREIWYRGWEYRGWEURE",
        "deviceType": "MOBILE",
        "email": userEmail,
        "name": "Devfrom",
        "publicKey": user.address,
        "signature": checkSignature.signature,
        "surname": "Oopfrom",
        "userType": "SONGWRITER"
      });

      user = web3.eth.accounts.privateKeyToAccount('0xb0057716d5917badaf911b193b12b910811c1497b5bada8d7711f758981c3773');
      users.push(user);

      // check email at https://temp-mail.org/en/
      userEmail = 'testemail2833_3' + emailDomain;
      messageToSign = userEmail + salt;

      checkSignature = web3.eth.accounts.sign(messageToSign, user.privateKey);
      console.log({
        "avatar": "RIUGHIRBVIWRH(2397ryhirREIWYRGWEYRGWEURE",
        "deviceType": "MOBILE",
        "email": userEmail,
        "name": "Devfrom",
        "publicKey": user.address,
        "signature": checkSignature.signature,
        "surname": "Oopfrom",
        "userType": "SONGWRITER"
      });
    });
  })

  describe("should render register new work test data", () => {
    let WorkRegistered, WorkRegisteredTX;
    let ethDIDReg, proxyFactory, ethDIDRegAddress;
    let works = [];

    before("deploy contracts", async () => {
      let metadata = {}
      metadata.title = 'CUED-P1';
      metadata.titleSoundRecording = '';
      metadata.iswc = ZERO_BYTES32;
      metadata.territory = ZERO_BYTES32
      metadata.publishers = []
      metadata.ownershipContract = ZERO_ADDRESS
      works[0] = metadata
      ethDIDReg = await EthereumDIDRegistry.at('0xCfEB869F69431e42cdB54A4F4f105C19C080A601');

      ownershipImpl = await OwnershipRoyaltiesAgreements.new({from: admin});
      musicRegistry = await MusicRegistry.at('0xC89Ce4735882C9F0f0FE26686c53074E09B0D550');
    });

    it("should register new work", async () => {
      let data = ownershipImpl.contract.methods.init(
        users[0].address,
        ethDIDReg.address
      ).encodeABI();

      let obj = await getWorkHash(
        { "ownershipImpl": ownershipImpl, "firstOwner": users[0], "ethDIDReg": ethDIDReg },
        musicRegistry, users[0].address, "registerWork", 0, works[0], data);
      let signature = Account.sign(obj.hash, users[0].privateKey);

      // don't send actual transaction because data will go invalid
      // WorkRegisteredTX = await musicRegistry.contract.methods.registerWork(
      //     works[0],
      //     signature,
      //     data,
      //     users[0].address
      // ).send({from: admin, gas: 1900000})

      // WorkRegistered = getEvent(WorkRegisteredTX, 'WorkRegistered');
      // console.log('Events', WorkRegistered);

      console.log({
        "ownershipContractInitData": data,
        "projectId": "{{projectId}}",
        "signature": signature,
        "signer": users[0].address,
        "smartContractType": "COMPOSITION"
      });
    });
  });



  describe("should generate new ownership contract data", () => {
    it("should transfer ownership and royalties", async () => {
      const templateHash = '0x407d73d8a49eeb85d32cf465507dd71d507100c1000000000000000000000000';
      let workObj = await musicRegistry.contract.methods.works('0x5700000000000000000000000000000000000000000000000000000000000001').call();
      console.log(workObj.ownershipContract);
      const ownershipContractAddress = workObj.ownershipContract;
      const fromAddress = users[0];
      // const fromSignature = '';
      const percentage = 25;
      // const toSignature = '';
      const toAddress = users[1];
      // const ownershipContractConstant = await OwnershipRoyaltiesAgreements.new({from: Setup.admin});

      let ownershipContract = new web3.eth.Contract(
        ownershipImpl.abi,
        ownershipContractAddress,
        {from: admin}
      );

      // let originalBalances = await getOriginalBalances(users, ownershipContractAddress);
      let args = await prepareTransferData([0], [1], [percentage], [fromAddress, toAddress], "OwnershipTransfer", ownershipContract);
      console.log(args);
      // don't send actual transaction because data will go invalid
      // let tx = await ownershipContract.methods.newOwnershipTransferAgreement(
      //   args.templateHash,
      //   args.templateVersion,
      //   args.sigSenders,
      //   args.sigReceivers,
      //   args.senderSigners,
      //   args.receiverSigners,
      //   args.values
      // ).send({gas: 1500000});

      // assertNewOwnershipAgreementEvent(tx, args);

      console.log({
        "type": "OWNERSHIP",
        "projectId": "{{projectId}}",
        "kind": "COMPOSITION",
        "templateHash": args.templateHash,
        "templateCode": args.templateVersion
      });

      console.log({
        "transfers": [
          {
            "contractId": ownershipContract.address,
            "contractType": "OWNERSHIP",
            "fromAddress": args.senderSigners[0],
            "fromId": "{{emailFromUserId}}",
            "percentage": args.values[0],
            "projectId": "{{projectId}}",
            "signature": args.senderSigners[0],
            "signer": args.senderSigners[0],
            "toAddress": args.receiverSigners[0],
            "toId":"{{emailFromUserId}}"
          }
        ]
      });

      console.log({
        "signature": args.sigReceivers,
        "signer":args.receiverSigners[0]
      })

    });
  });
})
