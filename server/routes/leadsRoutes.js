import express from 'express';
import multer from 'multer';
import db from '../db/database.js';
import { generateLeadId, generateOpportunityId, generateCompanyId, generateContactId, generateActivityId } from '../services/idGenerator.js';
import { validateLeadPayload, checkPossibleDuplicate } from '../services/leadValidator.js';
import { queueEmailAlert, createNotification } from '../services/backgroundWorker.js';
import { logAuditEvent } from '../middleware/auditMiddleware.js';
import { routeNewLead, logRouting } from '../services/routing.js';

const router = express.Router();
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// GET /api/leads with filters
router.get('/', (req, res) => {
  const { vertical, status, owner, search } = req.query;
  let query = 'SELECT * FROM leads WHERE 1=1';
  const params = [];

  if (vertical && vertical !== 'All') {
    const code = (vertical === 'HYRA' || vertical === 'HYRA Connect') ? 'HYRA' : 'XUN';
    query += ' AND business_vertical_code = ?';
    params.push(code);
  }

  if (status && status !== 'All') {
    query += ' AND lead_status = ?';
    params.push(status);
  }

  if (owner && owner !== 'All') {
    query += ' AND (owner_name = ? OR owner_email = ?)';
    params.push(owner, owner);
  }

  if (search) {
    query += ' AND (company_name LIKE ? OR contact_name LIKE ? OR work_email LIKE ? OR id LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  query += ' ORDER BY created_at DESC';
  const leads = db.prepare(query).all(...params);
  res.json(leads);
});

// POST /api/leads: Single lead creation
router.post('/', (req, res) => {
  const validation = validateLeadPayload(req.body);
  if (!validation.isValid) {
    return res.status(400).json({ errors: validation.errors });
  }

  const {
    verticalCode,
    verticalName,
    service,
    companyName,
    contactName,
    workEmail,
    phone
  } = validation.normalized;

  const leadId = generateLeadId(verticalCode);

  // 1. Match or Create Company
  let companyId = null;
  const existingCompany = db.prepare(`
    SELECT id FROM companies WHERE LOWER(name) = ?
  `).get(companyName.toLowerCase());

  if (existingCompany) {
    companyId = existingCompany.id;
  } else {
    companyId = generateCompanyId();
    db.prepare(`
      INSERT INTO companies (id, name, normalized_name, industry, city, country, business_unit, account_owner, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      companyId,
      companyName,
      companyName.toLowerCase(),
      req.body.industry || 'IT Services',
      req.body.city || '',
      req.body.country || 'India',
      verticalCode === 'XUN' ? 'Xunaris' : 'HYRA Connect',
      req.body.ownerName || 'Sales User',
      `Auto-created from lead ${leadId}`
    );
  }

  // 2. Match or Create Contact
  let contactId = null;
  if (workEmail) {
    const existingContact = db.prepare(`
      SELECT id FROM contacts WHERE LOWER(email) = ? AND company_id = ?
    `).get(workEmail.toLowerCase(), companyId);

    if (existingContact) {
      contactId = existingContact.id;
    }
  }

  if (!contactId) {
    contactId = generateContactId();
    db.prepare(`
      INSERT INTO contacts (id, company_id, full_name, title, email, normalized_email, phone, normalized_phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      contactId,
      companyId,
      contactName,
      req.body.jobTitle || 'Lead Contact',
      workEmail || null,
      workEmail ? workEmail.toLowerCase() : null,
      phone || null,
      phone ? phone.replace(/[^0-9]/g, '') : null
    );
  }

  let ownerName;
  let ownerEmail;
  let routedReason = null;
  const wantsAuto = !req.body.ownerEmail || String(req.body.ownerEmail).toLowerCase() === 'auto';
  if (wantsAuto) {
    const r = routeNewLead({
      job_title: req.body.jobTitle, industry: req.body.industry, requirement_summary: req.body.requirementSummary,
      notes: req.body.notes, service, priority: req.body.priority || 'Medium', lead_source: req.body.leadSource,
      lead_status: 'New', work_email: workEmail, phone, created_at: new Date().toISOString()
    });
    ownerName = r.ownerName;
    ownerEmail = r.ownerEmail;
    routedReason = r.reason;
  } else {
    ownerName = req.body.ownerName || (req.user?.name || 'Sales User');
    ownerEmail = req.body.ownerEmail;
  }
  const ownerUserId = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(ownerEmail || '')?.id || null;
  const nextFollowup = req.body.nextFollowupDate || new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // 3. Insert Lead
  db.prepare(`
    INSERT INTO leads (
      id, business_vertical_code, business_vertical_name, service, service_description,
      company_name, company_website, industry, city, country, contact_name, job_title,
      work_email, phone, lead_source, campaign_id, campaign_name, requirement_summary,
      priority, lead_status, owner_id, owner_name, owner_email, next_followup_date, notes,
      company_id, contact_id, created_by
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?
    )
  `).run(
    leadId,
    verticalCode,
    verticalName,
    service,
    req.body.serviceDescription || null,
    companyName,
    req.body.companyWebsite || null,
    req.body.industry || 'IT Services',
    req.body.city || '',
    req.body.country || 'India',
    contactName,
    req.body.jobTitle || 'Lead Contact',
    workEmail || null,
    phone || null,
    req.body.leadSource || 'Manual',
    req.body.campaignId || null,
    req.body.campaignName || null,
    req.body.requirementSummary || null,
    req.body.priority || 'Medium',
    req.body.leadStatus || 'New',
    ownerUserId || req.body.ownerId || null,
    ownerName,
    ownerEmail,
    nextFollowup,
    req.body.notes || '',
    companyId,
    contactId,
    req.user?.email || 'system'
  );

  // 4. Initial follow-up task
  const activityId = generateActivityId();
  db.prepare(`
    INSERT INTO activities (
      id, related_type, related_id, related_to, activity_type, subject, date_time,
      assigned_to, status, next_followup, result
    ) VALUES (?, 'Lead', ?, ?, 'Task', ?, ?, ?, 'Planned', ?, 'Pending Contact')
  `).run(
    activityId,
    leadId,
    companyName,
    `Initial Follow-up: Connect regarding ${service}`,
    `${nextFollowup} 10:00`,
    ownerName,
    nextFollowup
  );

  // 5. Owner Alert & Outbox
  const idempotencyKey = `lead_create_${leadId}`;
  if (ownerEmail) {
    queueEmailAlert(
      ownerEmail,
      `New Lead Assigned: [${leadId}] ${companyName}`,
      `You have been assigned as owner for lead ${leadId} (${companyName}) under ${verticalName}. Next action due: ${nextFollowup}.`,
      idempotencyKey
    );

    createNotification(
      ownerEmail,
      `New Lead Assigned: ${leadId}`,
      `${companyName} - ${service}`,
      'info',
      `/leads?id=${leadId}`
    );
  }
  if (routedReason) logRouting(leadId, '', ownerName, routedReason);

  logAuditEvent(req.user?.email, 'CREATE_LEAD', 'LEAD', leadId, { companyName, service, verticalCode });

  const createdLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
  res.status(201).json(createdLead);
});

// POST /api/leads/:id/qualify: Atomically converts lead to Opportunity
router.post('/:id/qualify', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found.' });
  }

  // Specification rule: Requirement summary required before qualification
  const requirement = req.body.requirementSummary || lead.requirement_summary;
  if (!requirement || requirement.trim().length < 5) {
    return res.status(400).json({ error: 'Add the requirement summary before qualifying this lead.' });
  }

  // Prevent duplicate opportunity creation
  if (lead.opportunity_id) {
    return res.status(400).json({
      error: 'This lead has already been converted to an opportunity.',
      opportunityId: lead.opportunity_id
    });
  }

  const oppId = generateOpportunityId(lead.business_vertical_code);
  const expectedValue = req.body.expectedValue || 500000;
  const closeDate = req.body.expectedCloseDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const transaction = db.transaction(() => {
    // 1. Create Opportunity
    db.prepare(`
      INSERT INTO opportunities (
        id, lead_id, business_vertical_code, business_vertical_name, title, service,
        company_id, company_name, contact_id, contact_name, owner_id, owner_name,
        stage, expected_value, currency, expected_close_date, probability_percentage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Discovery', ?, 'INR', ?, 20)
    `).run(
      oppId,
      lead.id,
      lead.business_vertical_code,
      lead.business_vertical_name,
      `${lead.service} - ${lead.company_name}`,
      lead.service,
      lead.company_id,
      lead.company_name,
      lead.contact_id,
      lead.contact_name,
      lead.owner_id,
      lead.owner_name,
      expectedValue,
      closeDate
    );

    // 2. Update Lead status to Qualified and link Opportunity
    db.prepare(`
      UPDATE leads 
      SET lead_status = 'Qualified', 
          requirement_summary = ?, 
          opportunity_id = ?, 
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(requirement.trim(), oppId, lead.id);

    // 3. Log Activity
    const actId = generateActivityId();
    db.prepare(`
      INSERT INTO activities (
        id, related_type, related_id, related_to, activity_type, subject, date_time,
        assigned_to, status, outcome
      ) VALUES (?, 'Opportunity', ?, ?, 'Task', ?, ?, ?, 'Planned', 'Discovery stage initiated')
    `).run(
      actId,
      oppId,
      lead.company_name,
      `Opportunity Created from ${lead.id}`,
      new Date().toISOString().replace('T', ' ').substring(0, 16),
      lead.owner_name
    );
  });

  transaction();

  logAuditEvent(req.user?.email, 'QUALIFY_LEAD', 'LEAD', lead.id, { opportunityId: oppId });
  createNotification(
    lead.owner_email,
    `Lead Qualified -> Opportunity Created: ${oppId}`,
    `${lead.company_name} (${lead.service})`,
    'success',
    `/opportunities?id=${oppId}`
  );

  const createdOpp = db.prepare('SELECT * FROM opportunities WHERE id = ?').get(oppId);
  res.json({ message: 'Lead successfully qualified and Opportunity created.', opportunity: createdOpp });
});

// PATCH /api/leads/:id
router.patch('/:id', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const fields = ['lead_status', 'priority', 'owner_name', 'owner_email', 'next_followup_date', 'notes', 'requirement_summary',
    'contact_name', 'company_name', 'work_email', 'phone', 'job_title', 'lead_source', 'industry', 'city'];
  // The web app uses short names (status, nextFollowup); accept both spellings.
  const aliases = { lead_status: 'status', next_followup_date: 'nextFollowup' };
  const updates = [];
  const params = [];

  for (const field of fields) {
    const camel = field.replace(/_([a-z])/g, g => g[1].toUpperCase());
    const value = req.body[camel] !== undefined ? req.body[camel] : (aliases[field] ? req.body[aliases[field]] : undefined);
    if (value !== undefined) {
      if (field === 'lead_status' && !['New', 'Contacted', 'Qualified', 'Nurture', 'Disqualified'].includes(value)) {
        return res.status(400).json({ error: `Invalid status "${value}".` });
      }
      if (field === 'priority' && !['Low', 'Medium', 'High'].includes(value)) {
        return res.status(400).json({ error: `Invalid priority "${value}".` });
      }
      updates.push(`${field} = ?`);
      params.push(value);
    }
  }

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);
    db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const updated = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/leads/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  logAuditEvent(req.user?.email, 'DELETE_LEAD', 'LEAD', req.params.id);
  res.json({ message: 'Lead deleted.' });
});

export default router;
