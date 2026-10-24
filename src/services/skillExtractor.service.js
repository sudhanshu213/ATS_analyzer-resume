const skillsDictionary = require('../utils/skillsDictionary');

class SkillExtractorService {
  /**
   * Escape special regex characters except when needed
   */
  static _escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Builds a safe regex pattern for a skill term.
   * Handles symbols like C++, C#, .NET, Node.js appropriately.
   */
  static _buildSkillRegex(skill) {
    const escaped = this._escapeRegex(skill);
    // If the skill begins/ends with special symbols (like + or # or .), word boundaries \b don't match cleanly.
    const startBoundary = /^[a-zA-Z0-9]/.test(skill) ? '(?<![a-zA-Z0-9])' : '';
    const endBoundary = /[a-zA-Z0-9]$/.test(skill) ? '(?![a-zA-Z0-9])' : '';
    return new RegExp(`${startBoundary}${escaped}${endBoundary}`, 'gi');
  }

  /**
   * Extract skills from any text (resume or job description)
   */
  static extractSkills(text) {
    if (!text || typeof text !== 'string') {
      return {
        totalSkillsCount: 0,
        skills: [],
        categorized: {},
        topSkills: [],
      };
    }

    const categorized = {};
    const skillCounts = {};
    const allFoundSkills = new Set();

    for (const [category, skillsList] of Object.entries(skillsDictionary)) {
      categorized[category] = [];

      for (const skill of skillsList) {
        const regex = this._buildSkillRegex(skill);
        const matches = text.match(regex);

        if (matches && matches.length > 0) {
          const canonicalName = skill;
          allFoundSkills.add(canonicalName);
          categorized[category].push(canonicalName);
          skillCounts[canonicalName] = (skillCounts[canonicalName] || 0) + matches.length;
        }
      }
    }

    const uniqueSkills = Array.from(allFoundSkills);
    const topSkills = Object.entries(skillCounts)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    return {
      totalSkillsCount: uniqueSkills.length,
      skills: uniqueSkills,
      categorized,
      topSkills,
    };
  }

  /**
   * Extract action verbs from text
   */
  static extractActionVerbs(text) {
    const { ACTION_VERBS } = require('../config/constants');
    const foundVerbs = [];
    const verbCounts = {};

    for (const verb of ACTION_VERBS) {
      const regex = new RegExp(`\\b${verb}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches && matches.length > 0) {
        foundVerbs.push(verb);
        verbCounts[verb] = matches.length;
      }
    }

    return {
      totalVerbs: foundVerbs.length,
      verbs: foundVerbs,
      verbCounts,
    };
  }
}

module.exports = SkillExtractorService;

