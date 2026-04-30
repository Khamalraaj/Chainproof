const cron = require('node-cron');
const Shipment = require('../models/Shipment');
const { sendAlert } = require('./sendAlert');
const { anchorDocumentOnChain } = require('./blockchain');
const { predictSpoilage } = require('./mlPredictor');
const crypto = require('crypto');

// Simulate realistic temperature fluctuation
const fluctuateTemperature = (current, threshold) => {
  const change = (Math.random() - 0.4) * 1.5; // slightly biased upward
  const newTemp = parseFloat((current + change).toFixed(1));
  return Math.max(0, newTemp); // never goes below 0
};

// Determine status color based on temperature
const getStatus = (temp, threshold) => {
  if (temp >= threshold) return 'red';
  if (temp >= threshold - 2) return 'amber';
  return 'green';
};

// Main monitor — runs every 2 minutes
const startTemperatureMonitor = () => {
  cron.schedule('*/2 * * * *', async () => {
    try {
      const activeShipments = await Shipment.find({ isDelivered: false });

      for (const shipment of activeShipments) {
        const baseTemp = shipment.currentTemperature || (shipment.temperatureThreshold - 4);
        const newTemp = fluctuateTemperature(baseTemp, shipment.temperatureThreshold);
        const newStatus = getStatus(newTemp, shipment.temperatureThreshold);

        let alertLevel = shipment.alertLevel;
        let noActionSince = shipment.noActionSince;

        // 🧠 ML PREDICTION
        let shelfLife = shipment.shelfLifeDays;
        let confidence = shipment.spoilageConfidence;
        let statusMsg = shipment.statusMessage;
        let mlStatus = newStatus;

        try {
          const mlResult = await predictSpoilage({
            vegetable_type: (shipment.goodsType || 'tomato').toLowerCase(),
            storage_temp_c: newTemp
          });
          
          shelfLife = mlResult.days_remaining;
          confidence = mlResult.confidence_pct;
          statusMsg = `AI predicts shipment is ${mlResult.spoilage_label} (${confidence}% confidence). Estimated shelf life: ${shelfLife} days.`;
          
          // Let AI override the status if it detects spoilage
          if (mlResult.spoilage_status === 1) {
            mlStatus = 'red';
          } else if (shelfLife < 2) {
            mlStatus = 'amber';
          } else {
            mlStatus = 'green';
          }
        } catch (err) {
          console.error('[ML Error]', err.message);
        }

        // Level 1 — Warning zone
        if (mlStatus === 'amber' && alertLevel < 1) {
          alertLevel = 1;
          await sendAlert(1, { ...shipment.toObject(), currentTemperature: newTemp });
        }

        // Level 2 — Breach
        if (mlStatus === 'red' && alertLevel < 2) {
          alertLevel = 2;
          noActionSince = new Date();
          await sendAlert(2, { ...shipment.toObject(), currentTemperature: newTemp });

          // ANCHOR BREACH PROOF ON BLOCKCHAIN
          try {
            const breachData = `BREACH_REPORT:${shipment.shipmentId}:${newTemp}C:${new Date().toISOString()}`;
            const breachHash = crypto.createHash('sha256').update(breachData).digest('hex');
            console.log(`[Blockchain] Anchoring spoilage proof for ${shipment.shipmentId}...`);
            await anchorDocumentOnChain(shipment.shipmentId, breachHash);
          } catch (err) {
            console.error('[Blockchain] Failed to anchor breach proof:', err.message);
          }
        }

        // Level 3 — No action for 15 minutes after breach
        if (mlStatus === 'red' && alertLevel === 2 && noActionSince) {
          const minutesSinceAlert = (Date.now() - new Date(noActionSince).getTime()) / 60000;
          if (minutesSinceAlert >= 15 && alertLevel < 3) {
            alertLevel = 3;
            await sendAlert(3, { ...shipment.toObject(), currentTemperature: newTemp });
          }
        }

        // If temp comes back to safe zone, reset alert level
        if (mlStatus === 'green') {
          alertLevel = 0;
          noActionSince = null;
        }

        // Save updated values
        await Shipment.findByIdAndUpdate(shipment._id, {
          currentTemperature: newTemp,
          status: mlStatus,
          alertLevel,
          noActionSince,
          shelfLifeDays: shelfLife,
          spoilageConfidence: confidence,
          statusMessage: statusMsg,
          lastAlertSentAt: alertLevel > 0 ? new Date() : shipment.lastAlertSentAt
        });
      }

      console.log(`Temperature monitor ran — ${activeShipments.length} shipments checked`);
    } catch (error) {
      console.error('Temperature monitor error:', error.message);
    }
  });

  console.log('Temperature monitor started — runs every 2 minutes');
};

module.exports = { startTemperatureMonitor };
