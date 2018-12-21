var ethutil = require("ethereumjs-util");
var sha3 = require("js-sha3").keccak_256;
var EthereumDIDRegistry = artifacts.require("./EthereumDIDRegistry.sol");
var BN = require("bn.js");
import { IpfsHash, ZERO_ADDRESS, stripHexPrefix } from './utils.js';
import { reverting } from 'openzeppelin-solidity/test/helpers/shouldFail';

contract("EthereumDIDRegistry", function(accounts) {
  let didReg;
  const identity = accounts[0];
  let owner;
  let previousChange;
  const identity2 = accounts[1];
  const delegate = accounts[2];
  const delegate2 = accounts[3];
  const delegate3 = accounts[4];
  const delegate4 = accounts[5];
  const delegate5 = accounts[6];
  const badboy = accounts[9];

  const privateKey = Buffer.from(
    "a285ab66393c5fdda46d6fbad9e27fafd438254ab72ad5acb681a0e9f20f5d7b",
    "hex"
  );
  const signerAddress = "0x2036C6CD85692F0Fb2C26E6c6B2ECed9e4478Dfd";

  const privateKey2 = Buffer.from(
    "a285ab66393c5fdda46d6fbad9e27fafd438254ab72ad5acb681a0e9f20f5d7a",
    "hex"
  );
  const signerAddress2 = "0xEA91e58E9Fa466786726F0a947e8583c7c5B3185";

  before(async () => {
    didReg = await EthereumDIDRegistry.new();
  });

  function getBlock(blockNumber) {
    return new Promise((resolve, reject) => {
      web3.eth.getBlock(blockNumber, (error, block) => {
        if (error) return reject(error);
        resolve(block);
      });
    });
  }

  function bytes32ToString(bytes) {
    return Buffer.from(bytes.slice(2).split("00")[0], "hex").toString();
  }

  function stringToBytes32(str) {
    const buffstr = Buffer.from(str).toString("hex");
    return buffstr + "0".repeat(64 - buffstr.length);
  }

  function leftPad(data, size = 64) {
    if (data.length === size) return data;
    return "0".repeat(size - data.length) + data;
  }

  async function signData(identity, signer, key, data) {
    const nonce = await didReg.nonce(signer);
    const paddedNonce = leftPad(Buffer.from([nonce], 64).toString("hex"));
    const dataToSign =
      "1900" +
      stripHexPrefix(didReg.address) +
      paddedNonce +
      stripHexPrefix(identity) +
      data;
    const hash = Buffer.from(sha3.buffer(Buffer.from(dataToSign, "hex")));
    const signature = ethutil.ecsign(hash, key);
    const publicKey = ethutil.ecrecover(
      hash,
      signature.v,
      signature.r,
      signature.s
    );
    return {
      r: "0x" + signature.r.toString("hex"),
      s: "0x" + signature.s.toString("hex"),
      v: signature.v
    };
  }

  describe("identityOwner()", () => {
    describe("default owner", () => {
      it("should return the identity address itself", async () => {
        const owner = await didReg.getIdentity(identity2);
        assert.equal(owner, identity2);
      });
      it("should confirm default owner", async () => {
        const result = await didReg.isIdentityOwner(identity2, identity2);
        assert.equal(result, true);
      })
    });

    describe("changed owner", () => {
      before(async () => {
        await didReg.addOwner(identity2, delegate, { from: identity2 });
        await didReg.revokeOwner(identity2, identity2, { from: identity2 });
      });
      it("should confirm removal of old owner", async () => {
        const result = await didReg.isIdentityOwner(identity2, identity2);
        assert.equal(result, false);
      });

      it("should return zero address for old owner", async () => {
        const id = await didReg.getIdentity(identity2);
        assert.equal(id, '0x0000000000000000000000000000000000000000');
      });

      it("should confirm the delegate address as owner", async () => {
        const newResult = await didReg.isIdentityOwner(identity2, delegate);
        assert.equal(newResult, true);
      });

      it("should return the identity address for delegate", async () => {
        const id2 = await didReg.getIdentity(delegate);
        assert.equal(id2, identity2);
      });
    });
  });

  describe("addOwner()", () => {
    describe("using msg.sender", () => {
      it("should disallow identity to be an owner on two identities", async () => {

      })
    })
  })

  describe("changeOwner()", () => {
    describe("using msg.sender", () => {
      describe("as current owner", () => {
        let tx1, tx2;
        before(async () => {
          tx1 = await didReg.addOwner(identity, delegate2, { from: identity });
          tx2 = await didReg.revokeOwner(identity, identity, { from: identity });
        });
        it("should change owner mapping", async () => {
          let result = await didReg.owners(identity, delegate2);
          assert.equal(result, 2);
        });
        it("should sets changed to transaction block", async () => {
          const latest = await didReg.changed(identity);
          assert.equal(latest, tx2.receipt.blockNumber);
        });
        it("should create DIDDelegateChanged event", () => {
          const event = tx1.logs[0];
          assert.equal(event.event, "DIDOwnerChanged");
          assert.equal(event.args.identity, identity);
          assert.equal(event.args.newOwner, delegate2);
          assert.equal(event.args.ownership, 2);
          assert.equal(event.args.previousChange.toNumber(), 0);
        });
      });

      describe("as new owner", () => {
        let tx1, tx2;
        before(async () => {
          previousChange = await didReg.changed(identity);
          tx1 = await didReg.addOwner(identity, delegate3, { from: delegate2 });
          tx2 = await didReg.revokeOwner(identity, delegate2, { from: delegate2 });
        });
        it("should change owner mapping", async () => {
          let result = await didReg.owners(identity, delegate3);
          assert.equal(result, 2);
        });
        it("should sets changed to transaction block", async () => {
          const latest = await didReg.changed(identity);
          assert.equal(latest, tx2.receipt.blockNumber);
        });
        it("should create DIDOwnerChanged event", () => {
          const event = tx1.logs[0];
          assert.equal(event.event, "DIDOwnerChanged");
          assert.equal(event.args.identity, identity);
          assert.equal(event.args.newOwner, delegate3);
          assert.equal(event.args.ownership, 2);
          assert.equal(
            event.args.previousChange.toNumber(),
            previousChange.toNumber()
          );
        });
      });

      describe("as original owner", () => {
        it("should fail", async () => {
          await reverting(didReg.addOwner(identity, identity, {from: identity}))
        });
      });

      describe("as attacker", () => {
        it("should fail", async () => {
          await reverting(didReg.addOwner(identity, badboy, {from: badboy}))
        });
      });
    });
    describe("using signature", () => {
      describe("as current owner", () => {
        let tx1, tx2;
        before(async () => {
          const sig = await signData(
            signerAddress,
            signerAddress,
            privateKey,
            Buffer.from("addOwner").toString("hex") +
              stripHexPrefix(signerAddress2)
          );
          let nonce = await didReg.nonce(signerAddress);
          tx1 = await didReg.addOwnerSigned(
            signerAddress,
            nonce,
            sig.v,
            sig.r,
            sig.s,
            signerAddress2,
            { from: badboy }
          );

          const sig2 = await signData(
            signerAddress,
            signerAddress,
            privateKey,
            Buffer.from("revokeOwner").toString("hex") +
              stripHexPrefix(signerAddress)
          );
          let nonce2 = await didReg.nonce(signerAddress);
          tx2 = await didReg.revokeOwnerSigned(
            signerAddress,
            nonce2,
            sig2.v,
            sig2.r,
            sig2.s,
            signerAddress,
            { from: badboy }
          );
        });
        it("should change owner mapping", async () => {
          const result = await didReg.owners(signerAddress, signerAddress2);
          assert.equal(result, 2);

          const resultOld = await didReg.owners(signerAddress, signerAddress);
          assert.equal(resultOld, 1);
        });
        it("should sets changed to transaction block", async () => {
          const latest = await didReg.changed(signerAddress);
          assert.equal(latest, tx2.receipt.blockNumber);
        });
        it("should create DIDOwnerChanged event", () => {
          const event = tx1.logs[0];
          assert.equal(event.event, "DIDOwnerChanged");
          assert.equal(event.args.identity, signerAddress);
          assert.equal(event.args.newOwner, signerAddress2);
          assert.equal(event.args.ownership, 2);
          assert.equal(event.args.previousChange.toNumber(), 0);

          const event2 = tx2.logs[0];
          assert.equal(event2.event, "DIDOwnerChanged");
          assert.equal(event2.args.identity, signerAddress);
          assert.equal(event2.args.newOwner, signerAddress);
          assert.equal(event2.args.ownership, 1);
          assert.equal(event2.args.previousChange.toNumber(), tx1.receipt.blockNumber);
        });


      });
    });
  });

  describe("addDelegate()", () => {
    describe("using msg.sender", () => {
      it("validDelegate should be false", async () => {
        const valid = await didReg.validDelegate(
          identity,
          web3.utils.asciiToHex("attestor"),
          delegate3
        );
        assert.equal(valid, false, "not yet assigned delegate correctly");
      });
      describe("as current owner", () => {
        let tx;
        let block;
        before(async () => {
          previousChange = await didReg.changed(identity);
          tx = await didReg.addDelegate(
            identity,
            web3.utils.asciiToHex("attestor"),
            delegate3,
            86400,
            { from: delegate3 }
          );
          block = await getBlock(tx.receipt.blockNumber);
        });
        it("validDelegate should be true", async () => {
          const valid = await didReg.validDelegate(
            identity,
            web3.utils.asciiToHex("attestor"),
            delegate3
          );
          assert.equal(valid, true, "assigned delegate correctly");
        });
        it("should sets changed to transaction block", async () => {
          const latest = await didReg.changed(identity);
          assert.equal(latest, tx.receipt.blockNumber);
        });
        it("should create DIDDelegateChanged event", () => {
          const event = tx.logs[0];
          assert.equal(event.event, "DIDDelegateChanged");
          assert.equal(event.args.identity, identity);
          assert.equal(bytes32ToString(event.args.delegateType), "attestor");
          assert.equal(event.args.delegate, delegate3);
          assert.equal(event.args.validTo.toNumber(), block.timestamp + 86400);
          assert.equal(
            event.args.previousChange.toNumber(),
            previousChange.toNumber()
          );
        });
      });

      describe("as attacker", () => {
        it("should fail", async () => {
          await reverting(didReg.addDelegate(
            identity,
            web3.utils.asciiToHex("attestor"),
            badboy,
            86400,
            { from: badboy }
          ))
        });
      });
    });
    describe("using signature", () => {
      describe("as current owner", () => {
        let tx1;
        let block1;
        let previousChange1;
        let tx2;
        let block2;
        let previousChange2;
        before(async () => {
          previousChange1 = await didReg.changed(signerAddress);
          let sig = await signData(
            signerAddress,
            signerAddress2,
            privateKey2,
            Buffer.from("addDelegate").toString("hex") +
              stringToBytes32("attestor") +
              stripHexPrefix(delegate) +
              leftPad(new BN(86400).toString(16))
          );
          let nonce = await didReg.nonce(signerAddress2);
          tx1 = await didReg.addDelegateSigned(
            signerAddress,
            nonce,
            sig.v,
            sig.r,
            sig.s,
            web3.utils.asciiToHex("attestor"),
            delegate,
            86400,
            { from: badboy }
          );
          block1 = await getBlock(tx1.receipt.blockNumber);
        });
        it("validDelegate should be true", async () => {
          let valid = await didReg.validDelegate(
            signerAddress,
            web3.utils.asciiToHex("attestor"),
            delegate
          );
          assert.equal(valid, true, "assigned delegate correctly");
        });
        it("should sets changed to transaction block", async () => {
          const latest = await didReg.changed(signerAddress);
          assert.equal(latest.toNumber(), tx1.receipt.blockNumber);
        });
        it("should create DIDDelegateChanged event", () => {
          let event = tx1.logs[0];
          assert.equal(event.event, "DIDDelegateChanged");
          assert.equal(event.args.identity, signerAddress);
          assert.equal(bytes32ToString(event.args.delegateType), "attestor");
          assert.equal(event.args.delegate, delegate);
          assert.equal(event.args.validTo.toNumber(), block1.timestamp + 86400);
          assert.equal(
            event.args.previousChange.toNumber(),
            previousChange1.toNumber()
          );
        });
      });
    });
  });

  describe("revokeDelegate()", () => {
    describe("using msg.sender", () => {
      it("validDelegate should be true", async () => {
        const valid = await didReg.validDelegate(
          identity,
          web3.utils.asciiToHex("attestor"),
          delegate3
        );
        assert.equal(valid, true, "not yet revoked");
      });
      describe("as current owner", () => {
        let tx;
        let block;
        before(async () => {
          previousChange = await didReg.changed(identity);
          tx = await didReg.revokeDelegate(identity, web3.utils.asciiToHex("attestor"), delegate3, {
            from: delegate3
          });
          block = await getBlock(tx.receipt.blockNumber);
        });
        it("validDelegate should be false", async () => {
          const valid = await didReg.validDelegate(
            identity,
            web3.utils.asciiToHex("attestor"),
            delegate3
          );
          assert.equal(valid, false, "revoked correctly");
        });
        it("should sets changed to transaction block", async () => {
          const latest = await didReg.changed(identity);
          assert.equal(latest, tx.receipt.blockNumber);
        });
        it("should create DIDDelegateChanged event", () => {
          const event = tx.logs[0];
          assert.equal(event.event, "DIDDelegateChanged");
          assert.equal(event.args.identity, identity);
          assert.equal(bytes32ToString(event.args.delegateType), "attestor");
          assert.equal(event.args.delegate, delegate3);
          assert.isBelow(
            event.args.validTo.toNumber(),
            Math.floor(Date.now() / 1000) + 1
          );
          assert.equal(
            event.args.previousChange.toNumber(),
            previousChange.toNumber()
          );
        });
      });
      describe("as attacker", () => {
        it("should fail", async () => {
          await reverting(didReg.revokeDelegate(
            identity,
            web3.utils.asciiToHex("attestor"),
            badboy,
            { from: badboy }
          ))
        });
      });
    });
    describe("using signature", () => {
      describe("as current owner", () => {
        let tx;
        before(async () => {
          previousChange = await didReg.changed(signerAddress);
          let sig = await signData(
            signerAddress,
            signerAddress2,
            privateKey2,
            Buffer.from("revokeDelegate").toString("hex") +
              stringToBytes32("attestor") +
              stripHexPrefix(delegate)
          );
          let nonce = await didReg.nonce(signerAddress2);
          tx = await didReg.revokeDelegateSigned(
            signerAddress,
            nonce,
            sig.v,
            sig.r,
            sig.s,
            web3.utils.asciiToHex("attestor"),
            delegate,
            { from: badboy}
          );
          let block = await getBlock(tx.receipt.blockNumber);
        });
        it("validDelegate should be false", async () => {
          const valid = await didReg.validDelegate(
            signerAddress,
            web3.utils.asciiToHex("attestor"),
            delegate
          );
          assert.equal(valid, false, "revoked delegate correctly");
        });
        it("should sets changed to transaction block", async () => {
          const latest = await didReg.changed(signerAddress);
          assert.equal(latest, tx.receipt.blockNumber);
        });
        it("should create DIDDelegateChanged event", () => {
          const event = tx.logs[0];
          assert.equal(event.event, "DIDDelegateChanged");
          assert.equal(event.args.identity, signerAddress);
          assert.equal(bytes32ToString(event.args.delegateType), "attestor");
          assert.equal(event.args.delegate, delegate);
          assert.isBelow(
            event.args.validTo.toNumber(),
            Math.floor(Date.now() / 1000) + 1
          );
          assert.equal(
            event.args.previousChange.toNumber(),
            previousChange.toNumber()
          );
        });
      });
    });
  });

  describe("setAttribute()", () => {
    describe("using msg.sender", () => {
      describe("as current owner", () => {
        let tx;
        let block;
        before(async () => {
          previousChange = await didReg.changed(identity);
          tx = await didReg.setAttribute(
            identity,
            web3.utils.asciiToHex("encryptionKey"),
            web3.utils.asciiToHex("mykey"),
            86400,
            { from: delegate3 }
          );
          block = await getBlock(tx.receipt.blockNumber);
        });
        it("should sets changed to transaction block", async () => {
          const latest = await didReg.changed(identity);
          assert.equal(latest, tx.receipt.blockNumber);
        });
        it("should create DIDAttributeChanged event", () => {
          const event = tx.logs[0];
          assert.equal(event.event, "DIDAttributeChanged");
          assert.equal(event.args.identity, identity);
          assert.equal(bytes32ToString(event.args.name), "encryptionKey");
          assert.equal(event.args.value, "0x6d796b6579");
          assert.equal(event.args.validTo.toNumber(), block.timestamp + 86400);
          assert.equal(
            event.args.previousChange.toNumber(),
            previousChange.toNumber()
          );
        });
      });

      describe("as attacker", () => {
        it("should fail", async () => {
          await reverting(didReg.setAttribute(
            identity,
            web3.utils.asciiToHex("encryptionKey"),
            web3.utils.asciiToHex("mykey"),
            86400,
            { from: badboy }
          ))
        });
      });
    });

    describe("using signature", () => {
      describe("as current owner", () => {
        let tx, block;
        before(async () => {
          previousChange = await didReg.changed(signerAddress);
          const sig = await signData(
            signerAddress,
            signerAddress2,
            privateKey2,
            Buffer.from("setAttribute").toString("hex") +
              stringToBytes32("encryptionKey") +
              Buffer.from("mykey").toString("hex") +
              leftPad(new BN(86400).toString(16))
          );
          let nonce = await didReg.nonce(signerAddress2);
          tx = await didReg.setAttributeSigned(
            signerAddress,
            nonce,
            sig.v,
            sig.r,
            sig.s,
            web3.utils.asciiToHex("encryptionKey"),
            web3.utils.asciiToHex("mykey"),
            86400,
            { from: badboy }
          );
          block = await getBlock(tx.receipt.blockNumber);
        });
        it("should sets changed to transaction block", async () => {
          const latest = await didReg.changed(signerAddress);
          assert.equal(latest, tx.receipt.blockNumber);
        });
        it("should create DIDDelegateChanged event", () => {
          const event = tx.logs[0];
          assert.equal(event.event, "DIDAttributeChanged");
          assert.equal(event.args.identity, signerAddress);
          assert.equal(bytes32ToString(event.args.name), "encryptionKey");
          assert.equal(event.args.value, "0x6d796b6579");
          assert.equal(event.args.validTo.toNumber(), block.timestamp + 86400);
          assert.equal(
            event.args.previousChange.toNumber(),
            previousChange.toNumber()
          );
        });
      });
    });
  });

  describe("revokeAttribute()", () => {
    describe("using msg.sender", () => {
      describe("as current owner", () => {
        let tx;
        let block;
        before(async () => {
          previousChange = await didReg.changed(identity);
          tx = await didReg.revokeAttribute(
            identity,
            web3.utils.asciiToHex("encryptionKey"),
            web3.utils.asciiToHex("mykey"),
            { from: delegate3 }
          );
          block = await getBlock(tx.receipt.blockNumber);
        });
        it("should sets changed to transaction block", async () => {
          const latest = await didReg.changed(identity);
          assert.equal(latest, tx.receipt.blockNumber);
        });
        it("should create DIDAttributeChanged event", () => {
          const event = tx.logs[0];
          assert.equal(event.event, "DIDAttributeChanged");
          assert.equal(event.args.identity, identity);
          assert.equal(bytes32ToString(event.args.name), "encryptionKey");
          assert.equal(event.args.value, "0x6d796b6579");
          assert.equal(event.args.validTo.toNumber(), 0);
          assert.equal(
            event.args.previousChange.toNumber(),
            previousChange.toNumber()
          );
        });
      });

      describe("as attacker", () => {
        it("should fail", async () => {
          await reverting(didReg.revokeAttribute(
            identity,
            web3.utils.asciiToHex("encryptionKey"),
            web3.utils.asciiToHex("mykey"),
            { from: badboy }
          ))
        });
      });
    });

    describe("using signature", () => {
      describe("as current owner", () => {
        let tx;
        before(async () => {
          previousChange = await didReg.changed(signerAddress);
          const sig = await signData(
            signerAddress,
            signerAddress2,
            privateKey2,
            Buffer.from("revokeAttribute").toString("hex") +
              stringToBytes32("encryptionKey") +
              Buffer.from("mykey").toString("hex")
          );
          let nonce = await didReg.nonce(signerAddress2);
          tx = await didReg.revokeAttributeSigned(
            signerAddress,
            nonce,
            sig.v,
            sig.r,
            sig.s,
            web3.utils.asciiToHex("encryptionKey"),
            web3.utils.asciiToHex("mykey"),
            { from: badboy }
          );
          let block = await getBlock(tx.receipt.blockNumber);
        });
        it("should sets changed to transaction block", async () => {
          const latest = await didReg.changed(signerAddress);
          assert.equal(latest, tx.receipt.blockNumber);
        });
        it("should create DIDDelegateChanged event", () => {
          const event = tx.logs[0];
          assert.equal(event.event, "DIDAttributeChanged");
          assert.equal(event.args.identity, signerAddress);
          assert.equal(bytes32ToString(event.args.name), "encryptionKey");
          assert.equal(event.args.value, "0x6d796b6579");
          assert.equal(event.args.validTo.toNumber(), 0);
          assert.equal(
            event.args.previousChange.toNumber(),
            previousChange.toNumber()
          );
        });
      });
    });
  });

  describe("Events", () => {
    it("can create list", async () => {
      const history = [];
      previousChange = await didReg.changed(identity);
      const events = await didReg.getPastEvents('allEvents', {
        fromBlock: 0,
        toBlock: 'latest'
      })
      events.map((event, index) => {
        if (event.args.identity == identity)
          history.push(event.event);
      })
      assert.deepEqual(history, [
        "DIDOwnerChanged",
        "DIDOwnerChanged",
        "DIDOwnerChanged",
        "DIDOwnerChanged",
        "DIDDelegateChanged",
        "DIDDelegateChanged",
        "DIDAttributeChanged",
        "DIDAttributeChanged"
      ]);
    });
  });
});
