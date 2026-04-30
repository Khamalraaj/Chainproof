// Using Global Ethers from CDN to prevent bundler conflicts
const getEthers = () => {
  if (!window.ethers) {
    throw new Error("Ethers library not loaded. Please check your internet connection.");
  }
  return window.ethers;
};

const CONTRACT_ABI = [
  "function owner() public view returns (address)",
  "function isManager(address) public view returns (bool)",
  "function createShipment(string memory _shipmentId, string memory _producerName, string memory _goodsType, string memory _origin, string memory _destination, int256 _safeTempThreshold) external",
  "function logHandoff(string memory _shipmentId, string memory _location, int256 _temperature, string memory _documentHash, string memory _signature) external",
  "function approveHandoff(string memory _shipmentId, uint256 _index) external",
  "function markDelivered(string memory _shipmentId) external",
  "function getHandoffCount(string memory _shipmentId) public view returns (uint256)",
  "function getHandoff(string memory _shipmentId, uint256 _index) public view returns (address handler, string memory locationName, int256 temperature, string memory documentHash, string memory digitalSignatureURI, uint256 timestamp, bool managerApproved)",
  "function shipments(string) public view returns (string shipmentId, string producerName, string goodsType, string origin, string destination, int256 safeTempThreshold, uint8 currentStatus, bool isDelivered, bool exists, uint256 handoffCount)"
];

// Use the contract address from your Remix deployment
const CONTRACT_ADDRESS = "0x6215dA0952029Ec9E38F752e1BD58Ba24004D362"; 

export const getBlockchainContract = async () => {
  const ethers = getEthers();
  
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed. Please install it to use blockchain features.");
  }

  // Explicitly request account access
  await window.ethereum.request({ method: 'eth_requestAccounts' });

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
};

export const anchorShipmentOnChain = async (data) => {
  try {
    const contract = await getBlockchainContract();
    const ethers = getEthers();
    
    // 1. Verify Permissions to give a better error message
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();
    
    let isMgr = false;
    let isOwner = false;
    try {
      isMgr = await contract.isManager(userAddress);
      isOwner = (await contract.owner()).toLowerCase() === userAddress.toLowerCase();
    } catch (e) {
      throw new Error(`CONTRACT NOT FOUND: Could not connect to the contract at ${CONTRACT_ADDRESS.slice(0,10)}... Ensure you have deployed the contract and updated the address in blockchain.js.`);
    }
    
    if (!isMgr && !isOwner) {
      throw new Error(`Access Denied: ${userAddress.slice(0,6)}... is not a Manager. Please use the account that deployed the contract.`);
    }

    // 2. Check if Shipment ID is already taken on-chain
    const onChainShipment = await contract.shipments(data.shipmentId);
    if (onChainShipment.exists) {
      throw new Error(`REVERT: Shipment ID ${data.shipmentId} is already in use on-chain. Please use a unique ID.`);
    }

    console.log("Anchoring shipment on-chain:", data.shipmentId);
    
    const tx = await contract.createShipment(
      data.shipmentId,
      data.producerName || "Default Producer",
      data.goodsType,
      data.origin,
      data.destination,
      BigInt(Math.round(parseFloat(data.temperatureThreshold || 8)))
    );
    
    console.log("Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("Transaction confirmed:", receipt.hash);
    return receipt.hash;
  } catch (err) {
    console.error("Blockchain anchoring failed:", err);
    alert(err.message || "Transaction failed");
    throw err;
  }
};

export const anchorHandoffOnChain = async (shipmentId, locationName, temperature, documentHash, signature) => {
  try {
    const contract = await getBlockchainContract();
    console.log(`Anchoring handoff for ${shipmentId} at ${locationName}...`);
    
    // Updated to match new 5-argument ABI
    const tx = await contract.logHandoff(
      shipmentId,
      locationName,
      Math.round(parseFloat(temperature) * 10), // Store with 1 decimal precision
      documentHash,
      signature
    );
    
    console.log("Handoff transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("Handoff transaction confirmed:", receipt.hash);
    return receipt.hash;
  } catch (err) {
    console.error("Blockchain handoff anchoring failed:", err);
    throw err;
  }
};

export async function createShipmentOnChain(shipmentData) {
  return anchorShipmentOnChain(shipmentData);
}

export async function logHandoffOnChain(shipmentId, location, temperature, documentHash, signature) {
  return anchorHandoffOnChain(shipmentId, location, temperature, documentHash, signature);
}

export async function approveHandoffOnChain(shipmentId, handoffIndex) {
  const contract = await getBlockchainContract();
  const tx = await contract.approveHandoff(shipmentId, handoffIndex);
  await tx.wait();
  return tx.hash;
}

export async function markDeliveredOnChain(shipmentId) {
  const contract = await getBlockchainContract();
  const tx = await contract.markDelivered(shipmentId);
  await tx.wait();
  return tx.hash;
}

export const verifyShipmentOnChain = async (shipmentId) => {
  try {
    const contract = await getBlockchainContract();
    const count = await contract.getHandoffCount(shipmentId);
    
    return {
      exists: true,
      handoffCount: Number(count)
    };
  } catch (err) {
    console.error("Blockchain verification failed:", err);
    return { exists: false };
  }
};
