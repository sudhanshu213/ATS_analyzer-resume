const { matchesTable } = require('./db');

class JobMatch {
  static create({
    userId,
    resumeId,
    jobTitle,
    jobCompany = '',
    jobDescription,
    matchScore,
    matchedSkills,
    missingSkills,
    additionalSkills,
    recommendations,
  }) {
    return matchesTable.create({
      userId,
      resumeId,
      jobTitle,
      jobCompany,
      jobDescription,
      matchScore,
      matchedSkills,
      missingSkills,
      additionalSkills,
      recommendations,
    });
  }

  static findById(id) {
    return matchesTable.findById(id);
  }

  static findByUserId(userId) {
    return matchesTable.find(m => m.userId === userId);
  }

  static findByResumeId(resumeId) {
    return matchesTable.find(m => m.resumeId === resumeId);
  }

  static delete(id) {
    return matchesTable.delete(id);
  }
}

module.exports = JobMatch;

