const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { error } = require('../utils/response');
const User = require('../models/User');

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'Access denied. No Bearer token provided in Authorization header.', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return error(res, 'Authentication token missing.', 401);
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    // Verify user still exists in database
    const user = User.findById(decoded.id);
    if (!user) {
      return error(res, 'Invalid token: User no longer exists.', 401);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Token has expired. Please log in again.', 401);
    }
    return error(res, 'Invalid or malformed authentication token.', 401);
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return error(res, `Forbidden: Requires one of roles: [${roles.join(', ')}]`, 403);
    }
    next();
  };
};

module.exports = {
  verifyToken,
  authorizeRoles,
};

