import db from '../db/database.js';

export const logAuditEvent = (userEmail, action, entityType, entityId, details, ipAddress = null) => {
  try {
    const id = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : String(details || '');

    db.prepare(`
      INSERT INTO audit_events (id, user_email, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, userEmail || 'system', action, entityType, entityId, detailsStr, ipAddress);
  } catch (err) {
    console.error('[Audit] Failed to log audit event:', err.message);
  }
};
