const { ethers } = require('ethers');

// The deployed contract ABI
const contractABI = [
  "function anchorDocument(string memory _shipmentId, string memory _documentHash) public",
  "function verifyDocument(string memory _documentHash) public view returns (bool isGenuine, string memory shipmentId, uint256 timestamp, address anchoredBy)"
];

// Initialize Provider (Connect to Hardhat Local Node)
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

// For writing to the blockchain, we need a signer. 
// Hardhat provides 20 test accounts. We will use the first one's private key.
const HARDHAT_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const wallet = new ethers.Wallet(HARDHAT_PRIVATE_KEY, provider);

// We will inject the contract address after we deploy it via Hardhat
let contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

let provenanceContract;

const getContract = () => {
  if (!provenanceContract && contractAddress) {
    provenanceContract = new ethers.Contract(contractAddress, contractABI, wallet);
  }
  return provenanceContract;
};

const setContractAddress = (address) => {
  contractAddress = address;
};

const anchorDocumentOnChain = async (shipmentId, documentHash) => {
  try {
    const contract = getContract();
    if (!contract) return null;
    
    console.log(`[Blockchain] Anchoring document ${documentHash.substring(0,8)}... for shipment ${shipmentId}`);
    const tx = await contract.anchorDocument(shipmentId, documentHash);
    await tx.wait(); // wait for block to be mined
    console.log(`[Blockchain] Anchored successfully. TxHash: ${tx.hash}`);
    return tx.hash;
  } catch (error) {
    console.error("[Blockchain Error]", error.message);
    throw error;
  }
};

const verifyDocumentOnChain = async (documentHash) => {
  try {
    const contract = getContract();
    if (!contract) return null;

    const result = await contract.verifyDocument(documentHash);
    return {
      isGenuine: result[0],
      shipmentId: result[1],
      timestamp: Number(result[2]), // Convert BigInt to Number
      anchoredBy: result[3]
    };
  } catch (error) {
    console.error("[Blockchain Error]", error.message);
    throw error;
  }
};

module.exports = {
  anchorDocumentOnChain,
  verifyDocumentOnChain,
  setContractAddress
};
