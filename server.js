const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { startTemperatureMonitor } = require('./utils/temperatureMonitor');

// Load env variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/shipment', require('./routes/shipment'));
app.use('/api/handoff', require('./routes/handoff'));
app.use('/api/alert', require('./routes/alert'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'ChainProof API is running' });
});

// Start temperature monitor (runs every 2 minutes)
if (process.env.NODE_ENV !== 'production') {
  startTemperatureMonitor();
}

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`ChainProof server running on port ${PORT}`);
  });
}

module.exports = app;

