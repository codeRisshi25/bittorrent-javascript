const process = require("process");
const util = require("util");

// Examples:
// - decodeBencode("5:hello") -> "hello"
// - decodeBencode("10:hello12345") -> "hello12345"
// - decodeBencode("i12345e") -> 12345
function decodeBencode(bencodedValue) {
  if (!isNaN(bencodedValue[0])) {
    const firstColonIndex = bencodedValue.indexOf(":");
    if (firstColonIndex === -1) {
      throw new Error("Invalid encoded value");
    }
    const strLen = parseInt(bencodedValue.slice(0, firstColonIndex), 10);
    const strValue = bencodedValue.substr(firstColonIndex + 1, strLen);
    return [strValue, firstColonIndex + 1 + strLen];
  } else if (bencodedValue[0] === "i") {
    const firstEIndex = bencodedValue.indexOf("e");
    const intValue = parseInt(bencodedValue.slice(1, firstEIndex), 10);
    return [intValue, firstEIndex + 1];
  } else if (bencodedValue[0] === "l") {
    const list = [];
    let rest = bencodedValue.slice(1);
    while (rest[0] !== "e") {
      const [element, length] = decodeBencode(rest);
      list.push(element);
      rest = rest.slice(length);
    }
    return [list, bencodedValue.length - rest.length + 1];
  } else {
    throw new Error("Invalid encoded value");
  }
}

function main() {
  const command = process.argv[2];
  if (command === "decode") {
    const bencodedValue = process.argv[3];
    const [decodedValue] = decodeBencode(bencodedValue);
    console.log(JSON.stringify(decodedValue));
  } else {
    throw new Error(`Unknown command ${command}`);
  }
}

main();
