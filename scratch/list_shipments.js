const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Shipment = require('../models/Shipment');

dotenv.config();

const listShipments = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const shipments = await Shipment.find({});
    console.log('Shipments found:', JSON.stringify(shipments, null, 2));
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

listShipments();
