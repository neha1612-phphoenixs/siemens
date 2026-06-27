const express = require('express');
const router = express.Router();
const { getAlerts, resolveAlert, getAlertStats } = require('../controllers/alertController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getAlerts);

router.route('/stats')
  .get(protect, getAlertStats);

router.route('/:id/resolve')
  .put(protect, resolveAlert);

module.exports = router;
