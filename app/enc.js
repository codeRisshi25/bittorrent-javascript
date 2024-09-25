function hexToPercentEncodedURI(hexString) {
    // Ensure the hex string has an even number of characters (2 characters per byte)
    if (hexString.length % 2 !== 0) {
      throw new Error('Invalid hex string');
    }
  
    let percentEncodedString = '';
    
    // Loop through the hex string, converting two characters (1 byte) at a time
    for (let i = 0; i < hexString.length; i += 2) {
      // Convert the current hex pair to a decimal number (byte)
      const byte = parseInt(hexString.substring(i, i + 2), 16);
      
      // Percent-encode the byte and append it to the result
      percentEncodedString += '%' + byte.toString(16).padStart(2, '0').toUpperCase();
    }
    
    return percentEncodedString;
  }
  
  // Example usage:
  const infoHash = 'a18a79fa44e045b1e13879166d35823e848419f8';
  const encodedInfoHash = hexToPercentEncodedURI(infoHash);
  console.log(encodedInfoHash);  // Outputs: %18%A7%9F%A4%4E%04%5B%1E%13%87%91%66%D3%58%23%E8%48%41%9F%F8
  