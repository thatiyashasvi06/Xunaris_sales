import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';
import db from '../db/database.js';
import { logAuditEvent } from '../middleware/auditMiddleware.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'xunaris_super_secret_jwt_key_2026';

// Rate Limiting Memory Store
const loginAttempts = new Map();
const resetTokens = new Map();

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip || req.connection.remoteAddress;

  if (!email || !password) {
    return res.status(400).json({ error: 'Work email and password are required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Rate Limiting Check
  const attempts = loginAttempts.get(normalizedEmail) || { count: 0, lockoutUntil: 0 };
  if (attempts.lockoutUntil > Date.now()) {
    const remainingSeconds = Math.ceil((attempts.lockoutUntil - Date.now()) / 1000);
    return res.status(429).json({
      error: `Rate limit active. Please wait ${remainingSeconds} seconds before retrying.`
    });
  }

  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(normalizedEmail);

  if (!user || user.status !== 'Active') {
    attempts.count += 1;
    if (attempts.count >= 5) {
      attempts.lockoutUntil = Date.now() + 60000; // 60 sec lockout
    }
    loginAttempts.set(normalizedEmail, attempts);
    return res.status(401).json({ error: 'Invalid work email or password credentials.' });
  }

  // Password verification
  let isMatch = false;
  try {
    isMatch = bcrypt.compareSync(password, user.password_hash);
  } catch (e) {
    isMatch = false;
  }

  if (!isMatch) {
    attempts.count += 1;
    if (attempts.count >= 5) {
      attempts.lockoutUntil = Date.now() + 60000;
    }
    loginAttempts.set(normalizedEmail, attempts);
    return res.status(401).json({ error: 'Invalid work email or password credentials.' });
  }

  // Reset failed attempts on success
  loginAttempts.delete(normalizedEmail);

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  logAuditEvent(user.email, 'LOGIN', 'USER', user.id, 'User logged in successfully', ip);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      functionAccess: user.function_access,
      scopeEnforcement: user.scope_enforcement
    }
  });
});

// Self-Service Sign Up / Registration
router.post('/register', (req, res) => {
  const { name, email, password, department, functionAccess } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, work email, and password are required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Enter a valid work email address.' });
  }

  if (password.length < 12) {
    return res.status(400).json({ error: 'Password must be at least 12 characters.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(normalizedEmail);
  if (existing) {
    return res.status(400).json({ error: 'An account with this email address already exists. Please sign in.' });
  }

  const id = `usr_${Date.now()}`;
  const hash = bcrypt.hashSync(password, 10);
  const dept = (department || 'Sales').trim();
  const func = (functionAccess || 'Sales').trim();
  const scope = func === 'Both' ? 'Owner / Team Scope Enforced' : `Owner / ${func} Team Scope Enforced`;

  db.prepare(`
    INSERT INTO users (id, name, email, role, department, function_access, scope_enforcement, password_hash, status)
    VALUES (?, ?, ?, 'USER', ?, ?, ?, ?, 'Active')
  `).run(id, name.trim(), normalizedEmail, dept, func, scope, hash);

  const token = jwt.sign(
    { id, email: normalizedEmail, role: 'USER' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  logAuditEvent(normalizedEmail, 'SIGN_UP', 'USER', id, 'New user self-registered via Sign Up');

  res.status(201).json({
    message: 'Account created successfully.',
    token,
    user: {
      id,
      name: name.trim(),
      email: normalizedEmail,
      role: 'USER',
      department: dept,
      functionAccess: func,
      scopeEnforcement: scope
    }
  });
});

// Admin-only: an unauthenticated reset that returns the token would let anyone take over any account.
router.post('/reset', authMiddleware, requireRole('ADMIN'), (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const token = `XUN-RST-${crypto.randomBytes(16).toString('hex')}`;

  resetTokens.set(token, {
    email: normalizedEmail,
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins
    used: false
  });

  logAuditEvent(normalizedEmail, 'RESET_TOKEN_GENERATED', 'AUTH', null, { requestedBy: req.user?.email });

  res.json({
    message: 'Single-use reset token generated.',
    token,
    expiresInSeconds: 900
  });
});

router.post('/reset-confirm', (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password required.' });
  }

  if (newPassword.length < 12) {
    return res.status(400).json({ error: 'Password must be at least 12 characters.' });
  }

  const tokenData = resetTokens.get(token);
  if (!tokenData || tokenData.used || tokenData.expiresAt < Date.now()) {
    return res.status(400).json({ error: 'Token is invalid, expired, or already consumed.' });
  }

  tokenData.used = true;
  const hash = bcrypt.hashSync(newPassword, 10);

  db.prepare('UPDATE users SET password_hash = ? WHERE LOWER(email) = ?').run(hash, tokenData.email);
  logAuditEvent(tokenData.email, 'PASSWORD_RESET', 'USER', null, 'Password successfully reset via token');

  res.json({ message: 'Password updated successfully. Token burned.' });
});

router.get('/users', (req, res) => {
  const users = db.prepare(`
    SELECT id, name, email, role, department, function_access as functionAccess, 
           scope_enforcement as scopeEnforcement, status 
    FROM users 
    WHERE status = 'Active'
    ORDER BY name ASC
  `).all();
  res.json(users);
});

export default router;
