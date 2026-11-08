import express from 'express';
import db from '../db/database.js';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/services', (req, res) => {
  const { vertical } = req.query;
  const verticalCode = (vertical || '').toUpperCase();

  let query = 'SELECT * FROM service_catalog WHERE is_active = 1';
  const params = [];

  if (verticalCode === 'XUN' || verticalCode === 'HYRA') {
    query += ' AND vertical_code = ?';
    params.push(verticalCode);
  }

  query += ' ORDER BY display_label ASC';
  const services = db.prepare(query).all(...params);
  res.json(services);
});

router.post('/services', authMiddleware, requireRole('ADMIN'), (req, res) => {
  const { verticalCode, serviceCode, displayLabel } = req.body;
  if (!verticalCode || !serviceCode || !displayLabel) {
    return res.status(400).json({ error: 'verticalCode, serviceCode and displayLabel required.' });
  }

  const id = `srv_${verticalCode.toLowerCase()}_${serviceCode.toLowerCase()}`;
  db.prepare(`
    INSERT OR REPLACE INTO service_catalog (id, vertical_code, service_code, display_label, is_active)
    VALUES (?, ?, ?, ?, 1)
  `).run(id, verticalCode.toUpperCase(), serviceCode.toUpperCase(), displayLabel.trim());

  res.json({ message: 'Service catalog updated.', id });
});

export default router;
