const AssertionError = require('assertion-error');

export const IpfsHash = '0x407d73d8a49eeb85d32cf465507dd71d507100c1000000000000000000000000'
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export function stripHexPrefix(str) {
  if (str.startsWith("0x")) {
    return str.slice(2);
  }
  return str;
}

export function getEvent(txReceipt, eventType, logIndex = 0) {
  try {
    let event;
    if(Array.isArray(txReceipt.events[eventType])) {
      event = txReceipt.events[eventType][logIndex];
    } else {
      event = txReceipt.events[eventType];
    }
    return event.returnValues;
  } catch(err) {
    throw new AssertionError('Event ' + eventType + ' not found in transaction receipt');
  }
}

export function printGas(txReceipt, msg, margin = 4) {
  process.stdout.clearLine()
  process.stdout.cursorTo(margin)
  process.stdout.write(msg + "\n");
  process.stdout.cursorTo(margin + 2)
  let gas = new Number(txReceipt.gasUsed)
  process.stdout.write("- gasUsed: " + gas.toLocaleString() + '\n');
}
