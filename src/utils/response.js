/**
 * Standardized API response helpers
 */
const success = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

const error = (res, message = 'An error occurred', statusCode = 500, errors = null, extra = {}) => {
  const payload = {
    success: false,
    error: message,
    message,
    ...extra,
    timestamp: new Date().toISOString(),
  };
  if (errors) {
    payload.errors = errors;
  }
  return res.status(statusCode).json(payload);
};

module.exports = {
  success,
  error,
};

