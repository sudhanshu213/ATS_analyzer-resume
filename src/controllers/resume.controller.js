const fs = require('fs');
const path = require('path');
const Resume = require('../models/Resume');
const ParserService = require('../services/parser.service');
const SkillExtractorService = require('../services/skillExtractor.service');
const aiService = require('../services/ai.service');
const { success, error } = require('../utils/response');

const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return error(res, 'No resume file uploaded. Please provide a PDF or DOCX file under field name "resume".', 400);
    }

    const file = req.file;
    const userId = req.user ? req.user.id : 'demo_user_001';

    // Extract text from uploaded resume
    let rawText = '';
    try {
      rawText = await ParserService.extractText(file.path, file.mimetype);
    } catch (parseErr) {
      // Remove failed file from disk
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return error(res, `Failed to parse file: ${parseErr.message}`, 422);
    }

    if (!rawText || rawText.trim().length === 0) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return error(res, 'Could not extract readable text from document. Ensure file is not scanned/empty.', 422);
    }

    // Parse structure and contact details
    const structure = ParserService.parseResumeStructure(rawText);

    // Extract skills and action verbs
    const skillsResult = SkillExtractorService.extractSkills(rawText);
    const actionVerbsResult = SkillExtractorService.extractActionVerbs(rawText);

    // Calculate baseline ATS compatibility score
    const atsScoreResult = aiService.calculateAtsScore(structure, skillsResult, actionVerbsResult, rawText);

    // Save Resume to database
    const newResume = Resume.create({
      userId,
      originalName: file.originalname,
      fileName: file.filename,
      filePath: file.path,
      mimeType: file.mimetype,
      fileSize: file.size,
      rawText,
      parsedData: {
        structure,
        skills: skillsResult,
        actionVerbs: actionVerbsResult,
        atsScore: atsScoreResult,
      },
    });

    return success(
      res,
      {
        resumeId: newResume.id,
        fileName: newResume.originalName,
        fileSize: newResume.fileSize,
        wordCount: structure.wordCount,
        contactInfo: structure.contactInfo,
        detectedSections: structure.detectedSections,
        skillsCount: skillsResult.totalSkillsCount,
        topSkills: skillsResult.topSkills,
        categorizedSkills: skillsResult.categorized,
        atsScore: atsScoreResult,
        createdAt: newResume.createdAt,
      },
      'Resume uploaded and parsed successfully.',
      201
    );
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const getMyResumes = async (req, res) => {
  try {
    const userId = req.user.id;
    const resumes = Resume.findByUserId(userId).map(r => ({
      id: r.id,
      originalName: r.originalName,
      fileSize: r.fileSize,
      mimeType: r.mimeType,
      wordCount: r.parsedData?.structure?.wordCount || 0,
      atsScore: r.parsedData?.atsScore?.totalScore || 0,
      skillsCount: r.parsedData?.skills?.totalSkillsCount || 0,
      createdAt: r.createdAt,
      hasAiFeedback: !!r.analysis,
    }));

    return success(res, { resumes, count: resumes.length }, 'User resumes retrieved successfully.');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const getResumeById = async (req, res) => {
  try {
    const { id } = req.params;
    const resume = Resume.findById(id);

    if (!resume) {
      return error(res, 'Resume not found.', 404);
    }

    if (resume.userId !== req.user.id && req.user.role !== 'admin') {
      return error(res, 'Unauthorized access to this resume.', 403);
    }

    return success(res, { resume }, 'Resume details retrieved.');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const downloadResume = async (req, res) => {
  try {
    const { id } = req.params;
    const resume = Resume.findById(id);

    if (!resume) {
      return error(res, 'Resume not found.', 404);
    }

    if (resume.userId !== req.user.id && req.user.role !== 'admin') {
      return error(res, 'Unauthorized access to this file.', 403);
    }

    const filePath = path.resolve(resume.filePath);
    if (!fs.existsSync(filePath)) {
      return error(res, 'Resume file not found on disk.', 404);
    }

    res.setHeader('Content-Disposition', `attachment; filename="${resume.originalName}"`);
    res.setHeader('Content-Type', resume.mimeType);
    return res.sendFile(filePath);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const deleteResume = async (req, res) => {
  try {
    const { id } = req.params;
    const resume = Resume.findById(id);

    if (!resume) {
      return error(res, 'Resume not found.', 404);
    }

    if (resume.userId !== req.user.id && req.user.role !== 'admin') {
      return error(res, 'Unauthorized to delete this resume.', 403);
    }

    // Delete physical file
    const filePath = path.resolve(resume.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    Resume.delete(id);
    return success(res, null, 'Resume deleted successfully.');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

module.exports = {
  uploadResume,
  getMyResumes,
  getResumeById,
  downloadResume,
  deleteResume,
};

