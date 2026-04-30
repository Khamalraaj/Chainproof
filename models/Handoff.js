const mongoose = require('mongoose');

const handoffSchema = new mongoose.Schema({
  shipmentId: {
    type: String,
    required: true
  },
  handledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  handlerName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true
  },
  location: {
    name: { type: String, default: '' },
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 }
  },
  temperature: {
    type: Number,
    required: true
  },
  documentUrl: {
    type: String,
    default: null // file path of uploaded document
  },
  documentHash: {
    type: String,
    default: null // SHA-256 hash of the document
  },
  documentName: {
    type: String,
    default: null
  },
  mediatorSignature: {
    type: String, // base64 signature image
    default: null
  },
  managerSignature: {
    type: String,
    default: null
  },
  managerApproved: {
    type: Boolean,
    default: false
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  managerApprovedAt: {
    type: Date,
    default: null
  },
  isTampered: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('Handoff', handoffSchema);
