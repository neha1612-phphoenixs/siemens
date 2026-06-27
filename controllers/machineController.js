const Machine = require('../models/Machine');
const SensorData = require('../models/SensorData');

// @desc    Get all machines
// @route   GET /api/machines
// @access  Private (Admin & Supervisor)
exports.getMachines = async (req, res) => {
  try {
    const machines = await Machine.find({});
    res.json({ success: true, count: machines.length, data: machines });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get single machine details with last telemetry
// @route   GET /api/machines/:id
// @access  Private (Admin & Supervisor)
exports.getMachineById = async (req, res) => {
  try {
    const machine = await Machine.findOne({ machineId: req.params.id });

    if (!machine) {
      return res.status(404).json({ success: false, message: 'Machine not found' });
    }

    // Get last 10 sensor records
    const telemetry = await SensorData.find({ machineId: req.params.id })
      .sort({ timestamp: -1 })
      .limit(10);

    res.json({
      success: true,
      data: machine,
      recentTelemetry: telemetry
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Create new machine
// @route   POST /api/machines
// @access  Private/Admin
exports.createMachine = async (req, res) => {
  const { machineId, name, department, status, lastMaintenance } = req.body;

  try {
    const machineExists = await Machine.findOne({ machineId });

    if (machineExists) {
      return res.status(400).json({ success: false, message: 'Machine ID already exists' });
    }

    const machine = await Machine.create({
      machineId,
      name,
      department,
      status: status || 'Offline',
      lastMaintenance: lastMaintenance || new Date()
    });

    res.status(201).json({ success: true, data: machine });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update machine details
// @route   PUT /api/machines/:id
// @access  Private/Admin
exports.updateMachine = async (req, res) => {
  const { name, department, status, lastMaintenance } = req.body;

  try {
    let machine = await Machine.findOne({ machineId: req.params.id });

    if (!machine) {
      return res.status(404).json({ success: false, message: 'Machine not found' });
    }

    machine.name = name || machine.name;
    machine.department = department || machine.department;
    machine.status = status || machine.status;
    if (lastMaintenance) machine.lastMaintenance = lastMaintenance;

    const updatedMachine = await machine.save();
    res.json({ success: true, data: updatedMachine });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete machine
// @route   DELETE /api/machines/:id
// @access  Private/Admin
exports.deleteMachine = async (req, res) => {
  try {
    const machine = await Machine.findOne({ machineId: req.params.id });

    if (!machine) {
      return res.status(404).json({ success: false, message: 'Machine not found' });
    }

    await Machine.deleteOne({ machineId: req.params.id });
    // Also clean up its sensor data (optional, but clean)
    await SensorData.deleteMany({ machineId: req.params.id });

    res.json({ success: true, message: 'Machine and its sensor data deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
