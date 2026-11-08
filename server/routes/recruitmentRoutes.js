import express from 'express';
import db from '../db/database.js';
import { logAuditEvent } from '../middleware/auditMiddleware.js';

const router = express.Router();

// Partners
router.get('/partners', (req, res) => {
  const partners = db.prepare('SELECT * FROM recruitment_partners ORDER BY created_at DESC').all();
  res.json(partners);
});

router.post('/partners', (req, res) => {
  const { name, website, contactName, contactEmail, phone, payrollModel, notes } = req.body;
  if (!name || !contactName || !contactEmail) {
    return res.status(400).json({ error: 'Agency name, contact name, and contact email are required.' });
  }

  const id = `part_${Date.now()}`;
  db.prepare(`
    INSERT INTO recruitment_partners (id, name, website, contact_name, contact_email, phone, payroll_model, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
  `).run(id, name.trim(), website || null, contactName.trim(), contactEmail.trim().toLowerCase(), phone || null, payrollModel || 'Partner Payroll', notes || null);

  const created = db.prepare('SELECT * FROM recruitment_partners WHERE id = ?').get(id);
  res.status(201).json(created);
});

router.patch('/partners/:id/status', (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE recruitment_partners SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ message: `Partner agency status updated to ${status}` });
});

// Recruiters
router.get('/recruiters', (req, res) => {
  const recruiters = db.prepare('SELECT * FROM recruitment_recruiters ORDER BY created_at DESC').all();
  res.json(recruiters);
});

router.post('/recruiters', (req, res) => {
  const { name, email, agencyId, agencyName } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM recruitment_recruiters WHERE LOWER(email) = ?').get(normalizedEmail);
  if (existing) {
    return res.status(400).json({ error: 'A recruiter with this email address has already been invited.' });
  }

  const id = `rec_${Date.now()}`;
  db.prepare(`
    INSERT INTO recruitment_recruiters (id, name, email, agency_id, agency_name, status)
    VALUES (?, ?, ?, ?, ?, 'Invited')
  `).run(id, name.trim(), normalizedEmail, agencyId || null, agencyName || null);

  const created = db.prepare('SELECT * FROM recruitment_recruiters WHERE id = ?').get(id);
  res.status(201).json(created);
});

// Jobs
router.get('/jobs', (req, res) => {
  const jobs = db.prepare('SELECT * FROM recruitment_jobs ORDER BY created_at DESC').all();
  res.json(jobs);
});

router.post('/jobs', (req, res) => {
  const { title, department, location, type, payrollType, description, openings } = req.body;
  if (!title || !department || !payrollType) {
    return res.status(400).json({ error: 'Title, department, and payroll model are required.' });
  }

  const id = `job_${Date.now()}`;
  db.prepare(`
    INSERT INTO recruitment_jobs (id, title, department, location, type, payroll_type, description, openings, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Approved')
  `).run(id, title.trim(), department.trim(), location || 'Bengaluru', type || 'Full-Time', payrollType, description || '', Number(openings) || 1);

  const created = db.prepare('SELECT * FROM recruitment_jobs WHERE id = ?').get(id);
  res.status(201).json(created);
});

router.patch('/jobs/:id/status', (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE recruitment_jobs SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ message: `Job requisition status updated to ${status}` });
});

// Candidates
router.get('/candidates', (req, res) => {
  const candidates = db.prepare('SELECT * FROM recruitment_candidates ORDER BY created_at DESC').all();
  res.json(candidates);
});

router.post('/candidates', (req, res) => {
  const { jobId, jobTitle, name, email, phone, resumeScore, interviewScore, aiSummary, payrollModel } = req.body;
  if (!jobId || !name || !email) {
    return res.status(400).json({ error: 'Job ID, candidate name, and email are required.' });
  }

  const id = `cand_${Date.now()}`;
  db.prepare(`
    INSERT INTO recruitment_candidates (
      id, job_id, job_title, name, email, phone, resume_score, interview_score, ai_summary, payroll_model, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Applied')
  `).run(
    id,
    jobId,
    jobTitle || 'Requisition',
    name.trim(),
    email.trim().toLowerCase(),
    phone || null,
    resumeScore || 85,
    interviewScore || 80,
    aiSummary || 'Automated resume screening pass',
    payrollModel || 'Xunaris Payroll'
  );

  const created = db.prepare('SELECT * FROM recruitment_candidates WHERE id = ?').get(id);
  res.status(201).json(created);
});

router.patch('/candidates/:id/status', (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE recruitment_candidates SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ message: `Candidate status updated to ${status}` });
});

export default router;
