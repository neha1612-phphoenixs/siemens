const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper to generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'siemens_secret_factory_key_123_456!', {
    expiresIn: '30d'
  });
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check for user
    const user = await User.findOne({ username });

    if (user && (await user.comparePassword(password))) {
      res.json({
        success: true,
        token: generateToken(user._id),
        user: {
          _id: user._id,
          username: user.username,
          role: user.role,
          name: user.name,
          department: user.department
        }
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Register a new user (Admin only)
// @route   POST /api/auth/register
// @access  Private/Admin
exports.registerUser = async (req, res) => {
  const { username, password, role, name, department } = req.body;

  try {
    const userExists = await User.findOne({ username });

    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const user = await User.create({
      username,
      password,
      role,
      name,
      department
    });

    if (user) {
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
          _id: user._id,
          username: user.username,
          role: user.role,
          name: user.name,
          department: user.department
        }
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        success: true,
        user: {
          _id: user._id,
          username: user.username,
          role: user.role,
          name: user.name,
          department: user.department
        }
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
