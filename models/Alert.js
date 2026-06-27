const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  machineId: {
    type: String,
    required: true,
    index: true
  },
  machineName: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Overheating', 'Excessive Vibration', 'Abnormal Power', 'Machine Stop', 'Maintenance Due', 'Goal Achieved']
  },
  severity: {
    type: String,
    required: true,
    enum: ['Red', 'Yellow', 'Green'],
    default: 'Yellow'
  },
  message: {
    type: String,
    required: true
  },
  sensorValues: {
    temperature: Number,
    vibration: Number,
    powerConsumption: Number
  },
  recommendation: {
    type: String
  },
  resolved: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Alert', AlertSchema);
