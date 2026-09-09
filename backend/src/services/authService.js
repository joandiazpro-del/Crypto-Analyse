const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const db       = require('../database/db');

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || crypto.randomBytes(32).toString('hex');
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || crypto.randomBytes(32).toString('hex');
const ACCESS_TTL     = '15m';
const REFRESH_TTL    = '7d';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS  = 12;

// ─── Tokens ────────────────────────────────────────────────────────────────────

function signAccess(user) {
  return jwt.sign({ userId: user.id, email: user.email, plan: user.plan }, ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}

function signRefresh(user) {
  const token = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS).toISOString();
  db.prepare('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)')
    .run(user.id, token, expiresAt);
  return token;
}

function verifyAccess(token)  { return jwt.verify(token, ACCESS_SECRET); }
function verifyRefresh(token) { return jwt.verify(token, REFRESH_SECRET); }

// ─── Auth ──────────────────────────────────────────────────────────────────────

async function register({ email, password, name = '' }) {
  if (!email || !password) throw Object.assign(new Error('Email et mot de passe requis'), { status: 400 });
  if (password.length < 8)  throw Object.assign(new Error('Mot de passe trop court (8 caractères min)'), { status: 400 });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) throw Object.assign(new Error('Email déjà utilisé'), { status: 409 });

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const { lastInsertRowid } = db.prepare(
    'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
  ).run(email.toLowerCase(), hash, name.trim());

  const user = db.prepare('SELECT id, email, name, plan, created_at FROM users WHERE id = ?').get(lastInsertRowid);
  return user;
}

async function login({ email, password }) {
  if (!email || !password) throw Object.assign(new Error('Email et mot de passe requis'), { status: 400 });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) throw Object.assign(new Error('Email ou mot de passe incorrect'), { status: 401 });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw Object.assign(new Error('Email ou mot de passe incorrect'), { status: 401 });

  const { password_hash, ...safe } = user;
  return safe;
}

function logout(refreshToken) {
  if (refreshToken) {
    db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);
  }
}

function refresh(refreshToken) {
  if (!refreshToken) throw Object.assign(new Error('Refresh token manquant'), { status: 401 });

  let payload;
  try { payload = verifyRefresh(refreshToken); }
  catch { throw Object.assign(new Error('Refresh token invalide ou expiré'), { status: 401 }); }

  const stored = db.prepare('SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > datetime("now")')
    .get(refreshToken);
  if (!stored) throw Object.assign(new Error('Refresh token révoqué'), { status: 401 });

  // Rotation : supprime l'ancien, crée un nouveau
  db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);

  const user = db.prepare('SELECT id, email, name, plan FROM users WHERE id = ?').get(payload.userId);
  if (!user) throw Object.assign(new Error('Utilisateur introuvable'), { status: 401 });

  return user;
}

function getUser(userId) {
  return db.prepare('SELECT id, email, name, plan, created_at FROM users WHERE id = ?').get(userId);
}

module.exports = { register, login, logout, refresh, getUser, signAccess, signRefresh, verifyAccess };
