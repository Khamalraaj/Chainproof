const express = require('express');
const router = express.Router();
const Shipment = require('../models/Shipment');
const { protect, allowRoles } = require('../middleware/authMiddleware');
const { sendAlert } = require('../utils/sendAlert');

// POST /api/alert/send — manually trigger alert (also called internally)
router.post('/send', protect, allowRoles('manager', 'senior_manager'), async (req, res) => {
  try {
    const { shipmentId, level } = req.body;

    const shipment = await Shipment.findOne({ shipmentId });
    if (!shipment) return res.status(404).json({ message: 'Shipment not found' });

    const result = await sendAlert(parseInt(level), shipment);

    res.json({
      message: `Level ${level} alert sent`,
      result
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/alert/anomalies — get all red and amber shipments
router.get('/anomalies', protect, async (req, res) => {
  try {
    const anomalies = await Shipment.find({
      status: { $in: ['red', 'amber'] },
      isDelivered: false
    }).sort({ alertLevel: -1, updatedAt: -1 });

    res.json(anomalies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
