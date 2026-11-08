import express from 'express';
import db from '../db/database.js';
import { generateActivityId } from '../services/idGenerator.js';
import { logAuditEvent } from '../middleware/auditMiddleware.js';

const router = express.Router();

router.get('/', (req, res) => {
  const { status, assignedTo, relatedId } = req.query;
  let query = 'SELECT * FROM activities WHERE 1=1';
  const params = [];

  if (status && status !== 'All') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (assignedTo && assignedTo !== 'All') {
    query += ' AND assigned_to = ?';
    params.push(assignedTo);
  }

  if (relatedId) {
    query += ' AND related_id = ?';
    params.push(relatedId);
  }

  query += ' ORDER BY date_time DESC';
  const activities = db.prepare(query).all(...params);
  res.json(activities);
});

router.post('/', (req, res) => {
  const { relatedTo, relatedId, relatedType, activityType, subject, dateTime, assignedTo, status, outcome, nextFollowup, reminder, result } = req.body;
  if (!subject || !activityType || !relatedTo) {
    return res.status(400).json({ error: 'Subject, activity type, and related to fields are required.' });
  }

  const id = generateActivityId();
  db.prepare(`
    INSERT INTO activities (
      id, related_type, related_id, related_to, activity_type, subject, date_time,
      assigned_to, status, outcome, next_followup, reminder, result
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    relatedType || 'Lead',
    relatedId || null,
    relatedTo.trim(),
    activityType,
    subject.trim(),
    dateTime || new Date().toISOString().replace('T', ' ').substring(0, 16),
    assignedTo || 'Sales User',
    status || 'Planned',
    outcome || null,
    nextFollowup || null,
    reminder || '1 day before',
    result || null
  );

  const created = db.prepare('SELECT * FROM activities WHERE id = ?').get(id);
  logAuditEvent(req.user?.email, 'CREATE_ACTIVITY', 'ACTIVITY', id, { subject });
  res.status(201).json(created);
});

router.patch('/:id', (req, res) => {
  const { status, outcome, result, nextFollowup } = req.body;
  const updates = [];
  const params = [];

  if (status) {
    updates.push('status = ?');
    params.push(status);
    if (status === 'Completed') {
      updates.push('completed_at = CURRENT_TIMESTAMP');
    }
  }

  if (outcome !== undefined) {
    updates.push('outcome = ?');
    params.push(outcome);
  }

  if (result !== undefined) {
    updates.push('result = ?');
    params.push(result);
  }

  if (nextFollowup !== undefined) {
    updates.push('next_followup = ?');
    params.push(nextFollowup);
  }

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);
    db.prepare(`UPDATE activities SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const updated = db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM activities WHERE id = ?').run(req.params.id);
  res.json({ message: 'Activity deleted.' });
});

export default router;
