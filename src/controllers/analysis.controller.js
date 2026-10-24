const Resume = require('../models/Resume');
const ParserService = require('../services/parser.service');
const SkillExtractorService = require('../services/skillExtractor.service');
const aiService = require('../services/ai.service');
const { success, error } = require('../utils/response');

const analyzeResume = async (req, res) => {
  try {
    const { resumeId, text } = req.body;

    let rawText = text;
    let resume = null;

    if (resumeId) {
      resume = Resume.findById(resumeId);
      if (!resume) {
        return error(res, 'Resume not found with provided resumeId.', 404);
      }
      if (resume.userId !== req.user.id && req.user.role !== 'admin') {
        return error(res, 'Unauthorized access to this resume.', 403);
      }
      rawText = resume.rawText;
    }

    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      return error(res, 'Please provide either a valid "resumeId" or "text" in the request body.', 400);
    }

    // Parse structure, skills, and action verbs
    const structure = ParserService.parseResumeStructure(rawText);
    const skillsResult = SkillExtractorService.extractSkills(rawText);
    const actionVerbsResult = SkillExtractorService.extractActionVerbs(rawText);

    // Compute ATS Score
    const atsScoreResult = aiService.calculateAtsScore(structure, skillsResult, actionVerbsResult, rawText);

    // Generate AI feedback (Gemini LLM or local heuristic engine)
    const aiFeedback = await aiService.generateFeedback(rawText, structure, skillsResult, atsScoreResult);

    const fullAnalysis = {
      analyzedAt: new Date().toISOString(),
      atsScore: atsScoreResult,
      structure,
      skills: skillsResult,
      actionVerbs: actionVerbsResult,
      aiFeedback,
    };

    // If analyzed from a saved resume, persist the analysis
    if (resume) {
      Resume.update(resume.id, {
        analysis: fullAnalysis,
        parsedData: {
          ...resume.parsedData,
          atsScore: atsScoreResult,
          skills: skillsResult,
        },
      });
    }

    return success(res, fullAnalysis, 'Resume analysis completed successfully.');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const extractSkillsOnly = async (req, res) => {
  try {
    const { text, resumeId } = req.body;
    let rawText = text;

    if (resumeId) {
      const resume = Resume.findById(resumeId);
      if (!resume) return error(res, 'Resume not found.', 404);
      rawText = resume.rawText;
    }

    if (!rawText) {
      return error(res, 'Either "text" or "resumeId" must be provided.', 400);
    }

    const skillsResult = SkillExtractorService.extractSkills(rawText);
    return success(res, skillsResult, 'Skills extracted successfully.');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

module.exports = {
  analyzeResume,
  extractSkillsOnly,
};

