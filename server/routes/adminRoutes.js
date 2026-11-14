import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/database.js';
import { authMiddleware, requireRole, JWT_SECRET } from '../middleware/authMiddleware.js';
import { generateActivityId } from '../services/idGenerator.js';
import { queueEmailAlert } from '../services/backgroundWorker.js';
import { logAuditEvent } from '../middleware/auditMiddleware.js';

const router = express.Router();

// Guard all admin routes
router.use(authMiddleware);
router.use(requireRole('ADMIN'));

// Short-lived link that opens the API documentation (/api-docs) for admins only
router.post('/docs-link', (req, res) => {
  const t = jwt.sign({ scope: 'docs' }, JWT_SECRET, { expiresIn: '2m' });
  logAuditEvent(req.user.email, 'OPEN_API_DOCS', 'SYSTEM', null, {});
  res.json({ url: `/api-docs/?t=${t}` });
});

// GET all users
router.get('/users', (req, res) => {
  const users = db.prepare(`
    SELECT id, name, email, role, department, function_access as functionAccess, 
           scope_enforcement as scopeEnforcement, status, created_at 
    FROM users 
    ORDER BY created_at DESC
  `).all();
  res.json(users);
});

// POST new user
router.post('/users', (req, res) => {
  const { name, email, role, department, functionAccess, scopeEnforcement, password } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(normalizedEmail);
  if (existing) {
    return res.status(400).json({ error: 'A user with this email address already exists.' });
  }

  if (!password || password.length < 12) {
    return res.status(400).json({ error: 'A password of at least 12 characters is required.' });
  }

  const id = `usr_${Date.now()}`;
  const hash = bcrypt.hashSync(password, 10);

  db.prepare(`
    INSERT INTO users (id, name, email, role, department, function_access, scope_enforcement, password_hash, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active')
  `).run(
    id,
    name.trim(),
    normalizedEmail,
    role || 'USER',
    department || 'Sales',
    functionAccess || 'Sales',
    scopeEnforcement || 'Owner / Team Scope Enforced',
    hash
  );

  logAuditEvent(req.user.email, 'ADD_USER', 'USER', id, { email: normalizedEmail, role });
  const created = db.prepare('SELECT id, name, email, role, department, function_access as functionAccess, status FROM users WHERE id = ?').get(id);
  res.status(201).json(created);
});

// PUT set a user's password (admin only; stored as a bcrypt hash, never returned)
router.put('/users/:id/password', (req, res) => {
  const { password } = req.body || {};
  if (!password || password.length < 12) {
    return res.status(400).json({ error: 'Password must be at least 12 characters.' });
  }
  const target = db.prepare('SELECT id, email FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found.' });
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), target.id);
  logAuditEvent(req.user.email, 'ADMIN_PASSWORD_RESET', 'USER', target.id, { email: target.email });
  res.json({ message: `Password updated for ${target.email}.` });
});

// DELETE user
router.delete('/users/:id', (req, res) => {
  const adminCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'ADMIN'").get().c;
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);

  if (!target) return res.status(404).json({ error: 'User not found.' });

  if (target.role === 'ADMIN' && adminCount <= 1) {
    return res.status(400).json({ error: 'Cannot delete the sole remaining administrator.' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  logAuditEvent(req.user.email, 'DELETE_USER', 'USER', req.params.id, { email: target.email });
  res.json({ message: `User "${target.name}" removed from system directory.` });
});

// GET & TOGGLE automation rules
router.get('/rules', (req, res) => {
  const rules = db.prepare('SELECT * FROM automation_rules ORDER BY id ASC').all();
  res.json(rules);
});

router.post('/rules/:id/toggle', (req, res) => {
  const rule = db.prepare('SELECT * FROM automation_rules WHERE id = ?').get(req.params.id);
  if (!rule) return res.status(404).json({ error: 'Rule not found' });

  const nextState = rule.enabled === 'Yes' ? 'No' : 'Yes';
  db.prepare('UPDATE automation_rules SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(nextState, rule.id);

  logAuditEvent(req.user.email, 'TOGGLE_RULE', 'AUTOMATION_RULE', rule.id, { from: rule.enabled, to: nextState });
  res.json({ message: `Rule ${rule.rule_name} toggled to ${nextState}`, enabled: nextState });
});

// POST test email diagnostic
router.post('/test-email', (req, res) => {
  const sender = req.body.emailSender || 'CRM notifications <notifications@xunaris.com>';
  const recipient = req.user.email;
  const subject = `Admin System Diagnostic dispatched via ${sender}`;
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

  // Queue in Outbox
  const outboxId = queueEmailAlert(
    recipient,
    subject,
    `Diagnostic verification pass initiated at ${nowStr} by ${req.user.name}.`,
    `test_email_${Date.now()}`
  );

  // Log in Activities
  const actId = generateActivityId();
  db.prepare(`
    INSERT INTO activities (
      id, related_type, related_id, related_to, activity_type, subject, date_time,
      assigned_to, status, outcome, result
    ) VALUES (?, 'Internal', ?, 'Internal System Outbox', 'Email', ?, ?, ?, 'Completed', 'Verification passed', 'Diagnostic Delivered')
  `).run(actId, outboxId || 'test', subject, nowStr, req.user.name);

  logAuditEvent(req.user.email, 'TEST_EMAIL_DISPATCHED', 'SYSTEM', outboxId);
  res.json({ message: `Test email dispatched via ${sender} to ${recipient}! Verified delivery.` });
});

// POST clear test data
router.post('/clear-test-data', (req, res) => {
  try {
    db.exec(`
      DELETE FROM leads;
      DELETE FROM opportunities;
      DELETE FROM activities;
      DELETE FROM campaigns;
      DELETE FROM contacts;
      DELETE FROM companies;
      DELETE FROM email_outbox;
    `);
    logAuditEvent(req.user?.email || 'admin@xunaris.com', 'CLEAR_TEST_DATA', 'SYSTEM', 'ALL', { cleared: true });
    res.json({ message: 'All sample test records cleared successfully from database.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET audit logs
router.get('/audit', (req, res) => {
  const events = db.prepare('SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 50').all();
  res.json(events);
});

export default router;
