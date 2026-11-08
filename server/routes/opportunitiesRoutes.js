import express from 'express';
import db from '../db/database.js';
import { generateOpportunityId, generateActivityId } from '../services/idGenerator.js';
import { queueEmailAlert, createNotification } from '../services/backgroundWorker.js';
import { logAuditEvent } from '../middleware/auditMiddleware.js';

const router = express.Router();

// GET /api/opportunities
router.get('/', (req, res) => {
  const { vertical, stage, owner } = req.query;
  let query = 'SELECT * FROM opportunities WHERE 1=1';
  const params = [];

  if (vertical && vertical !== 'All') {
    const code = (vertical === 'HYRA' || vertical === 'HYRA Connect') ? 'HYRA' : 'XUN';
    query += ' AND business_vertical_code = ?';
    params.push(code);
  }

  if (stage && stage !== 'All') {
    query += ' AND stage = ?';
    params.push(stage);
  }

  if (owner && owner !== 'All') {
    query += ' AND owner_name = ?';
    params.push(owner);
  }

  query += ' ORDER BY created_at DESC';
  const opps = db.prepare(query).all(...params);
  res.json(opps);
});

// POST /api/opportunities
router.post('/', (req, res) => {
  const { businessVerticalCode, title, service, companyName, ownerName, expectedValue, expectedCloseDate } = req.body;
  if (!title || !service || !companyName) {
    return res.status(400).json({ error: 'Title, service, and company name are required.' });
  }

  const verticalCode = (businessVerticalCode || 'XUN').toUpperCase() === 'HYRA' ? 'HYRA' : 'XUN';
  const id = generateOpportunityId(verticalCode);

  db.prepare(`
    INSERT INTO opportunities (
      id, business_vertical_code, business_vertical_name, title, service,
      company_name, owner_name, stage, expected_value, currency, expected_close_date, probability_percentage
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Discovery', ?, 'INR', ?, 20)
  `).run(
    id,
    verticalCode,
    verticalCode === 'XUN' ? 'Xunaris Services' : 'HYRA Connect',
    title.trim(),
    service.trim(),
    companyName.trim(),
    ownerName || 'Sales User',
    Number(expectedValue) || 0,
    expectedCloseDate || null
  );

  const created = db.prepare('SELECT * FROM opportunities WHERE id = ?').get(id);
  logAuditEvent(req.user?.email, 'CREATE_OPPORTUNITY', 'OPPORTUNITY', id, { title });
  res.status(201).json(created);
});

