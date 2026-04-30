// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Provenance {
    struct Handoff {
        string location;
        int256 temperature;
        string documentHash;
        string signature;
        uint256 timestamp;
        address mediator;
        bool managerApproved;
        bool consumerApproved;
    }

    struct Shipment {
        string shipmentId;
        string goodsType;
        uint256 timestamp;
        address producer;
        bool exists;
        Handoff[] handoffs;
    }

    mapping(string => Shipment) private shipments;

    event ShipmentCreated(string indexed shipmentId, string goodsType, address producer);
    event HandoffLogged(string indexed shipmentId, string location, int256 temperature);
    event HandoffApproved(string indexed shipmentId, uint256 index, address approver);

    function createShipment(string memory _shipmentId, string memory _goodsType) public {
        require(!shipments[_shipmentId].exists, "Shipment already exists");

        shipments[_shipmentId].shipmentId = _shipmentId;
        shipments[_shipmentId].goodsType = _goodsType;
        shipments[_shipmentId].timestamp = block.timestamp;
        shipments[_shipmentId].producer = msg.sender;
        shipments[_shipmentId].exists = true;

        emit ShipmentCreated(_shipmentId, _goodsType, msg.sender);
    }

    function logHandoff(
        string memory _shipmentId, 
        string memory _location, 
        int256 _temperature, 
        string memory _documentHash,
        string memory _signature
    ) public {
        require(shipments[_shipmentId].exists, "Shipment does not exist");

        shipments[_shipmentId].handoffs.push(Handoff({
            location: _location,
            temperature: _temperature,
            documentHash: _documentHash,
            signature: _signature,
            timestamp: block.timestamp,
            mediator: msg.sender,
            managerApproved: false,
            consumerApproved: false
        }));

        emit HandoffLogged(_shipmentId, _location, _temperature);
    }

    function approveHandoff(string memory _shipmentId, uint256 _index, bool _isManager) public {
        require(shipments[_shipmentId].exists, "Shipment does not exist");
        require(_index < shipments[_shipmentId].handoffs.length, "Invalid handoff index");

        if (_isManager) {
            shipments[_shipmentId].handoffs[_index].managerApproved = true;
        } else {
            shipments[_shipmentId].handoffs[_index].consumerApproved = true;
        }

        emit HandoffApproved(_shipmentId, _index, msg.sender);
    }

    function getShipment(string memory _shipmentId) public view returns (
        string memory goodsType,
        uint256 timestamp,
        address producer,
        uint256 handoffCount
    ) {
        Shipment storage s = shipments[_shipmentId];
        require(s.exists, "Shipment does not exist");
        return (s.goodsType, s.timestamp, s.producer, s.handoffs.length);
    }

    function getHandoff(string memory _shipmentId, uint256 _index) public view returns (
        string memory location,
        int256 temperature,
        string memory documentHash,
        bool managerApproved,
        bool consumerApproved
    ) {
        Handoff storage h = shipments[_shipmentId].handoffs[_index];
        return (h.location, h.temperature, h.documentHash, h.managerApproved, h.consumerApproved);
    }
}
