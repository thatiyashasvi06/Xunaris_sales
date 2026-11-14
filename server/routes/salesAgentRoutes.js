import express from 'express';
import db from '../db/database.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  getSettings, updateSettings, listProspects, runCycle, scoreAllLeads, draftSequenceForLead,
  markReplied, listMeetings, weeklyStats, getInsights, getOverview, availableSlots,
  getBookingContext, bookSlot
} from '../services/salesAgent.js';

const router = express.Router();
export const publicBookingRouter = express.Router();

// ---- Public booking link (no login): /api/public/book/:token
publicBookingRouter.get('/book/:token', (req, res) => {
  const m = getBookingContext(req.params.token);
  if (!m) return res.status(404).json({ error: 'This booking link is not valid.' });
  if (m.status === 'Booked') return res.json({ status: 'Booked', contact_name: m.contact_name, company_name: m.company_name, slot_start: m.slot_start });
  res.json({ status: 'Open', contact_name: m.contact_name, company_name: m.company_name, slots: availableSlots() });
});

publicBookingRouter.post('/book/:token', (req, res) => {
  try {
    if (!req.body?.slot) return res.status(400).json({ error: 'Please choose a time slot.' });
    res.json(bookSlot(req.params.token, req.body.slot));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---- Internal (sales team)
router.use(authMiddleware);

router.get('/overview', (req, res) => {
  res.json({ settings: getSettings(), overview: getOverview(), weekly: weeklyStats(5), insights: getInsights(), meetings: listMeetings() });
});

router.put('/settings', (req, res) => res.json(updateSettings(req.body || {})));

router.get('/prospects', (req, res) => {
  res.json(listProspects({ limit: Math.min(200, Number(req.query.limit) || 50), includeBelowMin: req.query.all === '1' }));
});

router.post('/run', async (req, res) => {
  try { res.json(await runCycle({ force: true })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/outreach', (req, res) => {
  const { status } = req.query;
  const rows = db.prepare(`
    SELECT o.*, l.contact_name, l.company_name, l.work_email, l.job_title
    FROM agent_outreach o JOIN leads l ON l.id = o.lead_id
    ${status ? 'WHERE o.status = ?' : ''} ORDER BY o.created_at DESC, o.step_no ASC LIMIT 300
  `).all(...(status ? [status] : []));
  res.json(rows);
});

// Draft a sequence on demand for one lead
router.post('/leads/:leadId/draft', async (req, res) => {
  try {
    scoreAllLeads();
    const n = await draftSequenceForLead(req.params.leadId);
    res.json({ drafted: n });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/leads/:leadId/replied', (req, res) => { markReplied(req.params.leadId); res.json({ ok: true }); });

// Edit a draft before approving
router.put('/outreach/:id', (req, res) => {
  const { subject, body } = req.body || {};
  const r = db.prepare(`
    UPDATE agent_outreach SET subject = COALESCE(?, subject), body = COALESCE(?, body), updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status IN ('Pending Approval','Approved','Failed')
  `).run(subject ?? null, body ?? null, req.params.id);
  res.json({ updated: r.changes });
});

router.post('/outreach/:id/approve', (req, res) => {
  const r = db.prepare(`UPDATE agent_outreach SET status = 'Approved', error = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status IN ('Pending Approval','Failed')`).run(req.params.id);
  res.json({ updated: r.changes });
});

router.post('/outreach/:id/skip', (req, res) => {
  const r = db.prepare(`UPDATE agent_outreach SET status = 'Skipped', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status IN ('Pending Approval','Approved','Failed')`).run(req.params.id);
  res.json({ updated: r.changes });
});

// Approve every pending step for a lead (whole sequence)
router.post('/leads/:leadId/approve-all', (req, res) => {
  const r = db.prepare(`UPDATE agent_outreach SET status = 'Approved', updated_at = CURRENT_TIMESTAMP WHERE lead_id = ? AND status = 'Pending Approval'`).run(req.params.leadId);
  res.json({ updated: r.changes });
});

export default router;
