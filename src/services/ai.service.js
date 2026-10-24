const { GoogleGenAI } = require('@google/genai');
const config = require('../config/env');
const SkillExtractorService = require('./skillExtractor.service');

class AIService {
  constructor() {
    this.geminiClient = null;
    if (config.GEMINI_API_KEY && config.GEMINI_API_KEY.trim() !== '') {
      try {
        this.geminiClient = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
        console.log('[AIService] Google Gemini client initialized successfully.');
      } catch (err) {
        console.warn('[AIService] Failed to initialize Google GenAI:', err.message);
      }
    }
  }

  /**
   * Deterministic ATS scoring algorithm (0 to 100)
   */
  calculateAtsScore(structure, skillsResult, actionVerbsResult, rawText) {
    let contactScore = 0;
    const contactInfo = structure.contactInfo || {};
    if (contactInfo.emails && contactInfo.emails.length > 0) contactScore += 5;
    if (contactInfo.phones && contactInfo.phones.length > 0) contactScore += 4;
    if (contactInfo.linkedin && contactInfo.linkedin.length > 0) contactScore += 3;
    if (contactInfo.github && contactInfo.github.length > 0) contactScore += 3;
    contactScore = Math.min(contactScore, 15);

    // Section completeness (20 pts max)
    const detectedSections = structure.detectedSections || [];
    let sectionScore = 0;
    if (detectedSections.includes('experience')) sectionScore += 6;
    if (detectedSections.includes('skills')) sectionScore += 5;
    if (detectedSections.includes('education')) sectionScore += 4;
    if (detectedSections.includes('summary')) sectionScore += 3;
    if (detectedSections.includes('projects') || detectedSections.includes('certifications')) sectionScore += 2;
    sectionScore = Math.min(sectionScore, 20);

    // Skill diversity & count (25 pts max)
    const skillsCount = skillsResult.totalSkillsCount || 0;
    let skillScore = 0;
    if (skillsCount >= 15) skillScore = 25;
    else if (skillsCount >= 10) skillScore = 20;
    else if (skillsCount >= 6) skillScore = 15;
    else if (skillsCount >= 3) skillScore = 10;
    else if (skillsCount >= 1) skillScore = 5;

    // Action verbs & quantifiable metrics (20 pts max)
    const verbsCount = actionVerbsResult.totalVerbs || 0;
    const metricsMatches = rawText.match(/\b\d+(?:[\.,]\d+)?%|\$\d+(?:[\.,]\d+)?|\b\d+\+\s*(?:users|clients|customers|revenue|downloads|requests|ms|hours|days|weeks|engineers|team members)\b/gi) || [];
    let impactScore = 0;
    if (verbsCount >= 10) impactScore += 10;
    else if (verbsCount >= 5) impactScore += 6;
    else if (verbsCount >= 2) impactScore += 3;

    if (metricsMatches.length >= 5) impactScore += 10;
    else if (metricsMatches.length >= 2) impactScore += 7;
    else if (metricsMatches.length >= 1) impactScore += 4;
    impactScore = Math.min(impactScore, 20);

    // Formatting & Length (20 pts max)
    const wordCount = structure.wordCount || 0;
    let formatScore = 0;
    if (wordCount >= 400 && wordCount <= 1000) formatScore += 15; // sweet spot 1-2 pages
    else if (wordCount >= 250 && wordCount < 400) formatScore += 10;
    else if (wordCount > 1000 && wordCount <= 1500) formatScore += 10;
    else if (wordCount > 1500) formatScore += 5; // too long
    else formatScore += 5; // too short

    // Check bullet point consistency
    const hasBullets = rawText.includes('•') || rawText.includes('- ') || rawText.includes('* ');
    if (hasBullets) formatScore += 5;
    formatScore = Math.min(formatScore, 20);

    const totalScore = contactScore + sectionScore + skillScore + impactScore + formatScore;

    return {
      totalScore: Math.round(totalScore),
      breakdown: {
        contactScore: { score: contactScore, max: 15 },
        sectionScore: { score: sectionScore, max: 20 },
        skillScore: { score: skillScore, max: 25 },
        impactScore: { score: impactScore, max: 20 },
        formatScore: { score: formatScore, max: 20 },
      },
      metricsCount: metricsMatches.length,
    };
  }

