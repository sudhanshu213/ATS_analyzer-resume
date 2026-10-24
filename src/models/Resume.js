const { resumesTable } = require('./db');

class Resume {
  static create({
    userId,
    originalName,
    fileName,
    filePath,
    mimeType,
    fileSize,
    rawText = '',
    parsedData = {},
  }) {
    return resumesTable.create({
      userId,
      originalName,
      fileName,
      filePath,
      mimeType,
      fileSize,
      rawText,
      parsedData,
      analysis: null,
      skills: null,
    });
  }

  static findById(id) {
    return resumesTable.findById(id);
  }

  static findByUserId(userId) {
    return resumesTable.find(r => r.userId === userId);
  }

  static update(id, updates) {
    return resumesTable.update(id, updates);
  }

  static delete(id) {
    return resumesTable.delete(id);
  }
}

module.exports = Resume;

