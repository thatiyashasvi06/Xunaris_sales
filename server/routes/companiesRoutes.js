import express from 'express';
import db from '../db/database.js';
import { generateCompanyId, generateContactId } from '../services/idGenerator.js';
import { logAuditEvent } from '../middleware/auditMiddleware.js';

const router = express.Router();

// GET all companies
router.get('/', (req, res) => {
  const companies = db.prepare(`
    SELECT * FROM companies 
    WHERE status != 'Archived' 
    ORDER BY created_at DESC
  `).all();
  res.json(companies);
});

// POST new company
router.post('/', (req, res) => {
  const { name, website, industry, city, country, businessUnit, accountOwner, notes } = req.body;
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: 'Company name is required (min 2 characters).' });
  }

  const trimmedName = name.trim();
  const normalizedName = trimmedName.toLowerCase();
  const normalizedDomain = website ? website.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase() : null;

  // Check if exists
  const existing = db.prepare(`
    SELECT * FROM companies 
    WHERE LOWER(name) = ? OR (normalized_domain IS NOT NULL AND normalized_domain = ?)
  `).get(normalizedName, normalizedDomain);

  if (existing) {
    return res.json({ message: 'Company already exists', company: existing });
  }

  const id = generateCompanyId();
  db.prepare(`
    INSERT INTO companies (id, name, normalized_name, website, normalized_domain, industry, city, country, business_unit, account_owner, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    trimmedName,
    normalizedName,
    website || null,
    normalizedDomain,
    industry || 'IT Services',
    city || '',
    country || 'India',
    businessUnit || 'Both',
    accountOwner || 'Sales User',
    notes || ''
  );

  const created = db.prepare('SELECT * FROM companies WHERE id = ?').get(id);
  logAuditEvent(req.user?.email, 'CREATE_COMPANY', 'COMPANY', id, { name: trimmedName });

  res.status(201).json(created);
});

// GET all contacts
router.get('/contacts', (req, res) => {
  const { companyId } = req.query;
  let query = `
    SELECT c.*, co.name AS company_name 
    FROM contacts c 
    LEFT JOIN companies co ON c.company_id = co.id 
    WHERE c.status != 'Archived'
  `;
  const params = [];

  if (companyId) {
    query += ' AND c.company_id = ?';
    params.push(companyId);
  }

  query += ' ORDER BY c.full_name ASC';
  const contacts = db.prepare(query).all(...params);
  res.json(contacts);
});

// POST new contact
router.post('/contacts', (req, res) => {
  const { companyId, fullName, title, email, phone, relationship } = req.body;
  if (!companyId || !fullName) {
    return res.status(400).json({ error: 'Company ID and Full Name are required.' });
  }

  if (!email && !phone) {
    return res.status(400).json({ error: 'Enter at least one contact method: work email or phone.' });
  }

  const normalizedEmail = email ? email.trim().toLowerCase() : null;
  const normalizedPhone = phone ? phone.replace(/[^0-9]/g, '') : null;

  const id = generateContactId();
  db.prepare(`
    INSERT INTO contacts (id, company_id, full_name, title, email, normalized_email, phone, normalized_phone, relationship)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    companyId,
    fullName.trim(),
    title || 'Lead Contact',
    email || null,
    normalizedEmail,
    phone || null,
    normalizedPhone,
    relationship || 'Decision maker'
  );

  const created = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  logAuditEvent(req.user?.email, 'CREATE_CONTACT', 'CONTACT', id, { fullName: fullName.trim() });

  res.status(201).json(created);
});

export default router;
