const SkillExtractorService = require('./skillExtractor.service');

class MatcherService {
  /**
   * Match a candidate's resume text/skills against a target Job Description
   */
  static matchResumeWithJob(resumeText, resumeSkills, jobDescription, jobTitle = '') {
    if (!jobDescription || typeof jobDescription !== 'string') {
      throw new Error('A valid Job Description text is required for matching.');
    }

    // Extract skills from the job description
    const jdSkillsResult = SkillExtractorService.extractSkills(jobDescription);
    const jdSkills = jdSkillsResult.skills || [];

    // Candidate skills (lowercase lookup set for case-insensitive matching)
    const candidateSkills = Array.isArray(resumeSkills)
      ? resumeSkills
      : (SkillExtractorService.extractSkills(resumeText).skills || []);

    const candidateLookup = new Set(candidateSkills.map(s => s.toLowerCase()));
    const jdLookup = new Set(jdSkills.map(s => s.toLowerCase()));

    // Compute Matched and Missing
    const matchedSkills = [];
    const missingSkills = [];

    for (const skill of jdSkills) {
      if (candidateLookup.has(skill.toLowerCase())) {
        matchedSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    }

    // Additional skills present in resume but not requested in JD
    const additionalSkills = candidateSkills.filter(
      skill => !jdLookup.has(skill.toLowerCase())
    );

    // Title & keyword overlap check
    let titleBonus = 0;
    if (jobTitle && jobTitle.trim()) {
      const cleanTitle = jobTitle.trim().toLowerCase();
      if (resumeText.toLowerCase().includes(cleanTitle)) {
        titleBonus = 10;
      }
    }

    // Match percentage calculation
    let matchScore = 0;
    if (jdSkills.length === 0) {
      // If JD had very few recognizable skills, do a general text overlap calculation
      matchScore = 60;
    } else {
      const skillMatchRatio = (matchedSkills.length / jdSkills.length) * 100;
      matchScore = Math.min(100, Math.round(skillMatchRatio * 0.9 + titleBonus));
    }

    // Determine match classification
    let rating = 'Low Match';
    let summaryText = 'This resume requires significant tailoring and skill alignment to pass the ATS filter for this role.';
    if (matchScore >= 85) {
      rating = 'Excellent Match';
      summaryText = 'Outstanding alignment! Your resume covers almost all core requirements and is highly likely to rank in the top candidate tier.';
    } else if (matchScore >= 70) {
      rating = 'Strong Match';
      summaryText = 'Very competitive profile. Addressing the few missing keywords will position you among top applicants.';
    } else if (matchScore >= 50) {
      rating = 'Moderate Match';
      summaryText = 'Decent baseline overlap, but critical technical competencies required by the employer are absent from your resume.';
    }

    // Tailored ATS Recommendations
    const recommendations = [];
    if (missingSkills.length > 0) {
      const topMissing = missingSkills.slice(0, 5).join(', ');
      recommendations.push(
        `Critical Keywords Missing: Add [${topMissing}] into your Skills and relevant project bullets if you have experience with them.`
      );
    }

    if (titleBonus === 0 && jobTitle) {
      recommendations.push(
        `Target Title Alignment: Your resume doesn't explicitly mention "${jobTitle}". Consider incorporating it into your Professional Summary or Headline.`
      );
    }

    recommendations.push(
      'Mirror Employer Phrasing: Review the job description and align your terminology (e.g., if JD says "RESTful APIs", ensure your resume says "RESTful APIs" instead of generic "endpoints").'
    );

    return {
      matchScore,
      rating,
      summary: summaryText,
      totalJdSkillsCount: jdSkills.length,
      matchedCount: matchedSkills.length,
      missingCount: missingSkills.length,
      matchedSkills,
      missingSkills,
      additionalSkills: additionalSkills.slice(0, 15),
      jdSkillsCategorized: jdSkillsResult.categorized,
      recommendations,
    };
  }
}

module.exports = MatcherService;

