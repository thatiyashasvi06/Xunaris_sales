import express from 'express';
import db from '../db/database.js';
import { aiEngineStatus, getBrief, refreshLead, findDuplicates } from '../services/leadAi.js';

const router = express.Router();

// Is AI on, and which model is answering
router.get('/status', (req, res) => res.json(aiEngineStatus()));

// Possible duplicates for a lead being entered
router.get('/duplicates', (req, res) => {
  const { email, phone, company, excludeId } = req.query;
  res.json(findDuplicates({ email, phone, company, excludeId }));
});

// The brief for one lead (written now if it does not exist yet)
router.get('/leads/:id', async (req, res) => {
  if (!db.prepare('SELECT 1 FROM leads WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Lead not found.' });
  let brief = getBrief(req.params.id);
  if (!brief.updatedAt) {
    try { brief = await refreshLead(req.params.id); } catch (e) { return res.status(500).json({ error: e.message }); }
  }
  res.json({ ...brief, ai: aiEngineStatus() });
});

// Write it again now
router.post('/leads/:id/refresh', async (req, res) => {
  try {
    db.prepare(`UPDATE leads SET ai_company_summary = NULL WHERE id = ?`).run(req.params.id); // look at the website again too
    res.json({ ...(await refreshLead(req.params.id)), ai: aiEngineStatus() });
  } catch (e) {
    res.status(e.message === 'Lead not found' ? 404 : 500).json({ error: e.message });
  }
});

export default router;
