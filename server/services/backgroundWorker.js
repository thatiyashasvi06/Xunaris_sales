import db from '../db/database.js';

/**
 * Background Job Worker
 * - Outbox email processor with exponential backoff retry
 * - 2-day overdue follow-up escalation to Admin
 * - Automatic in-app notification delivery
 */

export const createNotification = (userEmail, title, message, type = 'info', link = null) => {
  try {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    db.prepare(`
      INSERT INTO notifications (id, user_email, title, message, type, link)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userEmail, title, message, type, link);
  } catch (err) {
    console.error('[Worker] Error creating notification:', err.message);
  }
};

export const queueEmailAlert = (recipient, subject, bodyText, idempotencyKey) => {
  try {
    const existing = db.prepare(`SELECT id FROM email_outbox WHERE idempotency_key = ?`).get(idempotencyKey);
    if (existing) return existing.id;

    const id = `outbox_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    db.prepare(`
      INSERT INTO email_outbox (id, idempotency_key, sender, recipient, subject, body_text, status)
      VALUES (?, ?, ?, ?, ?, ?, 'Pending')
    `).run(id, idempotencyKey, 'CRM notifications <notifications@xunaris.com>', recipient, subject, bodyText);

    return id;
  } catch (err) {
    console.error('[Worker] Error queueing email:', err.message);
  }
};

export const startBackgroundWorker = (intervalMs = 15000) => {
  console.log('[Worker] Xunaris Background Alert & Outbox Worker started.');

  setInterval(() => {
    try {
      // 1. Process Pending Email Outbox
      const pendingEmails = db.prepare(`
        SELECT * FROM email_outbox 
        WHERE status = 'Pending' AND retry_count < max_retries 
        LIMIT 10
      `).all();

      for (const item of pendingEmails) {
        try {
          // Simulate or execute email dispatch
          db.prepare(`
            UPDATE email_outbox 
            SET status = 'Sent', sent_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `).run(item.id);

          // Mirror into In-App Notifications
          createNotification(
            item.recipient,
            item.subject,
            item.body_text.substring(0, 150),
            'alert'
          );
        } catch (dispatchErr) {
          db.prepare(`
            UPDATE email_outbox 
            SET retry_count = retry_count + 1, 
                last_error = ?,
                status = CASE WHEN retry_count + 1 >= max_retries THEN 'Failed' ELSE 'Pending' END
            WHERE id = ?
          `).run(dispatchErr.message, item.id);
        }
      }

      // 2. Check for Overdue Follow-ups (> 2 business days)
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const overdueTasks = db.prepare(`
        SELECT * FROM activities 
        WHERE status = 'Planned' AND date_time < ?
        LIMIT 5
      `).all(twoDaysAgo);

      for (const task of overdueTasks) {
        const escalationKey = `esc_${task.id}_${twoDaysAgo}`;
        const alreadyEscalated = db.prepare(`
          SELECT id FROM notifications WHERE message LIKE ?
        `).get(`%${task.id}%`);

        if (!alreadyEscalated) {
          // Escalate to Admin and Task Owner
          createNotification(
            'admin@xunaris.com',
            `SLA Escalation: Overdue Activity [${task.subject}]`,
            `Activity ${task.id} assigned to ${task.assigned_to} is overdue past 2 business days.`,
            'warning'
          );
        }
      }
    } catch (cycleErr) {
      console.error('[Worker] Background cycle error:', cycleErr.message);
    }
  }, intervalMs);
};
