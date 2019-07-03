import { stripHexPrefix } from './utils.js';
var SignatureDecoder = artifacts.require("./mock/SignatureDecoderPublic.sol");
var Account = require("eth-lib/lib/account");

contract("SignatureDecoder", (accounts) => {
  let SigVal;
  let accountsPrivate = [];
  for (var i = 10 - 1; i >= 0; i--) {
    accountsPrivate[i] = web3.eth.accounts.create();
  }

  before(async () => {
    SigVal = await SignatureDecoder.new()
  })

  describe("recoverKey()", () => {
    it("should recover signer", async () => {
      let hashSolidity = await SigVal.getHash('hash');
      let hashWeb3 = web3.utils.soliditySha3({t: 'string', v: 'hash'});
      assert.equal(hashSolidity, hashWeb3);

      let sig = Account.sign(hashWeb3, accountsPrivate[0].privateKey);
      let signer = await SigVal._recoverKey(hashWeb3, sig, 0);
      assert.equal(accountsPrivate[0].address, signer);
    });
  });

  describe("signatureSplit()", () => {
    it("should split all signatures properly", async () => {
      let signatures = [];
      let sigs = [];

      for (var i = 0; i < accountsPrivate.length; i++) {
        let sig = accountsPrivate[i].sign('hash' + i);
        sigs[i] = sig;
        signatures += stripHexPrefix(sig.signature);
      }
      signatures = '0x' + signatures;
      for (var i = 0; i < sigs.length; i++) {
        let result = await SigVal._signatureSplit(signatures, i);
        // console.log(sigs.length, signatures);
        assert.equal(sigs[i].v, web3.utils.numberToHex(result[0].toString()));
        assert.equal(sigs[i].r, result[1]);
        assert.equal(sigs[i].s, result[2]);
      }
    })
  });
})
