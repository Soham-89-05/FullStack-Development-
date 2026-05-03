const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// In-memory store (replace with DB like PostgreSQL/MongoDB in production)
const users = new Map();

const ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user',
};

class User {
  constructor({ email, username, password, role = ROLES.USER }) {
    this.id = uuidv4();
    this.email = email.toLowerCase().trim();
    this.username = username.trim();
    this.password = password; // hashed before storage
    this.role = role;
    this.createdAt = new Date().toISOString();
    this.lastLogin = null;
    this.isActive = true;
  }

  toPublic() {
    const { password, ...pub } = this;
    return pub;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function hashPassword(plain) {
  const SALT_ROUNDS = 12;
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function verifyPassword(plain, hashed) {
  return bcrypt.compare(plain, hashed);
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

async function createUser({ email, username, password, role }) {
  if (findByEmail(email)) throw new Error('Email already registered');
  if (findByUsername(username)) throw new Error('Username already taken');

  const hashed = await hashPassword(password);
  const user = new User({ email, username, password: hashed, role });
  users.set(user.id, user);
  return user;
}

function findById(id) {
  return users.get(id) || null;
}

function findByEmail(email) {
  for (const u of users.values()) {
    if (u.email === email.toLowerCase().trim()) return u;
  }
  return null;
}

function findByUsername(username) {
  for (const u of users.values()) {
    if (u.username.toLowerCase() === username.toLowerCase().trim()) return u;
  }
  return null;
}

function updateLastLogin(id) {
  const user = users.get(id);
  if (user) user.lastLogin = new Date().toISOString();
}

function getAllUsers() {
  return [...users.values()].map(u => u.toPublic());
}

module.exports = {
  ROLES,
  createUser,
  findById,
  findByEmail,
  findByUsername,
  updateLastLogin,
  getAllUsers,
  verifyPassword,
};
