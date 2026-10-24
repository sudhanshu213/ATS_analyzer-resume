require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'ats_super_secret_jwt_key_2026_change_in_production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10,
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
};

