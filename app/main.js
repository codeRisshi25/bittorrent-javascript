const process = require("process");
const fs = require('fs');
const crypto = require('crypto');
const encode = require('./encode');
const net = require('net');



function urlInfoHash (info_hash){
  const xs = [];
  for (let i = 0; i < info_hash.length; i += 2) {
    xs.push(info_hash.slice(i, i + 2));
  }
  const url_encoded_info_hash = xs.map((x) => "%" + x).join("");
  return url_encoded_info_hash;
}
async function trackerRequest(tracker_url, length) {
  const filename = process.argv[3];
  const info = torrentInfo(filename);
  const info_hash = infoHashGen(info);
  const url_encoded_info_hash = urlInfoHash(info_hash);
  const params = `info_hash=${url_encoded_info_hash}&peer_id=00112233445566778899&port=6881&uploaded=0&downloaded=0&left=${length}&compact=1`;

  try {
    const response = await fetch(`${tracker_url}?${params}`);
    const arrayBuffer = await response.arrayBuffer();
    const responseBuffer = Buffer.from(arrayBuffer);
    const decoded = decodeBencode(Buffer.from(responseBuffer, 'binary'));
    const peers = decoded.peers;
    if (Buffer.isBuffer(peers)) {
      const peerList = [];
      for (let i = 0; i < peers.length; i += 6) {
        const ip = peers.slice(i, i + 4).join('.');
        const port = peers.readUInt16BE(i + 4);
        peerList.push(`${ip}:${port}`);
      }
      console.log("Peers:", peerList.join(', '));
    } else {
      console.log("Peers:", peers);
    }
  } catch (error) {
    console.error('Error fetching tracker URL:', error);
  }
}

async function peerRequest(peerUrl){
  const pstr = 'BitTorrent protocol';
  const pstrlen = Buffer.from([pstr.length]);
  const reserved = Buffer.alloc(8, 0);
  const info = torrentInfo(process.argv[3]);
  const infoHash = Buffer.from(infoHashGen(info), 'hex');
  const peerID = Buffer.from("00112233445566778899");

  const client = new net.Socket();

  const [peerHost, peerPort] = peerUrl.split(':');
  
  const handshake = Buffer.concat([
    pstrlen,
    Buffer.from(pstr),
    reserved,
    infoHash,
    peerID
  ]);

  client.connect(peerPort,peerHost, ()=>{
    console.log("connected to peer");
    client.write(handshake);
  });

  client.on("data",(data)=>{
    console.log("Peer ID:",data.toString('hex').slice(-40));
    client.end();
  })

  client.on('error', (err) => {
    console.error('Client error:', err);
  });
}

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

function infoHashGen(info){
  const bencodedInfo = encode(info.info);
  return infoHash = crypto.createHash('sha1').update(bencodedInfo).digest('hex');
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
    // Read the .torrent file and print out the details
    const tracker_url = info.announce.toString();
    console.log("Tracker URL:", tracker_url);
    console.log("Length:", info.info.length);
    const infoHash = infoHashGen(info);
    console.log("Info Hash:", infoHash);
    const pieceLength = info.info['piece length'];
    console.log("Piece Length:",pieceLength);
    const pieces = info.info['pieces'];
    console.log("Piece Hashes:");
    for (let i = 0; i < pieces.length; i += 20) {
      console.log(pieces.slice(i,i+20).toString('hex'));
    }
  } else if (command == 'peers'){
    // Actually Connecting to the tracker server
    const filename = process.argv[3];
    const info = torrentInfo(filename);
    trackerRequest(info.announce.toString(),info.info['piece length']);
  } else if (command == 'handshake'){
    const peer = process.argv[4]
    peerRequest(peer.toString());
  }
  else {
    throw new Error(`Unknown command ${command}`);
  }
}

main();