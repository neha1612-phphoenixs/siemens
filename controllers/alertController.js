const Alert = require('../models/Alert');

// @desc    Get all alerts (filtered by status or machine)
// @route   GET /api/alerts
// @access  Private (Admin & Supervisor)
exports.getAlerts = async (req, res) => {
  const { resolved, machineId, limit } = req.query;
  let query = {};

  if (resolved !== undefined) {
    query.resolved = resolved === 'true';
  }
  if (machineId) {
    query.machineId = machineId;
  }

  try {
    const maxLimit = parseInt(limit, 10) || 50;
    const alerts = await Alert.find(query)
      .sort({ timestamp: -1 })
      .limit(maxLimit);
    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Resolve an alert
// @route   PUT /api/alerts/:id/resolve
// @access  Private (Admin & Supervisor)
exports.resolveAlert = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    alert.resolved = true;
    const updatedAlert = await alert.save();
    res.json({ success: true, data: updatedAlert });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get alert statistics (severity and types)
// @route   GET /api/alerts/stats
// @access  Private (Admin & Supervisor)
exports.getAlertStats = async (req, res) => {
  try {
    const totalAlerts = await Alert.countDocuments({});
    const activeAlerts = await Alert.countDocuments({ resolved: false });
    const redAlerts = await Alert.countDocuments({ severity: 'Red', resolved: false });
    const yellowAlerts = await Alert.countDocuments({ severity: 'Yellow', resolved: false });

    // Aggregate by type
    const typeBreakdown = await Alert.aggregate([
      { $match: { resolved: false } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      stats: {
        total: totalAlerts,
        active: activeAlerts,
        red: redAlerts,
        yellow: yellowAlerts,
        types: typeBreakdown
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
