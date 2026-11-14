import express from 'express';
import { planCampaign, campaignSummaries } from '../services/campaignAi.js';

const router = express.Router();

// Write the campaign and choose the audience from one line describing the goal
router.post('/plan', async (req, res) => {
  try {
    res.json(await planCampaign({ goal: req.body?.goal, business: req.body?.business }));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// What happened with the latest campaigns, and what to do next
router.get('/summary', (req, res) => res.json(campaignSummaries(Math.min(10, Number(req.query.limit) || 3))));

export default router;
