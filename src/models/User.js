const bcrypt = require('bcryptjs');
const { usersTable } = require('./db');

class User {
  static async create({ name, email, password, role = 'candidate', headline = '' }) {
    const existing = this.findByEmail(email);
    if (existing) {
      throw new Error('User already exists with this email address');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = usersTable.create({
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      headline,
    });

    return this.sanitize(user);
  }

  static findByEmail(email) {
    if (!email) return null;
    return usersTable.findOne(u => u.email.toLowerCase() === email.toLowerCase().trim());
  }

  static findById(id) {
    const user = usersTable.findById(id);
    return user ? this.sanitize(user) : null;
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static sanitize(user) {
    if (!user) return null;
    const { password, ...safeUser } = user;
    return safeUser;
  }
}

module.exports = User;

