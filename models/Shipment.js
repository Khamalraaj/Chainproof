const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  shipmentId: {
    type: String,
    unique: true,
    required: true
  },
  qrCode: {
    type: String // base64 QR image
  },
  producerName: {
    type: String,
    required: true
  },
  goodsType: {
    type: String,
    required: true // e.g. vegetables, vaccines, dairy
  },
  origin: {
    type: String,
    required: true
  },
  destination: {
    type: String,
    required: true
  },
  temperatureThreshold: {
    type: Number,
    required: true // max safe temperature in Celsius
  },
  currentTemperature: {
    type: Number,
    default: null
  },
  status: {
    type: String,
    enum: ['green', 'amber', 'red'],
    default: 'green'
  },
  shelfLifeDays: { type: Number, default: 7 },
  spoilageConfidence: { type: Number, default: 0 },
  statusMessage: { type: String, default: 'Shipment is fresh.' },
  currentLocation: {
    lat: { type: Number, default: 12.9716 }, // default Chennai coords
    lng: { type: Number, default: 80.2209 }
  },
  isRerouted: {
    type: Boolean,
    default: false
  },
  rerouteDestination: {
    type: String,
    default: null
  },
  rerouteApprovedAt: {
    type: Date,
    default: null
  },
  alertLevel: {
    type: Number,
    default: 0 // 0 = no alert, 1 = warning, 2 = breach, 3 = escalated
  },
  lastAlertSentAt: {
    type: Date,
    default: null
  },
  noActionSince: {
    type: Date,
    default: null
  },
  isDelivered: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('Shipment', shipmentSchema);
