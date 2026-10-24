const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysis.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.use(verifyToken);

router.post('/analyze', analysisController.analyzeResume);
router.post('/skills', analysisController.extractSkillsOnly);

module.exports = router;

