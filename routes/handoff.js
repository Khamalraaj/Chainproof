const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Handoff = require('../models/Handoff');
const Shipment = require('../models/Shipment');
const { protect, allowRoles } = require('../middleware/authMiddleware');
const { hashDocument } = require('../utils/hashDocument');
const { anchorDocumentOnChain, verifyDocumentOnChain } = require('../utils/blockchain');

// Multer config — save uploaded documents to /uploads folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// POST /api/handoff/log — mediator logs a handoff
router.post('/log', protect, allowRoles('mediator', 'manager'), upload.single('document'), async (req, res) => {
  try {
    const { shipmentId, temperature, locationName, locationLat, locationLng, mediatorSignature, notes } = req.body;

    const shipment = await Shipment.findOne({ shipmentId });
    if (!shipment) return res.status(404).json({ message: 'Shipment not found' });

    let documentHash = null;
    let documentUrl = null;
    let documentName = null;

    // Hash the document if uploaded
    if (req.file) {
      const fileBuffer = fs.readFileSync(req.file.path);
      documentHash = hashDocument(fileBuffer);
      documentUrl = req.file.path;
      documentName = req.file.originalname;
    }

    const handoff = await Handoff.create({
      shipmentId,
      handledBy: req.user._id,
      handlerName: req.user.name,
      role: req.user.role,
      location: {
        name: locationName || '',
        lat: parseFloat(locationLat) || 0,
        lng: parseFloat(locationLng) || 0
      },
      temperature: parseFloat(temperature),
      documentUrl,
      documentHash,
      documentName,
      mediatorSignature: mediatorSignature || null,
      notes: notes || ''
    });

    // Update shipment current temperature
    const newStatus = parseFloat(temperature) >= shipment.temperatureThreshold ? 'red'
      : parseFloat(temperature) >= shipment.temperatureThreshold - 2 ? 'amber' : 'green';

    await Shipment.findByIdAndUpdate(shipment._id, {
      currentTemperature: parseFloat(temperature),
      status: newStatus,
      currentLocation: {
        lat: parseFloat(locationLat) || shipment.currentLocation.lat,
        lng: parseFloat(locationLng) || shipment.currentLocation.lng
      }
    });

    // Anchor the document on the blockchain
    if (documentHash) {
      try {
        await anchorDocumentOnChain(shipmentId, documentHash);
      } catch (err) {
        console.error("Blockchain anchoring failed, but continuing:", err);
      }
    }

    res.status(201).json({
      message: 'Handoff logged successfully',
      handoff,
      documentHash,
      shipmentStatus: newStatus
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/handoff/sign/:handoffId — manager signs off on a handoff
router.patch('/sign/:handoffId', protect, allowRoles('manager', 'senior_manager'), async (req, res) => {
  try {
    const { managerSignature, approved, notes } = req.body;

    const handoff = await Handoff.findById(req.params.handoffId);
    if (!handoff) return res.status(404).json({ message: 'Handoff not found' });

    if (handoff.managerApproved) {
      return res.status(400).json({ message: 'Handoff already signed' });
    }

    await Handoff.findByIdAndUpdate(req.params.handoffId, {
      managerSignature: managerSignature || null,
      managerApproved: approved !== false,
      managerId: req.user._id,
      managerApprovedAt: new Date(),
      notes: notes || handoff.notes
    });

    res.json({ message: approved !== false ? 'Handoff approved and signed' : 'Handoff rejected' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/handoff/verify-document — check if a document is tampered using Blockchain
router.post('/verify-document', upload.single('document'), async (req, res) => {
  try {
    const { savedHash } = req.body;

    if (!req.file) return res.status(400).json({ message: 'No document uploaded' });
    if (!savedHash) return res.status(400).json({ message: 'Saved hash is required' });

    const fileBuffer = fs.readFileSync(req.file.path);
    const newHash = hashDocument(fileBuffer);
    
    // Check against blockchain
    const blockchainResult = await verifyDocumentOnChain(savedHash);

    // Clean up temp file
    fs.unlinkSync(req.file.path);

    const isGenuine = (newHash === savedHash) && blockchainResult && blockchainResult.isGenuine;

    res.json({
      isGenuine: isGenuine,
      status: isGenuine ? 'GENUINE' : 'TAMPERED',
      message: isGenuine
        ? `Document is authentic. Verified on Blockchain (Anchored at ${new Date(blockchainResult.timestamp * 1000).toLocaleString()}).`
        : 'Document has been tampered. Hash does not match the blockchain record.',
      newHash: newHash,
      savedHash: savedHash,
      blockchainData: blockchainResult
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/handoff/pending — get all handoffs waiting for manager sign-off
router.get('/pending', protect, allowRoles('manager', 'senior_manager'), async (req, res) => {
  try {
    const pending = await Handoff.find({ managerApproved: false }).sort({ createdAt: -1 });
    res.json(pending);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/handoff/:shipmentId — get all handoffs for a shipment
router.get('/:shipmentId', async (req, res) => {
  try {
    const handoffs = await Handoff.find({ shipmentId: req.params.shipmentId }).sort({ createdAt: 1 });
    res.json(handoffs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
