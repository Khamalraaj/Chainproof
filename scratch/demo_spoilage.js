const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend root
dotenv.config({ path: path.join(__dirname, '../.env') });

const Shipment = require('../models/Shipment');
const { anchorDocumentOnChain } = require('../utils/blockchain');
const { sendAlert } = require('../utils/sendAlert');
const crypto = require('crypto');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chainproof';

async function simulateSpoilage(shipmentId) {
    try {
        console.log(`\n🚀 Starting AI-Driven Spoilage Simulation for ${shipmentId}...`);
        
        await mongoose.connect(MONGODB_URI);
        const shipment = await Shipment.findOne({ shipmentId });

        if (!shipment) {
            console.error(`❌ Shipment ${shipmentId} not found! Create it first in the UI.`);
            process.exit(1);
        }

        const threshold = shipment.temperatureThreshold;

        // --- STAGE 1: WARNING (AMBER) ---
        console.log(`\n🟡 STAGE 1: AI detects shelf-life drop (Amber Warning)...`);
        const amberTemp = threshold - 1;
        await Shipment.findOneAndUpdate({ shipmentId }, {
            currentTemperature: amberTemp,
            status: 'amber',
            alertLevel: 1,
            shelfLifeDays: 1.8,
            spoilageConfidence: 78.5,
            statusMessage: `AI Warning: Rapid shelf-life deterioration detected. 1.8 days remaining.`
        });
        await sendAlert(1, { ...shipment.toObject(), currentTemperature: amberTemp });
        console.log(`✅ Dashboard updated with AI Shelf Life warning.`);
        
        await new Promise(r => setTimeout(r, 5000)); // wait 5 seconds

        // --- STAGE 2: BREACH (RED) + BLOCKCHAIN ANCHOR ---
        console.log(`\n🔴 STAGE 2: AI confirms Critical Spoilage (Red Critical)...`);
        const redTemp = threshold + 5;
        await Shipment.findOneAndUpdate({ shipmentId }, {
            currentTemperature: redTemp,
            status: 'red',
            alertLevel: 2,
            noActionSince: new Date(),
            shelfLifeDays: 0.2,
            spoilageConfidence: 96.2,
            statusMessage: `CRITICAL: AI confirms goods are SPOILED. 96% confidence.`
        });
        await sendAlert(2, { ...shipment.toObject(), currentTemperature: redTemp });
        
        // Anchor Proof on Blockchain
        const breachData = `BREACH_REPORT:${shipmentId}:${redTemp}C:${new Date().toISOString()}`;
        const breachHash = crypto.createHash('sha256').update(breachData).digest('hex');
        console.log(`🔗 Anchoring AI-Verified Spoilage Proof on Blockchain...`);
        const txHash = await anchorDocumentOnChain(shipmentId, breachHash);
        console.log(`✅ Blockchain Record Locked. Tx: ${txHash}`);

        await new Promise(r => setTimeout(r, 5000));

        // --- STAGE 3: ESCALATION (LEVEL 3) ---
        console.log(`\n🚨 STAGE 3: Simulating Manager Inaction (Level 3 Escalation)...`);
        await Shipment.findOneAndUpdate({ shipmentId }, {
            alertLevel: 3
        });
        await sendAlert(3, { ...shipment.toObject(), currentTemperature: redTemp });
        console.log(`✅ Escalation alert fired!`);

        console.log(`\n✨ AI Simulation Complete. Check the "AI Spoilage Analysis" section in the UI!`);
        
        await mongoose.disconnect();
    } catch (err) {
        console.error('Simulation Error:', err.message);
        process.exit(1);
    }
}

// Get shipment ID from command line or use default
const targetId = process.argv[2] || 'SHP-12345';
simulateSpoilage(targetId);
