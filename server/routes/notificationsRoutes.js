import express from 'express';
import db from '../db/database.js';

const router = express.Router();

router.get('/', (req, res) => {
  const email = req.user?.email || 'admin@xunaris.com';
  const notifs = db.prepare(`
    SELECT * FROM notifications 
    WHERE user_email = ? OR user_email = 'admin@xunaris.com'
    ORDER BY created_at DESC LIMIT 30
  `).all(email);
  res.json(notifs);
});

router.patch('/:id/read', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Notification marked as read.' });
});

export default router;
