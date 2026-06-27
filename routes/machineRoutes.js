const express = require('express');
const router = express.Router();
const {
  getMachines,
  getMachineById,
  createMachine,
  updateMachine,
  deleteMachine
} = require('../controllers/machineController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getMachines)
  .post(protect, authorize('Admin'), createMachine);

router.route('/:id')
  .get(protect, getMachineById)
  .put(protect, authorize('Admin'), updateMachine)
  .delete(protect, authorize('Admin'), deleteMachine);

module.exports = router;