  /**
   * Generates AI ATS feedback (via Gemini LLM or Local Heuristic Engine)
   */
  async generateFeedback(rawText, structure, skillsResult, atsScoreResult) {
    const actionVerbsResult = SkillExtractorService.extractActionVerbs(rawText);

    // If Gemini is available and configured, use it for deep generative AI insights
    if (this.geminiClient) {
      try {
        const aiResponse = await this._callGemini(rawText, structure, skillsResult, atsScoreResult);
        return {
          source: 'Google Gemini AI',
          model: config.GEMINI_MODEL,
          ...aiResponse,
        };
      } catch (err) {
        console.warn('[AIService] Gemini API call failed, using local AI engine:', err.message);
      }
    }

    // High quality local heuristic engine fallback
    return {
      source: 'Heuristic ATS AI Engine',
      model: 'Rule-Based Local Intelligence',
      ...this._generateHeuristicFeedback(rawText, structure, skillsResult, actionVerbsResult, atsScoreResult),
    };
  }

  /**
   * Gemini API call with structured prompt
   */
  async _callGemini(rawText, structure, skillsResult, atsScoreResult) {
    const prompt = `
You are an expert Fortune 500 Senior ATS (Applicant Tracking System) Specialist and Executive Technical Recruiter.
Analyze this resume text and return a valid JSON object matching the requested schema strictly. Do not include markdown codeblocks or quotes around the JSON.

Resume Text Snippet (first 4000 chars):
"""
${rawText.slice(0, 4000)}
"""

Context:
- Detected Word Count: ${structure.wordCount}
- Detected Sections: ${structure.detectedSections.join(', ') || 'None'}
- Extracted Skills: ${skillsResult.skills.slice(0, 20).join(', ')}
- Calculated ATS Score: ${atsScoreResult.totalScore}/100

JSON Output Schema:
{
  "summary": "2-3 sentences summarizing resume ATS readiness and overall impression",
  "strengths": ["3 to 5 specific strengths of this resume"],
  "weaknesses": ["3 to 5 specific weaknesses or ATS blockers found"],
  "missingSections": ["any essential ATS sections missing like summary, projects, education"],
  "formattingTips": ["3 practical tips to optimize for ATS scanners"],
  "quantifiableSuggestions": [
    {
      "originalConcept": "phrase or bullet that is too vague",
      "improvedExample": "rewritten using Google XYZ formula (Accomplished [X] measured by [Y] by doing [Z])"
    }
  ],
  "keywordRecommendations": ["5 to 10 high-value keywords candidate should emphasize"],
  "actionableNextSteps": ["Step 1", "Step 2", "Step 3"]
}
`;

    const response = await this.geminiClient.models.generateContent({
      model: config.GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '';
    const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanJson);
  }

  /**
   * Intelligent Rule-based Heuristic AI feedback generator
   */
  _generateHeuristicFeedback(rawText, structure, skillsResult, actionVerbsResult, atsScoreResult) {
    const strengths = [];
    const weaknesses = [];
    const formattingTips = [];
    const missingSections = [];
    const keywordRecommendations = [];
    const actionableNextSteps = [];

    // Analyze Sections
    const allSections = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications'];
    for (const sec of allSections) {
      if (!structure.detectedSections.includes(sec)) {
        missingSections.push(sec.charAt(0).toUpperCase() + sec.slice(1));
      }
    }

    if (structure.detectedSections.includes('experience') && structure.detectedSections.includes('skills')) {
      strengths.push('Clean foundational structure with clear Experience and Skills sections that ATS parsers look for.');
    } else {
      weaknesses.push('Missing explicit core sections (such as Work Experience or Technical Skills) formatted in standard ATS header conventions.');
    }

    // Contact info
    if (structure.contactInfo.emails.length > 0 && structure.contactInfo.phones.length > 0) {
      strengths.push(`Direct contact coordinates present (${structure.contactInfo.emails[0]}).`);
    } else {
      weaknesses.push('Contact info is incomplete or unparseable. Ensure email and phone number are in plain text at the top.');
    }

    if (structure.contactInfo.linkedin.length > 0 || structure.contactInfo.github.length > 0) {
      strengths.push('Professional portfolio/profile links (LinkedIn or GitHub) detected.');
    } else {
      formattingTips.push('Add your customized LinkedIn profile and GitHub URLs in the header to increase recruiter click-through rates.');
    }

    // Word count & length
    if (structure.wordCount >= 400 && structure.wordCount <= 950) {
      strengths.push(`Ideal document length of ${structure.wordCount} words for a 1-to-2 page technical resume.`);
    } else if (structure.wordCount < 400) {
      weaknesses.push(`Resume is relatively short (${structure.wordCount} words). Add depth to your project descriptions and technical stack.`);
    } else {
      formattingTips.push(`Resume word count (${structure.wordCount}) exceeds typical 2-page sweet spot. Trim verbose descriptions to avoid parser truncation.`);
    }

    // Action verbs & metrics
    if (actionVerbsResult.totalVerbs >= 6) {
      strengths.push(`Strong vocabulary of ${actionVerbsResult.totalVerbs} action verbs (${actionVerbsResult.verbs.slice(0, 4).join(', ')}...) demonstrating leadership.`);
    } else {
      weaknesses.push('Weak action verbs detected. Replace passive phrases ("Responsible for", "Helped with") with active verbs ("Architected", "Engineered", "Optimized").');
    }

    if (atsScoreResult.metricsCount >= 2) {
      strengths.push(`Includes ${atsScoreResult.metricsCount} quantifiable outcomes/metrics showing business impact.`);
    } else {
      weaknesses.push('Insufficient quantifiable metrics. ATS algorithms favor bullets that include %, $, or numerical impact.');
    }

    // Recommended Keywords based on skills found
    if (skillsResult.categorized.programmingLanguages && skillsResult.categorized.programmingLanguages.length > 0) {
      keywordRecommendations.push('CI/CD Pipelines', 'REST APIs', 'System Architecture', 'Automated Testing', 'Microservices');
    } else {
      keywordRecommendations.push('Git', 'RESTful Services', 'Agile/Scrum', 'Unit Testing', 'Docker');
    }

    formattingTips.push('Stick to single-column ATS layouts. Multi-column tables, text boxes, and canvas graphics frequently break ATS parsers.');
    formattingTips.push('Use standard fonts (Calibri, Arial, Helvetica, Georgia) at 10-12pt with standard 0.5 to 1-inch margins.');

    actionableNextSteps.push('Rewrite bullet points using the Google XYZ Formula: "Accomplished [X] as measured by [Y] by doing [Z]".');
    actionableNextSteps.push('Incorporate 3-5 specific keywords from target job descriptions into your Skills and Experience sections.');
    actionableNextSteps.push('Verify section headers use standard naming ("Professional Experience", "Technical Skills", "Education").');

    const quantifiableSuggestions = [
      {
        originalConcept: 'Worked on backend APIs and fixed bugs.',
        improvedExample: 'Engineered 12 RESTful microservice endpoints in Node.js, reducing API response latency by 35% across 100k daily requests.',
      },
      {
        originalConcept: 'Responsible for leading team meetings and code reviews.',
        improvedExample: 'Spearheaded bi-weekly agile sprint ceremonies and mentored 4 junior engineers, decreasing code review cycle times by 25%.',
      },
      {
        originalConcept: 'Built a web application for clients.',
        improvedExample: 'Architected full-stack React and Express web application, serving 5,000+ monthly active users with 99.9% uptime.',
      },
    ];

    return {
      summary: `Your resume scored ${atsScoreResult.totalScore}/100 on the ATS compatibility index. ${
        atsScoreResult.totalScore >= 75
          ? 'It is well-structured and demonstrates strong alignment with modern applicant tracking standards.'
          : 'It has good foundational components, but requires keyword enrichment, structural optimization, and quantifiable achievement bullets to reliably pass automated filters.'
      }`,
      strengths,
      weaknesses,
      missingSections,
      formattingTips,
      quantifiableSuggestions,
      keywordRecommendations,
      actionableNextSteps,
    };
  }
}

module.exports = new AIService();

