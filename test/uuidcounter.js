var UUIDCounter = artifacts.require("mock/UUIDCounterPublic.sol");
import { stripHexPrefix, getEvent } from './utils.js';

contract('UUIDCounter', function(accounts) {
  let provider;
  const countID = 300;
  let IDs;
  const WORK_FLAG = 87;
  const RECORDING_FLAG = 82;
  const admin = accounts[0];

  before(async function(){
    provider = await UUIDCounter.new();
    IDs = [];
  })

  it("should create " + countID + " UUIDs", async function() {
    let printed = 0;
    for (var i = 0; i < countID; i++) {
      let tx = await provider.contract.methods.newIDPublic(WORK_FLAG).send({from: admin})
      let UUID = getEvent(tx, 'UUID');
      assert.equal(IDs.indexOf(UUID.uuid), -1)
      let index = stripHexPrefix(web3.utils.numberToHex(i+1))
      let len = index.toString().length
      let expectedID = web3.utils.padRight(web3.utils.numberToHex(WORK_FLAG), 64 - len) + index;
      assert.equal(UUID.uuid, expectedID)
      IDs.push(UUID.uuid)
      if (process.stdout.clearLine) {
        process.stdout.clearLine()
        process.stdout.cursorTo(4)
        process.stdout.write("UUIDs tested: " + (i+1))
        printed = i;
      }
    }
    if (printed == 0) {
      console.log("UUIDs tested: " + (printed+1))
    }
    console.log('')
  });
});
