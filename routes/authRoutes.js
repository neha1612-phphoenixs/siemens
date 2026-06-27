const express = require('express');
const router = express.Router();
const { loginUser, registerUser, getMe } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/login', loginUser);
router.post('/register', protect, authorize('Admin'), registerUser);
router.get('/me', protect, getMe);

module.exports = router;
