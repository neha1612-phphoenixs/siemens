const mongoose = require('mongoose');

const MachineSchema = new mongoose.Schema({
  machineId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    enum: ['Machining', 'Assembly', 'Welding', 'Packaging', 'Quality Control'],
    default: 'Machining'
  },
  status: {
    type: String,
    required: true,
    enum: ['Running', 'Maintenance', 'Stopped', 'Offline'],
    default: 'Offline'
  },
  lastMaintenance: {
    type: Date,
    default: Date.now
  },
  createdDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Machine', MachineSchema);
