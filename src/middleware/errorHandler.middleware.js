const multer = require('multer');
const { error } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error('[Error Middleware]:', err.message || err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return error(res, 'File too large. Maximum allowed size is 10MB.', 400);
    }
    return error(res, `File upload error: ${err.message}`, 400);
  }

  if (err.message && err.message.includes('Invalid file type')) {
    return error(res, err.message, 400);
  }

  if (err.type === 'entity.parse.failed') {
    return error(res, 'Malformed JSON payload in request body.', 400);
  }

  return error(res, err.message || 'Internal Server Error', err.status || 500);
};

const notFoundHandler = (req, res) => {
  const method = req.method;
  const path = req.originalUrl;

  return error(
    res,
    `Route not found: ${method} ${path}`,
    404,
    null,
    {
      hint: `The requested endpoint ${method} ${path} does not exist. Visit http://localhost:5000/ for the web UI dashboard or see available routes below.`,
      availableRoutes: {
        webDashboard: 'GET http://localhost:5000/',
        health: 'GET /api/health',
        apiSpec: 'GET /api',
        auth: {
          register: 'POST /api/auth/register (or /api/register)',
          login: 'POST /api/auth/login (or /api/login)',
          profile: 'GET /api/auth/profile (Protected)',
        },
        resumes: {
          upload: 'POST /api/resumes/upload (or /api/upload) [field: "resume"]',
          list: 'GET /api/resumes',
          getById: 'GET /api/resumes/:id',
          download: 'GET /api/resumes/:id/download',
          delete: 'DELETE /api/resumes/:id',
        },
        analysis: {
          analyze: 'POST /api/analysis/analyze (or /api/analyze)',
          skills: 'POST /api/analysis/skills (or /api/skills)',
        },
        matching: {
          matchJob: 'POST /api/match',
          myMatches: 'GET /api/match',
          getById: 'GET /api/match/:id',
        },
      },
    }
  );
};

module.exports = {
  errorHandler,
  notFoundHandler,
};

