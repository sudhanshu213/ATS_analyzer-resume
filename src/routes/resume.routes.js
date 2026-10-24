const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resume.controller');
const upload = require('../middleware/upload.middleware');
const { verifyToken } = require('../middleware/auth.middleware');

// All resume routes require authentication
router.use(verifyToken);

router.post('/upload', upload.single('resume'), resumeController.uploadResume);
router.get('/', resumeController.getMyResumes);
router.get('/:id', resumeController.getResumeById);
router.get('/:id/download', resumeController.downloadResume);
router.delete('/:id', resumeController.deleteResume);

module.exports = router;

