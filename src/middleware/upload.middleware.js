const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config/env');
const { ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS } = require('../config/constants');

// Ensure upload directory exists
const uploadDir = path.resolve(config.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e6)}`;
    cb(null, `${sanitizedBase}_${uniqueSuffix}${ext}`);
  },
});

// File filter validation
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isExtValid = ALLOWED_EXTENSIONS.includes(ext);
  const isMimeValid = ALLOWED_MIME_TYPES.includes(file.mimetype) || file.mimetype === 'application/octet-stream';

  if (isExtValid && (isMimeValid || ext === '.pdf' || ext === '.docx' || ext === '.doc' || ext === '.txt')) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type "${ext}". Only PDF (.pdf), Word (.docx, .doc), and plain text (.txt) files are supported.`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  fileFilter,
});

module.exports = upload;

