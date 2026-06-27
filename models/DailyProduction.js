const mongoose = require('mongoose');

const DailyProductionSchema = new mongoose.Schema({
  date: {
    type: String, // format: YYYY-MM-DD
    required: true,
    unique: true,
    index: true
  },
  targetCount: {
    type: Number,
    required: true,
    default: 1000
  },
  actualCount: {
    type: Number,
    required: true,
    default: 0
  },
  defectCount: {
    type: Number,
    required: true,
    default: 0
  },
  totalDowntimeMinutes: {
    type: Number,
    required: true,
    default: 0
  },
  energyConsumedKwh: {
    type: Number,
    required: true,
    default: 0
  }
});

module.exports = mongoose.model('DailyProduction', DailyProductionSchema);
