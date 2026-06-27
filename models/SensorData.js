const mongoose = require('mongoose');

const SensorDataSchema = new mongoose.Schema({
  machineId: {
    type: String,
    required: true,
    index: true // index for speed of analytics queries
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  temperature: {
    type: Number,
    required: true
  },
  vibration: {
    type: Number,
    required: true
  },
  rpm: {
    type: Number,
    required: true
  },
  powerConsumption: {
    type: Number, // in kW
    required: true
  },
  pressure: {
    type: Number, // in bar
    required: true
  },
  humidity: {
    type: Number, // in %
    required: true
  },
  productionCount: {
    type: Number,
    required: true
  }
});

// Compound index for queries that filter by machine and time range
SensorDataSchema.index({ machineId: 1, timestamp: -1 });

module.exports = mongoose.model('SensorData', SensorDataSchema);
