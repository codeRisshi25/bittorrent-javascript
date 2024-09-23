const process = require("process");
const fs = require('fs');
const crypto = require('crypto');
const encode = require('./encode');


//! function to decode the BenCoded Value

function decodeBencode(bencodedValue, needString = false) {
  let position = 0;
  function parse() {
    const data = bencodedValue.slice(position);
    const dataStr = data.toString();
    const type = dataStr[0];
    // Check if the first character is a digit
    if (!isNaN(type)) {
      const firstColonIndex = dataStr.indexOf(":");
      if (firstColonIndex === -1) {
        throw new Error("Invalid encoded value");
      }
      const len = parseInt(data.slice(0, firstColonIndex).toString(), 10);      
      const value = data.slice(firstColonIndex + 1, firstColonIndex + 1 + len);
      position += firstColonIndex + len + 1;
      return needString ? value.toString() : value;
    } else if (type == "i") {
      const end = dataStr.indexOf("e");
      const value = parseInt(data.slice(1, end), 10);
      position += end + 1;
      return value;
    } else if (type == "l") {
      const value = [];
      position++;
      while (bencodedValue[position] !== 101) {
        value.push(parse());
      }
      position++;
      return value;
    } else if (type == "d") {
      const value = {};
      position++;
      while (bencodedValue[position] !== 101) {
        const key = parse();
        const val = parse();
        value[key] = val;
      }
      position++;
      return value;
    } else {
      throw new Error("Strange type:" + type + " in " + dataStr);
    }
  }
  return parse(bencodedValue);
}

function torrentInfo(filename){
  const content = fs.readFileSync(filename);
  const decoded = decodeBencode(content);
  return decoded;
}

//! main function 
function main() {
  const command = process.argv[2];
  if (command === "decode") {
    const bencodedValue = process.argv[3];
    // In JavaScript, there's no need to manually convert bytes to string for printing
    // because JS doesn't distinguish between bytes and strings in the same way Python does.
    console.log(JSON.stringify(decodeBencode(Buffer.from(bencodedValue),  true)));
  } else if (command === "info") {
    const filename = process.argv[3];
    const info = torrentInfo(filename);
    console.log("Tracker URL:", info.announce.toString());
    console.log("Length:", info.info.length);
    const bencodedInfo = encode(info.info);
    const infoHash = crypto.createHash('sha1').update(bencodedInfo).digest('hex');
    console.log("Info Hash:", infoHash);
    console.log("Piece Length:",info.info['piece length']);
    const pieces = info.info['pieces'];
    console.log("Piece Hashes:");
    for (let i = 0; i < pieces.length; i += 20) {
      console.log(pieces.slice(i,i+20).toString('hex'));
    }
  } else {
    throw new Error(`Unknown command ${command}`);
  }
}

main();