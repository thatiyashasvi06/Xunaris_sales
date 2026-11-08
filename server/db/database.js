import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'xunaris_crm.sqlite');
const db = new Database(DB_PATH);

// Configure Pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize Schema
const schemaPath = path.join(__dirname, 'schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');
db.exec(schemaSql);

// Ensure default company sender accounts exist (Xunaris & HYRA Connect)
try {
  const insertSenderAccount = db.prepare(`
    INSERT INTO sender_accounts (
      id, business_vertical, email, display_name, provider, smtp_host, smtp_port, smtp_secure, is_verified, verification_status
    ) VALUES (?, ?, ?, ?, 'SMTP', ?, ?, ?, 0, 'Not Configured')
    ON CONFLICT(id) DO UPDATE SET
      business_vertical = excluded.business_vertical,
      email = excluded.email,
      display_name = excluded.display_name
  `);

  insertSenderAccount.run('acc_xunaris', 'Xunaris', 'sales@xunaris.com', 'Xunaris Sales', 'smtpout.secureserver.net', 465, 1);
  insertSenderAccount.run('acc_hyra', 'HYRA Connect', 'sales@hyraconnect.com', 'HYRA Connect Sales', 'smtpout.secureserver.net', 465, 1);

  // If previous default was smtp.gmail.com, migrate to GoDaddy smtpout.secureserver.net
  db.prepare(`
    UPDATE sender_accounts
    SET smtp_host = 'smtpout.secureserver.net'
    WHERE smtp_host = 'smtp.gmail.com' AND (smtp_user LIKE '%@xunaris.com' OR smtp_user LIKE '%@hyraconnect.com' OR smtp_user IS NULL)
  `).run();

  // Sync credentials from environment variables if provided
  if (process.env.XUNARIS_SMTP_USER && process.env.XUNARIS_SMTP_PASS) {
    db.prepare(`
      UPDATE sender_accounts
      SET smtp_host = COALESCE(?, smtp_host),
          smtp_port = COALESCE(?, smtp_port),
          smtp_secure = ?,
          smtp_user = ?,
          smtp_pass = ?,
          is_verified = 1,
          verification_status = 'Authorized',
          verification_error = NULL
      WHERE id = 'acc_xunaris'
    `).run(
      process.env.XUNARIS_SMTP_HOST || 'smtpout.secureserver.net',
      Number(process.env.XUNARIS_SMTP_PORT) || 465,
      process.env.XUNARIS_SMTP_SECURE === 'false' ? 0 : 1,
      process.env.XUNARIS_SMTP_USER.trim(),
      process.env.XUNARIS_SMTP_PASS.trim()
    );
  }

  if (process.env.HYRA_SMTP_USER && process.env.HYRA_SMTP_PASS) {
    db.prepare(`
      UPDATE sender_accounts
      SET smtp_host = COALESCE(?, smtp_host),
          smtp_port = COALESCE(?, smtp_port),
          smtp_secure = ?,
          smtp_user = ?,
          smtp_pass = ?,
          is_verified = 1,
          verification_status = 'Authorized',
          verification_error = NULL
      WHERE id = 'acc_hyra'
    `).run(
      process.env.HYRA_SMTP_HOST || 'smtpout.secureserver.net',
      Number(process.env.HYRA_SMTP_PORT) || 465,
      process.env.HYRA_SMTP_SECURE === 'false' ? 0 : 1,
      process.env.HYRA_SMTP_USER.trim(),
      process.env.HYRA_SMTP_PASS.trim()
    );
  }
} catch (e) {
  console.warn('[DB] Warning initializing sender_accounts:', e.message);
}

console.log(`[DB] Connected to SQLite database at: ${DB_PATH}`);

export default db;
