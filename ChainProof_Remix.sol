// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ChainProof - Supply Chain Provenance for Perishable Goods
 * @dev This contract can be copy-pasted directly into Remix IDE (https://remix.ethereum.org)
 * It handles role-based access, shipment creation, handoff logging, temperature monitoring, and anomaly detection entirely on the Ethereum blockchain.
 */
contract ChainProof {

    // --- ENUMS & STRUCTS ---

    enum Status { Green, Amber, Red }

    struct Handoff {
        address handler;
        string locationName;
        int256 temperature;
        string documentHash;
        string digitalSignatureURI; // e.g. IPFS link or base64
        uint256 timestamp;
        bool managerApproved;
    }

    struct Shipment {
        string shipmentId;
        string producerName;
        string goodsType;
        string origin;
        string destination;
        int256 safeTempThreshold;
        Status currentStatus;
        bool isDelivered;
        bool exists;
        uint256 handoffCount;
    }

    // --- STATE VARIABLES ---

    address public owner;
    
    // Mappings for Role-Based Access Control
    mapping(address => bool) public isManager;
    mapping(address => bool) public isMediator;

    // Shipments: Shipment ID => Shipment Details
    mapping(string => Shipment) public shipments;
    
    // Handoffs: Shipment ID => Handoff Index => Handoff Details
    mapping(string => mapping(uint256 => Handoff)) public shipmentHandoffs;

    // --- EVENTS ---

    event ShipmentCreated(string indexed shipmentId, string goodsType, string origin, string destination);
    event HandoffLogged(string indexed shipmentId, address indexed handler, int256 temperature, string documentHash);
    event AnomalyDetected(string indexed shipmentId, Status severity, string message);
    event HandoffApproved(string indexed shipmentId, uint256 handoffIndex, address manager);
    event ShipmentDelivered(string indexed shipmentId);

    // --- MODIFIERS ---

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    modifier onlyManager() {
        require(isManager[msg.sender] || msg.sender == owner, "Only managers can call this");
        _;
    }

    modifier onlyMediator() {
        require(isMediator[msg.sender] || isManager[msg.sender] || msg.sender == owner, "Only authorized handlers can call this");
        _;
    }

    modifier shipmentExists(string memory _shipmentId) {
        require(shipments[_shipmentId].exists, "Shipment does not exist");
        _;
    }

    // --- CONSTRUCTOR ---

    constructor() {
        owner = msg.sender;
        isManager[msg.sender] = true; // Deployer is automatically a manager
    }

    // --- ROLE MANAGEMENT ---

    function addManager(address _manager) external onlyOwner {
        isManager[_manager] = true;
    }

    function addMediator(address _mediator) external onlyManager {
        isMediator[_mediator] = true;
    }

    // --- CORE LOGIC ---

    /**
     * @dev Step 1: Manager creates a new shipment
     */
    function createShipment(
        string memory _shipmentId,
        string memory _producerName,
        string memory _goodsType,
        string memory _origin,
        string memory _destination,
        int256 _safeTempThreshold
    ) external onlyManager {
        require(!shipments[_shipmentId].exists, "Shipment ID already in use");

        shipments[_shipmentId] = Shipment({
            shipmentId: _shipmentId,
            producerName: _producerName,
            goodsType: _goodsType,
            origin: _origin,
            destination: _destination,
            safeTempThreshold: _safeTempThreshold,
            currentStatus: Status.Green,
            isDelivered: false,
            exists: true,
            handoffCount: 0
        });

        emit ShipmentCreated(_shipmentId, _goodsType, _origin, _destination);
    }

    /**
     * @dev Step 2: Mediator logs a handoff. This anchors the document hash and temperature reading directly on-chain.
     */
    function logHandoff(
        string memory _shipmentId,
        string memory _locationName,
        int256 _temperature,
        string memory _documentHash,
        string memory _digitalSignatureURI
    ) external onlyMediator shipmentExists(_shipmentId) {
        Shipment storage shipment = shipments[_shipmentId];
        require(!shipment.isDelivered, "Shipment is already delivered");

        uint256 currentIndex = shipment.handoffCount;

        // Record the handoff
        shipmentHandoffs[_shipmentId][currentIndex] = Handoff({
            handler: msg.sender,
            locationName: _locationName,
            temperature: _temperature,
            documentHash: _documentHash,
            digitalSignatureURI: _digitalSignatureURI,
            timestamp: block.timestamp,
            managerApproved: false
        });

        shipment.handoffCount++;

        emit HandoffLogged(_shipmentId, msg.sender, _temperature, _documentHash);

        // Anomaly Detection: Automatically flag temperature breaches
        if (_temperature >= shipment.safeTempThreshold) {
            shipment.currentStatus = Status.Red;
            emit AnomalyDetected(_shipmentId, Status.Red, "CRITICAL: Safe temperature threshold breached!");
        } 
        else if (_temperature >= shipment.safeTempThreshold - 2) {
            if (shipment.currentStatus != Status.Red) {
                shipment.currentStatus = Status.Amber;
                emit AnomalyDetected(_shipmentId, Status.Amber, "WARNING: Temperature approaching threshold.");
            }
        } 
        else {
            if (shipment.currentStatus != Status.Red) {
                shipment.currentStatus = Status.Green;
            }
        }
    }

    /**
     * @dev Step 3: Manager signs off / approves a specific handoff
     */
    function approveHandoff(string memory _shipmentId, uint256 _handoffIndex) external onlyManager shipmentExists(_shipmentId) {
        require(_handoffIndex < shipments[_shipmentId].handoffCount, "Invalid handoff index");
        require(!shipmentHandoffs[_shipmentId][_handoffIndex].managerApproved, "Already approved");

        shipmentHandoffs[_shipmentId][_handoffIndex].managerApproved = true;

        emit HandoffApproved(_shipmentId, _handoffIndex, msg.sender);
    }

    /**
     * @dev Step 4: Mark shipment as delivered
     */
    function markDelivered(string memory _shipmentId) external onlyManager shipmentExists(_shipmentId) {
        shipments[_shipmentId].isDelivered = true;
        emit ShipmentDelivered(_shipmentId);
    }

    // --- VIEW FUNCTIONS (For the Frontend / Consumers) ---

    /**
     * @dev Get total number of handoffs for a shipment to iterate over
     */
    function getHandoffCount(string memory _shipmentId) external view shipmentExists(_shipmentId) returns (uint256) {
        return shipments[_shipmentId].handoffCount;
    }

    /**
     * @dev Retrieve a specific handoff's details. Consumer can verify the documentHash here.
     */
    function getHandoff(string memory _shipmentId, uint256 _index) external view shipmentExists(_shipmentId) returns (
        address handler,
        string memory locationName,
        int256 temperature,
        string memory documentHash,
        string memory digitalSignatureURI,
        uint256 timestamp,
        bool managerApproved
    ) {
        require(_index < shipments[_shipmentId].handoffCount, "Invalid index");
        Handoff memory h = shipmentHandoffs[_shipmentId][_index];
        return (h.handler, h.locationName, h.temperature, h.documentHash, h.digitalSignatureURI, h.timestamp, h.managerApproved);
    }
}
