const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const Shipment = require('../models/Shipment');
const Handoff = require('../models/Handoff');
const { protect, allowRoles } = require('../middleware/authMiddleware');
const { getRandomDepot } = require('../utils/sendAlert');

// Generate unique shipment ID
const generateShipmentId = () => {
  return 'SHP-' + Date.now().toString(36).toUpperCase();
};

// POST /api/shipment/create — manager or mediator creates shipment
router.post('/create', protect, allowRoles('manager', 'senior_manager', 'mediator'), async (req, res) => {
  try {
    const { producerName, goodsType, origin, destination, temperatureThreshold, initialTemperature } = req.body;

    const shipmentId = generateShipmentId();

    // Generate QR code as base64
    const qrCode = await QRCode.toDataURL(shipmentId);

    const shipment = await Shipment.create({
      shipmentId,
      qrCode,
      producerName,
      goodsType,
      origin,
      destination,
      temperatureThreshold: parseFloat(temperatureThreshold),
      currentTemperature: parseFloat(initialTemperature) || parseFloat(temperatureThreshold) - 4,
      createdBy: req.user._id
    });

    res.status(201).json({
      message: 'Shipment created successfully',
      shipment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/shipment/all — get all shipments for manager dashboard
router.get('/all', protect, async (req, res) => {
  try {
    const shipments = await Shipment.find({ isDelivered: false }).sort({ createdAt: -1 });
    res.json(shipments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/shipment/:id — get single shipment with full handoff trail
router.get('/:id', async (req, res) => {
  try {
    const shipment = await Shipment.findOne({ shipmentId: req.params.id });
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }

    const handoffs = await Handoff.find({ shipmentId: req.params.id }).sort({ createdAt: 1 });

    res.json({ shipment, handoffs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/shipment/reroute/:id — approve rerouting
router.patch('/reroute/:id', protect, allowRoles('manager', 'senior_manager'), async (req, res) => {
  try {
    const shipment = await Shipment.findOne({ shipmentId: req.params.id });
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }

    const depot = getRandomDepot();

    await Shipment.findByIdAndUpdate(shipment._id, {
      isRerouted: true,
      rerouteDestination: depot.name,
      rerouteApprovedAt: new Date(),
      alertLevel: 0, // reset after action taken
      noActionSince: null
    });

    res.json({
      message: 'Reroute approved successfully',
      rerouteDestination: depot.name,
      address: depot.address
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/shipment/override-temperature/:id — for demo only
router.patch('/override-temperature/:id', protect, allowRoles('manager', 'senior_manager'), async (req, res) => {
  try {
    const { temperature } = req.body;
    const shipment = await Shipment.findOne({ shipmentId: req.params.id });
    if (!shipment) return res.status(404).json({ message: 'Shipment not found' });

    const newStatus = temperature >= shipment.temperatureThreshold ? 'red'
      : temperature >= shipment.temperatureThreshold - 2 ? 'amber' : 'green';

    await Shipment.findByIdAndUpdate(shipment._id, {
      currentTemperature: parseFloat(temperature),
      status: newStatus
    });

    res.json({ message: 'Temperature overridden', temperature, status: newStatus });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/shipment/deliver/:id — mark shipment as delivered
router.patch('/deliver/:id', protect, allowRoles('manager', 'senior_manager'), async (req, res) => {
  try {
    await Shipment.findOneAndUpdate({ shipmentId: req.params.id }, { isDelivered: true });
    res.json({ message: 'Shipment marked as delivered' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