// PATCH /api/opportunities/:id/stage: Stage updates and validations
router.patch('/:id/stage', (req, res) => {
  const opp = db.prepare('SELECT * FROM opportunities WHERE id = ?').get(req.params.id);
  if (!opp) return res.status(404).json({ error: 'Opportunity not found.' });

  const { newStage, lossReason, lossNotes, handoffOwner, handoffDueDate, handoffNotes } = req.body;
  if (!newStage) return res.status(400).json({ error: 'New stage is required.' });

  // Specification rule: Proposal requires expected value, currency, close date
  if (newStage === 'Proposal' || newStage === 'Negotiation') {
    const val = Number(req.body.expectedValue !== undefined ? req.body.expectedValue : opp.expected_value);
    const date = req.body.expectedCloseDate || opp.expected_close_date;

    if (!val || val <= 0 || !date) {
      return res.status(400).json({
        error: 'Enter expected value, currency and close date before moving to Proposal.'
      });
    }
  }

  // Specification rule: Won requires handoff owner and handoff due date
  if (newStage === 'Won') {
    const owner = handoffOwner || req.body.handoffOwner;
    const due = handoffDueDate || req.body.handoffDueDate;
    if (!owner || !due) {
      return res.status(400).json({
        error: 'Choose a handoff owner and due date to mark this opportunity Won.'
      });
    }
  }

  // Specification rule: Lost requires loss reason
  if (newStage === 'Lost' && !lossReason) {
    return res.status(400).json({
      error: 'Loss reason is required when closing as Lost.'
    });
  }

  const transaction = db.transaction(() => {
    // 1. Update Opportunity
    db.prepare(`
      UPDATE opportunities 
      SET stage = ?,
          stage_entered_at = CURRENT_TIMESTAMP,
          loss_reason = ?,
          loss_notes = ?,
          handoff_owner = ?,
          handoff_due_date = ?,
          handoff_status = CASE WHEN ? = 'Won' THEN 'Pending' ELSE handoff_status END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      newStage,
      lossReason || null,
      lossNotes || null,
      handoffOwner || null,
      handoffDueDate || null,
      newStage,
      opp.id
    );

    // 2. If Won, create Handoff record and Activity
    if (newStage === 'Won') {
      const handoffId = `hnd_${Date.now()}`;
      db.prepare(`
        INSERT INTO handoffs (id, opportunity_id, handoff_owner, due_date, status, confirmed_scope, notes)
        VALUES (?, ?, ?, ?, 'Pending', ?, ?)
      `).run(
        handoffId,
        opp.id,
        handoffOwner,
        handoffDueDate,
        opp.title,
        handoffNotes || 'Won deal transitioned to operations'
      );

      const actId = generateActivityId();
      db.prepare(`
        INSERT INTO activities (
          id, related_type, related_id, related_to, activity_type, subject, date_time,
          assigned_to, status, result
        ) VALUES (?, 'Opportunity', ?, ?, 'Task', ?, ?, ?, 'Planned', 'Handoff Scheduled')
      `).run(
        actId,
        opp.id,
        opp.company_name,
        `Delivery Handoff: ${opp.title}`,
        `${handoffDueDate} 10:00`,
        handoffOwner
      );

      createNotification(
        handoffOwner,
        `Deal Won - Action Required: ${opp.id}`,
        `Please accept delivery handoff for ${opp.company_name} by ${handoffDueDate}`,
        'alert'
      );
    }
  });

  transaction();

  logAuditEvent(req.user?.email, 'STAGE_CHANGE', 'OPPORTUNITY', opp.id, { from: opp.stage, to: newStage });
  const updated = db.prepare('SELECT * FROM opportunities WHERE id = ?').get(opp.id);
  res.json({ message: `Opportunity transitioned to ${newStage}`, opportunity: updated });
});

// PATCH /api/handoffs/:id: Accept handoff
router.patch('/handoffs/:id/accept', (req, res) => {
  const { notes, acceptedBy } = req.body;
  const user = acceptedBy || (req.user?.name || 'Operations Lead');

  db.prepare(`
    UPDATE handoffs 
    SET status = 'Accepted', 
        accepted_at = CURRENT_TIMESTAMP, 
        accepted_by = ?, 
        notes = COALESCE(?, notes)
    WHERE id = ? OR opportunity_id = ?
  `).run(user, notes, req.params.id, req.params.id);

  db.prepare(`
    UPDATE opportunities 
    SET handoff_status = 'Accepted', 
        handoff_accepted_at = CURRENT_TIMESTAMP, 
        handoff_accepted_by = ?
    WHERE id = ?
  `).run(user, req.params.id);

  // Specification rule: Acceptance creates first relationship follow-up
  const opp = db.prepare('SELECT * FROM opportunities WHERE id = ?').get(req.params.id);
  if (opp) {
    const actId = generateActivityId();
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    db.prepare(`
      INSERT INTO activities (
        id, related_type, related_id, related_to, activity_type, subject, date_time,
        assigned_to, status, result
      ) VALUES (?, 'Company', ?, ?, 'Call', '30-Day Client Check-in & Relationship Review', ?, ?, 'Planned', 'Client Onboarding')
    `).run(actId, opp.company_id || opp.id, opp.company_name, `${nextMonth} 11:00`, opp.owner_name);
  }

  res.json({ message: 'Handoff accepted. First relationship follow-up task created.' });
});

export default router;
