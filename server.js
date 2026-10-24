const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./src/config/env');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler.middleware');
const { success } = require('./src/utils/response');

// Import routes & controllers
const authRoutes = require('./src/routes/auth.routes');
const resumeRoutes = require('./src/routes/resume.routes');
const analysisRoutes = require('./src/routes/analysis.routes');
const matchRoutes = require('./src/routes/match.routes');

const authController = require('./src/controllers/auth.controller');
const resumeController = require('./src/controllers/resume.controller');
const analysisController = require('./src/controllers/analysis.controller');
const upload = require('./src/middleware/upload.middleware');
const { verifyToken } = require('./src/middleware/auth.middleware');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve frontend dashboard
app.use(express.static(path.join(__dirname, 'public')));

// Health Check
app.get('/api/health', (req, res) => {
  return success(res, {
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    geminiEnabled: !!(config.GEMINI_API_KEY && config.GEMINI_API_KEY.trim()),
    model: config.GEMINI_MODEL,
  }, 'ATS Resume Analyser API is running smoothly.');
});

// API Directory
app.get('/api', (req, res) => {
  return success(res, {
    name: 'ATS Resume Analyser & Job Matching REST API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile (Protected)',
      },
      resumes: {
        upload: 'POST /api/resumes/upload (Protected, multipart/form-data: field "resume")',
        list: 'GET /api/resumes (Protected)',
        getById: 'GET /api/resumes/:id (Protected)',
        download: 'GET /api/resumes/:id/download (Protected)',
        delete: 'DELETE /api/resumes/:id (Protected)',
      },
      analysis: {
        analyze: 'POST /api/analysis/analyze (Protected, accepts { resumeId } or { text })',
        skillsOnly: 'POST /api/analysis/skills (Protected, accepts { resumeId } or { text })',
      },
      matching: {
        matchJob: 'POST /api/match (Protected, accepts { resumeId, jobDescription, jobTitle, jobCompany })',
        myMatches: 'GET /api/match (Protected)',
        getMatchById: 'GET /api/match/:id (Protected)',
        deleteMatch: 'DELETE /api/match/:id (Protected)',
      },
    },
    demoCredentials: {
      email: 'demo@example.com',
      password: 'Password123!',
    },
  }, 'Available REST API endpoints');
});

// Helpful notice if someone opens a POST endpoint directly in browser (GET request)
const postOnlyNotice = (endpointName, samplePayload) => (req, res) => {
  return res.status(405).json({
    success: false,
    error: `Method Not Allowed: ${endpointName} requires a POST request.`,
    message: `${endpointName} requires an HTTP POST request, but received a GET request (such as opening in a web browser).`,
    expectedMethod: 'POST',
    samplePayload,
    hint: 'Use the web dashboard at http://localhost:5000/ or send a POST request with Postman / cURL.',
  });
};

app.get(['/api/auth/login', '/api/login', '/login'], postOnlyNotice('Login', { email: 'demo@example.com', password: 'Password123!' }));
app.get(['/api/auth/register', '/api/register', '/register'], postOnlyNotice('Register', { name: 'Demo Candidate', email: 'user@example.com', password: 'Password123!' }));
app.get(['/api/resumes/upload', '/api/resume/upload', '/api/upload', '/upload'], postOnlyNotice('Resume Upload', 'multipart/form-data with field "resume"'));
app.get(['/api/analysis/analyze', '/api/analyze'], postOnlyNotice('Resume Analysis', { resumeId: 'id_...' }));

// Friendly developer route aliases
app.post(['/login', '/api/login'], authController.login);
app.post(['/register', '/api/register'], authController.register);
app.get(['/profile', '/api/profile'], verifyToken, authController.getProfile);

app.post(['/upload', '/api/upload', '/api/resume/upload'], verifyToken, upload.single('resume'), resumeController.uploadResume);
app.get(['/api/resume'], verifyToken, resumeController.getMyResumes);
app.get(['/api/resume/:id'], verifyToken, resumeController.getResumeById);
app.get(['/api/resume/:id/download'], verifyToken, resumeController.downloadResume);

app.post(['/analyze', '/api/analyze'], verifyToken, analysisController.analyzeResume);
app.post(['/skills', '/api/skills'], verifyToken, analysisController.extractSkillsOnly);

// Mount Standard Prefix Routes
app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/matches', matchRoutes);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 ATS Resume Analyser API running on http://localhost:${config.PORT}`);
    console.log(`📡 Health Check: http://localhost:${config.PORT}/api/health`);
    console.log(`💻 Web Dashboard: http://localhost:${config.PORT}/`);
    console.log(`🔑 Pre-seeded Demo User: demo@example.com / Password123!`);
    console.log(`🤖 AI Engine: ${config.GEMINI_API_KEY ? 'Google Gemini (' + config.GEMINI_MODEL + ')' : 'Local Heuristic Engine (Offline-Ready)'}`);
    console.log(`====================================================`);
  });
}

module.exports = app;

