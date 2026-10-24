const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '../../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class JsonTable {
  constructor(name) {
    this.name = name;
    this.filePath = path.join(DATA_DIR, `${name}.json`);
    this.init();
  }

  init() {
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([], null, 2), 'utf-8');
    }
  }

  _read() {
    try {
      this.init();
      const content = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(content || '[]');
    } catch (err) {
      console.error(`Error reading ${this.name}.json:`, err.message);
      return [];
    }
  }

  _write(data) {
    try {
      const tempPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.filePath);
      return true;
    } catch (err) {
      console.error(`Error writing ${this.name}.json:`, err.message);
      return false;
    }
  }

  find(predicate = () => true) {
    const records = this._read();
    return records.filter(predicate);
  }

  findOne(predicate) {
    const records = this._read();
    return records.find(predicate) || null;
  }

  findById(id) {
    return this.findOne(record => record.id === id);
  }

  create(record) {
    const records = this._read();
    const id = record.id || `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newRecord = {
      id,
      ...record,
      createdAt: record.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    records.push(newRecord);
    this._write(records);
    return newRecord;
  }

  update(id, updates) {
    const records = this._read();
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return null;

    records[index] = {
      ...records[index],
      ...updates,
      id, // protect ID from changing
      updatedAt: new Date().toISOString(),
    };
    this._write(records);
    return records[index];
  }

  delete(id) {
    const records = this._read();
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return false;
    records.splice(index, 1);
    this._write(records);
    return true;
  }
}

const usersTable = new JsonTable('users');
const resumesTable = new JsonTable('resumes');
const matchesTable = new JsonTable('matches');

// Pre-seed default user if users table is empty
(async () => {
  const existingUsers = usersTable.find();
  if (existingUsers.length === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('Password123!', salt);
    usersTable.create({
      id: 'demo_user_001',
      name: 'Demo Candidate',
      email: 'demo@example.com',
      password: hashedPassword,
      role: 'candidate',
      headline: 'Full Stack Software Engineer',
    });
    console.log('[DB] Pre-seeded demo user: demo@example.com / Password123!');
  }
})();

module.exports = {
  usersTable,
  resumesTable,
  matchesTable,
};

