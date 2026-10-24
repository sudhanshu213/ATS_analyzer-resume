const Resume = require('../models/Resume');
const JobMatch = require('../models/JobMatch');
const MatcherService = require('../services/matcher.service');
const { success, error } = require('../utils/response');

const matchResumeWithJob = async (req, res) => {
  try {
    const { resumeId, resumeText, jobDescription, jobTitle = '', jobCompany = '' } = req.body;

    if (!jobDescription || jobDescription.trim().length === 0) {
      return error(res, 'Field "jobDescription" is required.', 400);
    }

    let textToMatch = resumeText;
    let candidateSkills = null;

    if (resumeId) {
      const resume = Resume.findById(resumeId);
      if (!resume) {
        return error(res, 'Resume not found with provided resumeId.', 404);
      }
      if (resume.userId !== req.user.id && req.user.role !== 'admin') {
        return error(res, 'Unauthorized access to this resume.', 403);
      }
      textToMatch = resume.rawText;
      candidateSkills = resume.parsedData?.skills?.skills || null;
    }

    if (!textToMatch || textToMatch.trim().length === 0) {
      return error(res, 'Either "resumeId" or "resumeText" is required to match against job description.', 400);
    }

    const matchResult = MatcherService.matchResumeWithJob(
      textToMatch,
      candidateSkills,
      jobDescription,
      jobTitle
    );

    // Save match result into DB
    const savedMatch = JobMatch.create({
      userId: req.user.id,
      resumeId: resumeId || 'ad_hoc_text',
      jobTitle: jobTitle || 'Target Role',
      jobCompany,
      jobDescription,
      matchScore: matchResult.matchScore,
      matchedSkills: matchResult.matchedSkills,
      missingSkills: matchResult.missingSkills,
      additionalSkills: matchResult.additionalSkills,
      recommendations: matchResult.recommendations,
    });

    return success(
      res,
      {
        matchId: savedMatch.id,
        jobTitle: savedMatch.jobTitle,
        jobCompany: savedMatch.jobCompany,
        ...matchResult,
        createdAt: savedMatch.createdAt,
      },
      'Job matching analysis completed successfully.'
    );
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const getMyMatches = async (req, res) => {
  try {
    const matches = JobMatch.findByUserId(req.user.id);
    return success(res, { matches, count: matches.length }, 'Job matches retrieved successfully.');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const getMatchById = async (req, res) => {
  try {
    const { id } = req.params;
    const match = JobMatch.findById(id);

    if (!match) {
      return error(res, 'Job match record not found.', 404);
    }

    if (match.userId !== req.user.id && req.user.role !== 'admin') {
      return error(res, 'Unauthorized access to this match record.', 403);
    }

    return success(res, { match }, 'Match details retrieved successfully.');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const deleteMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const match = JobMatch.findById(id);

    if (!match) {
      return error(res, 'Job match record not found.', 404);
    }

    if (match.userId !== req.user.id && req.user.role !== 'admin') {
      return error(res, 'Unauthorized to delete this match record.', 403);
    }

    JobMatch.delete(id);
    return success(res, null, 'Job match record deleted successfully.');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

module.exports = {
  matchResumeWithJob,
  getMyMatches,
  getMatchById,
  deleteMatch,
};

