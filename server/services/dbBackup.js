import fs from 'fs';
import os from 'os';
import path from 'path';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * Free persistence for hosts whose disk is wiped on restart (e.g. Render free plan).
 * The SQLite file is copied to any S3-compatible bucket (Cloudflare R2, Backblaze B2, AWS S3, ...)
 * every few minutes and on shutdown, and restored on startup when the local file is missing.
 * Does nothing unless BACKUP_S3_* variables are set.
 */

const cfg = () => ({
  endpoint: process.env.BACKUP_S3_ENDPOINT,
  bucket: process.env.BACKUP_S3_BUCKET,
  accessKeyId: process.env.BACKUP_S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.BACKUP_S3_SECRET_ACCESS_KEY,
  region: process.env.BACKUP_S3_REGION || 'auto',
  key: process.env.BACKUP_S3_KEY || 'xunaris_crm.sqlite'
});

export const backupEnabled = () => {
  const c = cfg();
  return Boolean(c.endpoint && c.bucket && c.accessKeyId && c.secretAccessKey);
};

let injectedClient = null;
export const __setClientForTests = (client) => { injectedClient = client; };

const client = () => {
  if (injectedClient) return injectedClient;
  const c = cfg();
  return new S3Client({
    endpoint: c.endpoint,
    region: c.region,
    forcePathStyle: true,
    credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey }
  });
};

/** Call BEFORE opening the database. Restores the latest backup only if no local file exists. */
export const restoreIfMissing = async (dbPath) => {
  if (!backupEnabled()) return 'disabled';
  if (fs.existsSync(dbPath) && fs.statSync(dbPath).size > 0) return 'local-present';
  try {
    const res = await client().send(new GetObjectCommand({ Bucket: cfg().bucket, Key: cfg().key }));
    const bytes = Buffer.from(await res.Body.transformToByteArray());
    if (bytes.length < 100) return 'empty-backup';
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, bytes);
    console.log(`[Backup] Restored database from backup (${bytes.length} bytes).`);
    return 'restored';
  } catch (e) {
    if (e?.name === 'NoSuchKey' || e?.$metadata?.httpStatusCode === 404) {
      console.log('[Backup] No backup found yet; starting with a fresh database.');
      return 'no-backup';
    }
    // Refuse to continue silently: starting empty here could later overwrite a good backup.
    console.error('[Backup] Could not read the backup bucket:', e.message);
    throw new Error(`Backup restore failed: ${e.message}`);
  }
};

let uploading = false;

/** Takes a consistent snapshot with SQLite's online backup API and uploads it. */
export const uploadBackup = async (db) => {
  if (!backupEnabled() || uploading) return false;
  uploading = true;
  const tmp = path.join(os.tmpdir(), `xunaris_backup_${Date.now()}.sqlite`);
  try {
    await db.backup(tmp);
    const body = fs.readFileSync(tmp);
    await client().send(new PutObjectCommand({ Bucket: cfg().bucket, Key: cfg().key, Body: body, ContentType: 'application/x-sqlite3' }));
    return true;
  } catch (e) {
    console.error('[Backup] Upload failed:', e.message);
    return false;
  } finally {
    uploading = false;
    fs.rm(tmp, { force: true }, () => {});
  }
};

export const startBackupSchedule = (db, everyMs = (Number(process.env.BACKUP_INTERVAL_SECONDS) || 300) * 1000) => {
  if (!backupEnabled()) {
    if (process.env.RENDER) {
      console.warn('[Backup] BACKUP_S3_* is not set. On Render free the disk is wiped on restart: ALL data and passwords will be lost.');
    }
    return;
  }
  console.log('[Backup] Database backup to cloud storage is ON (every ' + Math.round(everyMs / 1000) + ' seconds and on shutdown).');
  setTimeout(() => uploadBackup(db), Math.min(30 * 1000, everyMs));
  setInterval(() => uploadBackup(db), everyMs);

  let stopping = false;
  const finalBackup = async (signal) => {
    if (stopping) return;
    stopping = true;
    console.log(`[Backup] ${signal} received, saving a final backup...`);
    await uploadBackup(db);
    process.exit(0);
  };
  process.on('SIGTERM', () => finalBackup('SIGTERM'));
  process.on('SIGINT', () => finalBackup('SIGINT'));
};
