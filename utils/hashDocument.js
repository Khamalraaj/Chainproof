const crypto = require('crypto');

// Generate SHA-256 hash from file buffer
const hashDocument = (fileBuffer) => {
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
};

// Compare uploaded document hash with saved hash
const verifyDocument = (fileBuffer, savedHash) => {
  const newHash = hashDocument(fileBuffer);
  return {
    isGenuine: newHash === savedHash,
    newHash,
    savedHash
  };
};

module.exports = { hashDocument, verifyDocument };
