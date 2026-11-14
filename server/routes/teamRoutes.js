import express from 'express';
import db from '../db/database.js';
import { logAuditEvent } from '../middleware/auditMiddleware.js';
import {
  listTeam, setAvailability, getRoutingSettings, updateRoutingSettings, buildToday, teamRoleOf
} from '../services/routing.js';

const router = express.Router();
const canManage = (user) => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  return row && ['Sales Head', 'Admin'].includes(teamRoleOf(row));
};

// Everything for the "Today" screen, shaped for the signed-in person
router.get('/today', (req, res) => res.json(buildToday(req.user)));

// The team with availability and workload
router.get('/', (req, res) => res.json(listTeam()));

// Set my own availability
router.put('/me/availability', (req, res) => {
  try {
    setAvailability(req.user.id, req.body || {});
    logAuditEvent(req.user.email, 'SET_AVAILABILITY', 'USER', req.user.id, { status: req.body?.status });
    res.json(listTeam().find((p) => p.id === req.user.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Routing rules: anyone can read, Sales Head and Admin can change
router.get('/routing', (req, res) => res.json(getRoutingSettings()));
router.put('/routing', (req, res) => {
  if (!canManage(req.user)) return res.status(403).json({ error: 'Only the Sales Head or an admin can change the routing rules.' });
  const next = updateRoutingSettings(req.body || {});
  logAuditEvent(req.user.email, 'UPDATE_ROUTING_RULES', 'SYSTEM', null, next);
  res.json(next);
});

export default router;
