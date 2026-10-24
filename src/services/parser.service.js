const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const { ATS_SECTIONS } = require('../config/constants');

class ParserService {
  /**
   * Extract raw text from file path depending on file extension
   */
  static async extractText(filePath, mimeType) {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.pdf' || mimeType === 'application/pdf') {
      return this._parsePdf(filePath);
    }

    if (ext === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return this._parseDocx(filePath);
    }

    if (ext === '.txt' || ext === '.doc') {
      return this._parseTextFile(filePath);
    }

    throw new Error(`Unsupported file extension: ${ext}`);
  }

  static async _parsePdf(filePath) {
    try {
      const buffer = fs.readFileSync(filePath);
      const pdfParseModule = require('pdf-parse');

      // Check if pdf-parse is v2 (exports PDFParse class)
      if (pdfParseModule.PDFParse) {
        const parser = new pdfParseModule.PDFParse({ data: buffer });
        const result = await parser.getText();
        return (result && result.text) ? result.text.trim() : '';
      }

      // Check if pdf-parse is v1 (exports function)
      if (typeof pdfParseModule === 'function') {
        const result = await pdfParseModule(buffer);
        return (result && result.text) ? result.text.trim() : '';
      }

      // Fallback
      return buffer.toString('utf-8');
    } catch (err) {
      console.error('Error parsing PDF:', err.message);
      throw new Error(`Failed to extract text from PDF: ${err.message}`);
    }
  }

  static async _parseDocx(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value ? result.value.trim() : '';
    } catch (err) {
      console.error('Error parsing DOCX:', err.message);
      throw new Error(`Failed to extract text from DOCX: ${err.message}`);
    }
  }

  static async _parseTextFile(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf-8').trim();
    } catch (err) {
      throw new Error(`Failed to read text file: ${err.message}`);
    }
  }

  /**
   * Parse structured metadata, contact info, and sections from extracted text
   */
  static parseResumeStructure(text) {
    if (!text || typeof text !== 'string') {
      return {
        wordCount: 0,
        characterCount: 0,
        lineCount: 0,
        contactInfo: {},
        detectedSections: [],
      };
    }

    const words = text.match(/\b[A-Za-z0-9#+.-]+\b/g) || [];
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    const contactInfo = {
      emails: this._extractEmails(text),
      phones: this._extractPhones(text),
      linkedin: this._extractLinkedIn(text),
      github: this._extractGitHub(text),
      urls: this._extractUrls(text),
    };

    const detectedSections = this._detectSections(lines);

    return {
      wordCount: words.length,
      characterCount: text.length,
      lineCount: lines.length,
      contactInfo,
      detectedSections,
    };
  }

  static _extractEmails(text) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g;
    const matches = text.match(emailRegex) || [];
    return [...new Set(matches.map(m => m.toLowerCase()))];
  }

  static _extractPhones(text) {
    // Matches international & domestic phone numbers (+1 234 567 8900, (123) 456-7890, +91-9876543210, etc.)
    const phoneRegex = /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,5}[\s.-]?\d{4,5}\b/g;
    const matches = text.match(phoneRegex) || [];
    // Filter out strings that look like years or short numbers
    return [...new Set(matches.map(p => p.trim()).filter(p => p.replace(/\D/g, '').length >= 10))];
  }

  static _extractLinkedIn(text) {
    const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|profile)\/[a-zA-Z0-9_-]+/gi;
    const matches = text.match(linkedinRegex) || [];
    return [...new Set(matches)];
  }

  static _extractGitHub(text) {
    const githubRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/gi;
    const matches = text.match(githubRegex) || [];
    return [...new Set(matches)];
  }

  static _extractUrls(text) {
    const urlRegex = /(?:https?:\/\/)(?:www\.)?[a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b(?:[-a-zA-Z0-9@:%_+.~#?&//=]*)/gi;
    const matches = text.match(urlRegex) || [];
    return [...new Set(matches)];
  }

  static _detectSections(lines) {
    const sectionKeywords = {
      summary: ['summary', 'professional summary', 'objective', 'about me', 'profile'],
      experience: ['experience', 'work experience', 'employment history', 'work history', 'professional experience'],
      education: ['education', 'academic background', 'academic qualifications', 'degrees'],
      skills: ['skills', 'technical skills', 'core competencies', 'technologies', 'skill set', 'areas of expertise'],
      projects: ['projects', 'personal projects', 'academic projects', 'key projects'],
      certifications: ['certifications', 'certificates', 'licenses', 'credentials'],
    };

    const found = [];

    for (const line of lines) {
      const cleanLine = line.toLowerCase().replace(/[^a-z\s]/g, '').trim();
      for (const [sectionKey, keywords] of Object.entries(sectionKeywords)) {
        if (!found.includes(sectionKey)) {
          if (keywords.some(k => cleanLine === k || cleanLine.startsWith(k) && cleanLine.length <= k.length + 12)) {
            found.push(sectionKey);
          }
        }
      }
    }

    return found;
  }
}

module.exports = ParserService;

