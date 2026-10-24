const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');
const { success, error } = require('../utils/response');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
};

const register = async (req, res) => {
  try {
    const { name, email, password, role, headline } = req.body;

    if (!name || !email || !password) {
      return error(res, 'Name, email, and password are required fields.', 400);
    }

    if (password.length < 6) {
      return error(res, 'Password must be at least 6 characters in length.', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return error(res, 'Invalid email address format.', 400);
    }

    const existingUser = User.findByEmail(email);
    if (existingUser) {
      return error(res, 'An account with this email address already exists.', 409);
    }

    const user = await User.create({ name, email, password, role, headline });
    const token = generateToken(user);

    return success(
      res,
      {
        user,
        token,
        tokenType: 'Bearer',
        expiresIn: config.JWT_EXPIRES_IN,
      },
      'User registered successfully.',
      201
    );
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return error(res, 'Email and password are required.', 400);
    }

    const user = User.findByEmail(email);
    if (!user) {
      return error(res, 'Invalid email or password.', 401);
    }

    const isMatch = await User.verifyPassword(password, user.password);
    if (!isMatch) {
      return error(res, 'Invalid email or password.', 401);
    }

    const safeUser = User.sanitize(user);
    const token = generateToken(safeUser);

    return success(
      res,
      {
        user: safeUser,
        token,
        tokenType: 'Bearer',
        expiresIn: config.JWT_EXPIRES_IN,
      },
      'Login successful.'
    );
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const getProfile = async (req, res) => {
  return success(res, { user: req.user }, 'User profile retrieved successfully.');
};

module.exports = {
  register,
  login,
  getProfile,
};

