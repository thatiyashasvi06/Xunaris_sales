import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { restoreIfMissing } from '../services/dbBackup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// On hosts with a wiped filesystem (e.g. Render free), set DATA_DIR to a persistent disk mount, e.g. /var/data
const DB_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, '../../data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'xunaris_crm.sqlite');
// If this host starts with an empty disk, bring back the latest cloud backup first (no-op when backup is not configured)
await restoreIfMissing(DB_PATH);

const db = new Database(DB_PATH);

// Configure Pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize Schema
const schemaPath = path.join(__dirname, 'schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');
db.exec(schemaSql);

// Team roles and availability (added after the first release, so existing databases get the columns here)
const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
for (const [col, ddl] of [
  ['team_role', 'TEXT'],
  ['availability', "TEXT NOT NULL DEFAULT 'Available'"],
  ['away_until', 'TEXT'],
  ['availability_note', 'TEXT']
]) {
  if (!userCols.includes(col)) db.exec(`ALTER TABLE users ADD COLUMN ${col} ${ddl}`);
}

// Leads AI: the brief, next action and draft message are stored on the lead
const leadCols = db.prepare('PRAGMA table_info(leads)').all().map((c) => c.name);
for (const col of ['ai_summary', 'ai_next_action', 'ai_message', 'ai_company_summary', 'ai_engine', 'ai_updated_at']) {
  if (!leadCols.includes(col)) db.exec(`ALTER TABLE leads ADD COLUMN ${col} TEXT`);
}

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
  insertSenderAccount.run('acc_xunaris_info', 'Xunaris', 'info@xunaris.com', 'Xunaris Info', 'smtpout.secureserver.net', 465, 1);
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
      WHERE id IN ('acc_xunaris', 'acc_xunaris_info')
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
