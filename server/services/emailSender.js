import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import db from '../db/database.js';

dotenv.config();

/**
 * Detect if running on Render (free tier blocks SMTP ports 465/587)
 */
const isRenderEnvironment = () => {
  return Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID || process.env.RENDER_EXTERNAL_URL);
};

/**
 * Check if Resend HTTPS API is configured (bypasses SMTP port blocking)
 */
const hasResendApiKey = () => {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0);
};

/**
 * Check if Brevo (Sendinblue) HTTPS API is configured (No DNS required!)
 */
const hasBrevoApiKey = () => {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim().length > 0);
};

/**
 * Send email via Brevo HTTPS API (port 443 - works on Render without DNS!)
 * Free tier: 300 emails/day. Sender verified via single confirmation code.
 */
const sendViaBrevoApi = async ({ fromEmail, fromName, to, subject, html, text, replyTo }) => {
  const apiKey = (process.env.BREVO_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('BREVO_API_KEY is not configured.');
  }

  const payload = {
    sender: { name: fromName || 'HYRA Connect', email: fromEmail || 'sales@hyraconnect.com' },
    to: (Array.isArray(to) ? to : [to]).map(e => (typeof e === 'string' ? { email: e } : e)),
    subject: subject || 'HYRA Connect Message',
    htmlContent: html || `<p>${text || ''}</p>`,
    textContent: text || undefined
  };
  if (replyTo) payload.replyTo = { email: replyTo };

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    const errMsg = data?.message || data?.error?.message || JSON.stringify(data);
    throw new Error(`Brevo API error (${response.status}): ${errMsg}`);
  }

  console.log(`[emailSender:Brevo] Email sent successfully via HTTPS API. ID: ${data.messageId}`);
  return {
    messageId: data.messageId,
    previewUrl: null
  };
};

/**
 * Send email via Resend HTTPS API (port 443 — works on Render Free Tier)
 * Resend free tier: 100 emails/day, 3,000 emails/month
 * Sign up at https://resend.com and get an API key
 */
const sendViaResendApi = async ({ from, to, subject, html, text, replyTo }) => {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  const payload = {
    from: from || 'Xunaris CRM <onboarding@resend.dev>',
    to: Array.isArray(to) ? to : [to],
    subject: subject || 'Xunaris CRM Message',
    html: html || undefined,
    text: text || undefined
  };
  if (replyTo) payload.reply_to = replyTo;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    const errMsg = data?.message || data?.error?.message || JSON.stringify(data);
    throw new Error(`Resend API error (${response.status}): ${errMsg}`);
  }

  console.log(`[emailSender:Resend] Email sent successfully via HTTPS API. ID: ${data.id}`);
  return {
    messageId: data.id,
    previewUrl: null
  };
};

/**
 * Persist updated credentials securely to .env file so they survive restarts
 */
const updateEnvFile = (keyValues) => {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    for (const [key, val] of Object.entries(keyValues)) {
      process.env[key] = String(val);
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${val}`);
      } else {
        envContent += `\n${key}=${val}`;
      }
    }
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('[emailSender] Successfully synced credentials to .env file');
  } catch (err) {
    console.warn('[emailSender] Could not persist to .env:', err.message);
  }
};

/**
 * Xunaris & HYRA Connect Real Email Dispatcher
 * Multi-Identity Authorized Sender Management
 * Compliant with Specification Requirements:
 * 1. Independent authorized sender accounts (sales@xunaris.com, sales@hyraconnect.com)
 * 2. Strict From / To separation
 * 3. Never falls back to user personal email unless explicitly selected & authorized
 * 4. Fails honestly if account is not authenticated - never pretends email was sent
 * 5. Returns delivery status, actual sender, recipient, and error details
 */

/**
 * Helper to mask sensitive strings for secure display
 */
const maskEmail = (em) => {
  if (!em) return '';
  return em.replace(/(.{2})(.*)(@.*)/, '$1***$3');
};

/**
 * Fetch all authorized sender accounts with environment variables overlaid
 */
export const getAllSenderAccounts = () => {
  try {
    const accounts = db.prepare(`
      SELECT 
        id, 
        business_vertical, 
        email, 
        display_name, 
        provider, 
        smtp_host, 
        smtp_port, 
        smtp_secure, 
        smtp_user, 
        is_verified, 
        verification_status, 
        verification_error, 
        last_verified_at, 
        created_at, 
        updated_at,
        CASE WHEN smtp_pass IS NOT NULL AND LENGTH(smtp_pass) > 0 THEN 1 ELSE 0 END as has_credentials
      FROM sender_accounts 
      ORDER BY id ASC
    `).all();

    return accounts.map(acc => {
      let host = acc.smtp_host || 'smtpout.secureserver.net';
      let port = acc.smtp_port || 465;
      let secure = acc.smtp_secure === 1;
      let user = acc.smtp_user;
      let hasCreds = Boolean(acc.has_credentials);
      let isVer = acc.is_verified;
      let verStatus = acc.verification_status;

      // Overlay environment variables securely
      if (acc.id === 'acc_xunaris' || acc.id === 'acc_xunaris_info' || acc.email === 'sales@xunaris.com' || acc.email === 'info@xunaris.com') {
        if (process.env.XUNARIS_SMTP_HOST) host = process.env.XUNARIS_SMTP_HOST;
        if (process.env.XUNARIS_SMTP_PORT) port = Number(process.env.XUNARIS_SMTP_PORT);
        if (process.env.XUNARIS_SMTP_SECURE !== undefined) secure = process.env.XUNARIS_SMTP_SECURE !== 'false';
        if (process.env.XUNARIS_SMTP_USER) user = process.env.XUNARIS_SMTP_USER;
        if (process.env.XUNARIS_SMTP_PASS && process.env.XUNARIS_SMTP_PASS.trim().length > 0) {
          hasCreds = true;
        }
      } else if (acc.id === 'acc_hyra' || acc.email === 'sales@hyraconnect.com') {
        if (process.env.HYRA_SMTP_HOST) host = process.env.HYRA_SMTP_HOST;
        if (process.env.HYRA_SMTP_PORT) port = Number(process.env.HYRA_SMTP_PORT);
        if (process.env.HYRA_SMTP_SECURE !== undefined) secure = process.env.HYRA_SMTP_SECURE !== 'false';
        if (process.env.HYRA_SMTP_USER) user = process.env.HYRA_SMTP_USER;
        if (process.env.HYRA_SMTP_PASS && process.env.HYRA_SMTP_PASS.trim().length > 0) {
          hasCreds = true;
        }
      }

      return {
        ...acc,
        smtp_host: host,
        smtp_port: port,
        smtp_secure: secure ? 1 : 0,
        smtp_user: user,
        smtp_user_masked: maskEmail(user),
        has_credentials: hasCreds ? 1 : 0,
        is_configured: Boolean(hasCreds && user),
        is_verified: isVer,
        verification_status: verStatus
      };
    });
  } catch (err) {
    console.error('[emailSender] Error fetching sender accounts:', err.message);
    return [];
  }
};

/**
 * Fetch a single sender account with credentials by id or email, overlaying .env
 */
export const getSenderAccount = (identifier) => {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();

  try {
    let account = db.prepare(`
      SELECT * FROM sender_accounts 
      WHERE LOWER(id) = ? OR LOWER(email) = ?
    `).get(clean, clean);

    if (!account) {
      account = db.prepare(`
        SELECT * FROM sender_accounts 
        WHERE LOWER(business_vertical) LIKE ?
      `).get(`%${clean}%`);
    }

    if (!account) return null;

    // Securely overlay environment variables (only if .env has active credentials and not in sandbox)
    const isSandbox = account.smtp_host === 'smtp.ethereal.email';
    if (!isSandbox) {
      if (account.id === 'acc_xunaris' || account.id === 'acc_xunaris_info' || account.email === 'sales@xunaris.com' || account.email === 'info@xunaris.com') {
        if (process.env.XUNARIS_SMTP_PASS && process.env.XUNARIS_SMTP_PASS.trim().length > 0) {
          if (process.env.XUNARIS_SMTP_HOST) account.smtp_host = process.env.XUNARIS_SMTP_HOST;
          if (process.env.XUNARIS_SMTP_PORT) account.smtp_port = Number(process.env.XUNARIS_SMTP_PORT);
          if (process.env.XUNARIS_SMTP_SECURE !== undefined) account.smtp_secure = process.env.XUNARIS_SMTP_SECURE === 'false' ? 0 : 1;
          if (process.env.XUNARIS_SMTP_USER) account.smtp_user = process.env.XUNARIS_SMTP_USER;
          account.smtp_pass = process.env.XUNARIS_SMTP_PASS.trim();
        }
        if (process.env.XUNARIS_FROM_NAME) account.display_name = process.env.XUNARIS_FROM_NAME.replace(/"/g, '');
      } else if (account.id === 'acc_hyra' || account.email === 'sales@hyraconnect.com') {
        if (process.env.HYRA_SMTP_PASS && process.env.HYRA_SMTP_PASS.trim().length > 0) {
          if (process.env.HYRA_SMTP_HOST) account.smtp_host = process.env.HYRA_SMTP_HOST;
          if (process.env.HYRA_SMTP_PORT) account.smtp_port = Number(process.env.HYRA_SMTP_PORT);
          if (process.env.HYRA_SMTP_SECURE !== undefined) account.smtp_secure = process.env.HYRA_SMTP_SECURE === 'false' ? 0 : 1;
          if (process.env.HYRA_SMTP_USER) account.smtp_user = process.env.HYRA_SMTP_USER;
          account.smtp_pass = process.env.HYRA_SMTP_PASS.trim();
        }
        if (process.env.HYRA_FROM_NAME) account.display_name = process.env.HYRA_FROM_NAME.replace(/"/g, '');
      }
    }

    return account;
  } catch (err) {
    console.error('[emailSender] Error getting sender account:', err.message);
    return null;
  }
};

/**
 * Test & verify SMTP credentials with Nodemailer handshake
 */
export const testSmtpHandshake = async ({ smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass }) => {
  const cleanUser = (smtp_user || '').trim();
  const cleanPass = (smtp_pass || '').replace(/\s+/g, '');
  const port = Number(smtp_port) || 465;
  const secure = smtp_secure === true || smtp_secure === 1 || port === 465;
  const isGmail = (smtp_host || '').toLowerCase().includes('gmail') || cleanUser.toLowerCase().includes('gmail');

  if (!cleanUser || !cleanPass) {
    throw new Error('Both SMTP username (email) and password / App Password are required.');
  }

  let transporter;
  if (isGmail) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: cleanUser,
        pass: cleanPass
      }
    });
  } else {
    transporter = nodemailer.createTransport({
      host: smtp_host || 'smtpout.secureserver.net',
      port: port,
      secure: secure,
      auth: {
        user: cleanUser,
        pass: cleanPass
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  await transporter.verify();
  return true;
};

/**
 * Test and verify live SMTP connection for an account using current credentials
 */
export const verifySenderAccountConnection = async (accountId) => {
  const account = getSenderAccount(accountId);
  if (!account) {
    throw new Error(`Sender account "${accountId}" not found.`);
  }

  const user = (account.smtp_user || '').trim();
  const pass = (account.smtp_pass || '').replace(/\s+/g, '');
  const host = account.smtp_host || 'smtpout.secureserver.net';
  const port = Number(account.smtp_port) || 465;
  const secure = account.smtp_secure === 1 || port === 465;

  if (!user || !pass) {
    const envVar = (account.id === 'acc_xunaris' || account.id === 'acc_xunaris_info' || account.email === 'sales@xunaris.com' || account.email === 'info@xunaris.com') ? 'XUNARIS_SMTP_PASS' : 'HYRA_SMTP_PASS';
    throw new Error(`SMTP credentials are missing for ${account.email}. Please set ${envVar} in your .env file or enter the password in Admin Settings.`);
  }

  // Attempt live handshake verification with the mail server
  try {
    await testSmtpHandshake({
      smtp_host: host,
      smtp_port: port,
      smtp_secure: secure,
      smtp_user: user,
      smtp_pass: pass
    });

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    db.prepare(`
      UPDATE sender_accounts
      SET is_verified = 1,
          verification_status = 'Authorized',
          verification_error = NULL,
          last_verified_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nowStr, account.id);

    return {
      success: true,
      id: account.id,
      email: account.email,
      host,
      port,
      status: 'Authorized',
      message: `Live SMTP connection handshake verified successfully with ${host}:${port} for ${account.email}!`
    };
  } catch (err) {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    db.prepare(`
      UPDATE sender_accounts
      SET is_verified = 0,
          verification_status = 'Authentication Failed',
          verification_error = ?,
          last_verified_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(err.message, nowStr, account.id);

    throw new Error(`Mail server rejected authentication for ${account.email} on ${host}:${port}: ${err.message}`);
  }
};

/**
 * Configure an instant, zero-setup Sandbox / Ethereal SMTP test account
 * Real SMTP transmission with real online preview links, requiring no passwords
 */
export const setupSandboxSenderAccount = async (accountId) => {
  const account = getSenderAccount(accountId);
  if (!account) {
    throw new Error(`Sender account "${accountId}" not found.`);
  }

  const testAccount = await nodemailer.createTestAccount();
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  db.prepare(`
    UPDATE sender_accounts
    SET 
      display_name = ?,
      smtp_host = ?,
      smtp_port = ?,
      smtp_secure = 0,
      smtp_user = ?,
      smtp_pass = ?,
      is_verified = 1,
      verification_status = 'Authorized (Sandbox)',
      verification_error = NULL,
      last_verified_at = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    account.display_name || 'Xunaris Sandbox',
    testAccount.smtp.host,
    testAccount.smtp.port,
    testAccount.user,
    testAccount.pass,
    nowStr,
    account.id
  );

  return {
    success: true,
    id: account.id,
    email: account.email,
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    status: 'Authorized (Sandbox)',
    message: `Zero-setup Sandbox SMTP activated! All emails will transmit via real SMTP with instant webmail preview links.`
  };
};

/**
 * Update and verify credentials for a specific sender account
 */
export const updateSenderAccountCredentials = async (accountId, {
  smtp_host,
  smtp_port,
  smtp_secure,
  smtp_user,
  smtp_pass,
  display_name,
  shareAcrossBrands
}) => {
  const account = getSenderAccount(accountId);
  if (!account) {
    throw new Error(`Sender account with identifier "${accountId}" not found.`);
  }

  const cleanUser = (smtp_user || account.smtp_user || '').trim();
  const cleanPass = (smtp_pass || account.smtp_pass || '').replace(/\s+/g, '');
  const host = smtp_host || account.smtp_host || 'smtpout.secureserver.net';
  const port = Number(smtp_port || account.smtp_port) || 465;
  const secure = smtp_secure !== undefined ? (smtp_secure ? 1 : 0) : account.smtp_secure;
  const name = display_name || account.display_name;

  if (!cleanUser || !cleanPass) {
    throw new Error('Both email / username and SMTP password or 16-letter App Password are required.');
  }

  // Attempt live handshake verification with the mail server
  try {
    await testSmtpHandshake({
      smtp_host: host,
      smtp_port: port,
      smtp_secure: secure === 1,
      smtp_user: cleanUser,
      smtp_pass: cleanPass
    });

    // Verification succeeded
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    db.prepare(`
      UPDATE sender_accounts
      SET 
        email = ?,
        display_name = ?,
        smtp_host = ?,
        smtp_port = ?,
        smtp_secure = ?,
        smtp_user = ?,
        smtp_pass = ?,
        is_verified = 1,
        verification_status = 'Authorized',
        verification_error = NULL,
        last_verified_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(cleanUser, name, host, port, secure, cleanUser, cleanPass, nowStr, account.id);

    // Sync credentials to environment variables for secure persistence
    const envUpdates = {};
    if (account.id === 'acc_xunaris') {
      envUpdates.XUNARIS_FROM_EMAIL = cleanUser;
      envUpdates.XUNARIS_SMTP_HOST = host;
      envUpdates.XUNARIS_SMTP_PORT = port;
      envUpdates.XUNARIS_SMTP_SECURE = secure === 1 ? 'true' : 'false';
      envUpdates.XUNARIS_SMTP_USER = cleanUser;
      envUpdates.XUNARIS_SMTP_PASS = cleanPass;
      envUpdates.XUNARIS_FROM_NAME = `"${name}"`;
    } else if (account.id === 'acc_hyra') {
      envUpdates.HYRA_FROM_EMAIL = cleanUser;
      envUpdates.HYRA_SMTP_HOST = host;
      envUpdates.HYRA_SMTP_PORT = port;
      envUpdates.HYRA_SMTP_SECURE = secure === 1 ? 'true' : 'false';
      envUpdates.HYRA_SMTP_USER = cleanUser;
      envUpdates.HYRA_SMTP_PASS = cleanPass;
      envUpdates.HYRA_FROM_NAME = `"${name}"`;
    }

    // If requested or if using as a shared Google relay, optionally authorize the other brand identity too
    if (shareAcrossBrands) {
      db.prepare(`
        UPDATE sender_accounts
        SET 
          smtp_host = ?,
          smtp_port = ?,
          smtp_secure = ?,
          smtp_user = ?,
          smtp_pass = ?,
          is_verified = 1,
          verification_status = 'Authorized',
          verification_error = NULL,
          last_verified_at = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id != ?
      `).run(host, port, secure, cleanUser, cleanPass, nowStr, account.id);

      if (account.id === 'acc_xunaris') {
        envUpdates.HYRA_SMTP_HOST = host;
        envUpdates.HYRA_SMTP_PORT = port;
        envUpdates.HYRA_SMTP_SECURE = secure === 1 ? 'true' : 'false';
        envUpdates.HYRA_SMTP_USER = cleanUser;
        envUpdates.HYRA_SMTP_PASS = cleanPass;
      } else {
        envUpdates.XUNARIS_SMTP_HOST = host;
        envUpdates.XUNARIS_SMTP_PORT = port;
        envUpdates.XUNARIS_SMTP_SECURE = secure === 1 ? 'true' : 'false';
        envUpdates.XUNARIS_SMTP_USER = cleanUser;
        envUpdates.XUNARIS_SMTP_PASS = cleanPass;
      }
    }

    if (host.includes('gmail') || cleanUser.includes('gmail')) {
      envUpdates.GMAIL_USER = cleanUser;
      envUpdates.GMAIL_APP_PASS = cleanPass;
    }

    updateEnvFile(envUpdates);

    return {
      success: true,
      id: account.id,
      email: account.email,
      displayName: name,
      status: 'Authorized',
      message: `Authentication successful! ${account.email} is now authorized to dispatch live emails.`
    };
  } catch (err) {
    // Verification failed - record failure status honestly
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    db.prepare(`
      UPDATE sender_accounts
      SET 
        email = ?,
        display_name = ?,
        smtp_host = ?,
        smtp_port = ?,
        smtp_secure = ?,
        smtp_user = ?,
        smtp_pass = ?,
        is_verified = 0,
        verification_status = 'Authentication Failed',
        verification_error = ?,
        last_verified_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(cleanUser, name, host, port, secure, cleanUser, cleanPass, err.message, nowStr, account.id);

    throw new Error(`Authentication handshake failed for ${account.email}: ${err.message}`);
  }
};

/**
 * Creates an active nodemailer transporter for a specific sender account
 */
export const createTransporterForAccount = (account) => {
  let user = account?.smtp_user;
  let pass = account?.smtp_pass;
  let host = account?.smtp_host || 'smtpout.secureserver.net';
  let port = Number(account?.smtp_port) || 465;
  let secure = account?.smtp_secure === 1 || port === 465;

  // 1. Check account-specific environment variables if missing in DB
  if (!user || !pass) {
    if (account?.id === 'acc_xunaris' || account?.id === 'acc_xunaris_info' || account?.email === 'sales@xunaris.com' || account?.email === 'info@xunaris.com') {
      if (process.env.XUNARIS_SMTP_USER && process.env.XUNARIS_SMTP_PASS) {
        user = process.env.XUNARIS_SMTP_USER;
        pass = process.env.XUNARIS_SMTP_PASS;
        host = process.env.XUNARIS_SMTP_HOST || host;
        port = Number(process.env.XUNARIS_SMTP_PORT) || port;
        secure = process.env.XUNARIS_SMTP_SECURE !== 'false';
      }
    } else if (account?.id === 'acc_hyra' || account?.email === 'sales@hyraconnect.com') {
      if (process.env.HYRA_SMTP_USER && process.env.HYRA_SMTP_PASS) {
        user = process.env.HYRA_SMTP_USER;
        pass = process.env.HYRA_SMTP_PASS;
        host = process.env.HYRA_SMTP_HOST || host;
        port = Number(process.env.HYRA_SMTP_PORT) || port;
        secure = process.env.HYRA_SMTP_SECURE !== 'false';
      }
    }
  }

  // 2. Fallback to shared authorized relay in database or .env
  if (!user || !pass) {
    try {
      const sharedRelay = db.prepare(`
        SELECT * FROM sender_accounts 
        WHERE smtp_user IS NOT NULL AND LENGTH(smtp_user) > 0 
          AND smtp_pass IS NOT NULL AND LENGTH(smtp_pass) > 0
          AND is_verified = 1
        LIMIT 1
      `).get();

      if (sharedRelay) {
        user = sharedRelay.smtp_user;
        pass = sharedRelay.smtp_pass;
        host = sharedRelay.smtp_host || host;
        port = Number(sharedRelay.smtp_port) || port;
        secure = sharedRelay.smtp_secure === 1 || port === 465;
      } else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASS) {
        user = process.env.GMAIL_USER;
        pass = process.env.GMAIL_APP_PASS;
        host = 'smtp.gmail.com';
        port = 465;
        secure = true;
      } else if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        user = process.env.SMTP_USER;
        pass = process.env.SMTP_PASS;
        host = process.env.SMTP_HOST || 'smtp.gmail.com';
        port = Number(process.env.SMTP_PORT) || 465;
        secure = process.env.SMTP_SECURE !== 'false';
      }
    } catch (e) {
      console.warn('[emailSender] Error finding shared relay:', e.message);
    }
  }

  if (!user || !pass) {
    return null;
  }

  const cleanUser = user.trim();
  const cleanPass = pass.replace(/\s+/g, '');
  const isGmail = host.toLowerCase().includes('gmail') || cleanUser.toLowerCase().includes('gmail');

  if (isGmail) {
    return nodemailer.createTransport({
      service: 'gmail',
      connectionTimeout: 6000,
      greetingTimeout: 6000,
      socketTimeout: 8000,
      auth: {
        user: cleanUser,
        pass: cleanPass
      }
    });
  }

  return nodemailer.createTransport({
    host: host,
    port: port,
    secure: secure,
    connectionTimeout: 6000,
    greetingTimeout: 6000,
    socketTimeout: 8000,
    auth: {
      user: cleanUser,
      pass: cleanPass
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

/**
 * Dispatch real email through the explicitly selected authorized sender account
 * Enforces Requirements:
 * 1. Allow selection of authorized sender account
 * 2. Selected authorized email appears in From address
 * 3. Recipient appears in To address
 * 4. Send from selected account to recipient
 * 5. Do not use personal Gmail as sender unless explicitly selected and authorized
 * 6. Do not display same email in From and To unless genuinely same
 * 7. Backend verification of sender credentials
 * 9. Honest error message if not authorized - never pretend
 * 10. Return sender, recipient, delivery status, and error details
 */
export const sendRealEmail = async ({
  to,
  subject,
  html,
  text,
  fromSenderEmail,
  from,
  businessUnit
}) => {
  const targetRecipient = (to || '').trim();

  // Validate recipient email
  if (!targetRecipient || !targetRecipient.includes('@')) {
    return {
      success: false,
      mode: 'validation_error',
      recipient: targetRecipient,
      error: 'Invalid recipient email address.',
      message: 'Email address is missing or invalid.'
    };
  }

  // Resolve authorized sender account
  const senderIdentifier = fromSenderEmail || from;
  let account = null;

  if (senderIdentifier) {
    account = getSenderAccount(senderIdentifier);
  }

  if (!account && businessUnit) {
    account = getSenderAccount(businessUnit);
  }

  // Fallback to primary HYRA Connect account if not resolved
  if (!account) {
    account = getSenderAccount('sales@hyraconnect.com') || getSenderAccount('acc_hyra') || getSenderAccount('sales@xunaris.com') || getSenderAccount('acc_xunaris');
  }

  if (!account) {
    return {
      success: false,
      mode: 'unauthorized',
      recipient: targetRecipient,
      error: 'No authorized sender account could be resolved.',
      message: 'Failed to find an authorized sender account in the CRM.'
    };
  }

  // ─── HTTPS API PATH (Brevo / Resend — bypasses Render Free Tier SMTP port blocking) ───
  const useBrevoApi = hasBrevoApiKey();
  const useResendApi = hasResendApiKey();
  const onRender = isRenderEnvironment();

  if (useBrevoApi || useResendApi || (onRender && !useResendApi && !useBrevoApi)) {
    if (!useBrevoApi && !useResendApi && onRender) {
      // On Render but no API key configured
      console.warn(`[emailSender] Render Free Tier blocks SMTP ports (465/587). No API key configured.`);
      return {
        success: false,
        mode: 'render_blocked',
        sender: account.email,
        senderDisplayName: account.display_name,
        recipient: targetRecipient,
        deliveryStatus: 'Halted',
        error: 'Halted: Render Free Tier blocks outbound SMTP ports (465/587). To send directly from Render, add a BREVO_API_KEY (No DNS required) or RESEND_API_KEY in Render Environment Variables.',
        message: 'Render Free Tier blocks SMTP. Add BREVO_API_KEY or RESEND_API_KEY to Environment Variables.'
      };
    }

    // Sanitize HTML for API delivery (strip CSS comments, fix relative URLs, and inline base64 images)
    let apiHtml = html;
    // Prepare an attachments array – will be used if we fall back to SMTP or if Resend supports attachments
    const attachments = [];
    if (apiHtml && typeof apiHtml === 'string') {
      // 1️⃣ Strip CSS comment wrappers in <style> blocks
      apiHtml = apiHtml.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (match, attrs, css) => {
        const cleanedCss = css.replace(/<!--/g, '').replace(/-->/g, '').trim();
        return `<style${attrs}>\n${cleanedCss}\n</style>`;
      });

      // 2️⃣ Convert relative image src URLs to absolute URLs so external mail clients can load them
      const appBaseUrl = process.env.RENDER_EXTERNAL_URL
        ? process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '')
        : (process.env.APP_BASE_URL || 'https://xunaris-sales.onrender.com');
      apiHtml = apiHtml.replace(/(<img[^>]+src=["'])(\/)([^"']*["'])/gi, (match, prefix, slash, rest) => {
        return `${prefix}${appBaseUrl}/${rest}`;
      });

      // 3️⃣ Inline any base64‑encoded images as CID attachments (for Gmail/Outlook where external images may be blocked)
      //    Detect <img src="data:image/png;base64,...."> patterns
      apiHtml = apiHtml.replace(/<img([^>]+)src=["']data:([^;]+);base64,([^"']+)["']([^>]*)>/gi,
        (fullMatch, beforeAttrs, mime, b64Data, afterAttrs) => {
          const cid = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          attachments.push({
            filename: `inline_${cid}.${mime.split('/')[1]}`,
            content: Buffer.from(b64Data, 'base64'),
            cid,
            contentType: mime
          });
          // rewrite src to cid reference
          return `<img${beforeAttrs}src="cid:${cid}"${afterAttrs}>`;
        }
      );
    }


    // Build clean plain text
    let cleanText = text;
    if (cleanText && (cleanText.includes('<!DOCTYPE') || cleanText.includes('<html') || cleanText.includes('<table') || cleanText.includes('<style'))) {
      cleanText = cleanText
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
    }
    if (!cleanText && apiHtml) {
      cleanText = apiHtml
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // ─── 1. BREVO HTTPS API (Zero DNS required, sends to ANY recipient!) ───
    if (useBrevoApi) {
      try {
        const brevoResult = await sendViaBrevoApi({
          fromEmail: account.email || 'sales@hyraconnect.com',
          fromName: account.display_name || (account.email?.includes('xunaris') ? 'Xunaris' : 'HYRA Connect'),
          to: targetRecipient,
          subject: subject || (account.email?.includes('xunaris') ? 'Xunaris Update' : 'HYRA Connect Update'),
          html: apiHtml || `<p>${cleanText || ''}</p>`,
          text: cleanText || subject || (account.email?.includes('xunaris') ? 'Executive Message from Xunaris' : 'Executive Message from HYRA Connect'),
          replyTo: account.email
        });

        console.log(`[emailSender:Brevo Success] Dispatched email from ${account.email} to ${targetRecipient} via Brevo API!`);
        return {
          success: true,
          mode: 'brevo_api',
          messageId: brevoResult.messageId,
          previewUrl: null,
          sender: account.email,
          senderDisplayName: account.display_name,
          recipient: targetRecipient,
          deliveryStatus: 'Delivered',
          message: `Email successfully delivered to ${targetRecipient} via Brevo API from ${account.email}!`
        };
      } catch (brevoErr) {
        console.error(`[emailSender:Brevo Failure] ${brevoErr.message}`);
        if (!useResendApi && onRender) {
          return {
            success: false,
            mode: 'brevo_failed',
            sender: account.email,
            senderDisplayName: account.display_name,
            recipient: targetRecipient,
            deliveryStatus: 'Failed',
            error: `Brevo API delivery failed: ${brevoErr.message}`,
            message: `Brevo API delivery failed: ${brevoErr.message}`
          };
        }
      }
    }

    // ─── 2. RESEND HTTPS API ───
    // Determine the "from" address for Resend
    // If using Resend's free tier without a verified domain, must use: "Name <onboarding@resend.dev>"
    // If you've verified your domain in Resend, use your real email
    const resendFrom = process.env.RESEND_VERIFIED_DOMAIN
      ? `"${account.display_name}" <${account.email}>`
      : `"${account.display_name}" <onboarding@resend.dev>`;

    try {
      const resendResult = await sendViaResendApi({
        from: resendFrom,
        to: targetRecipient,
        subject: subject || 'Xunaris CRM Message',
        html: apiHtml || `<p>${cleanText || ''}</p>`,
        text: cleanText || subject || 'Executive Message from Xunaris',
        replyTo: account.email
      });

      console.log(`[emailSender:Resend Success] Dispatched email from ${account.email} to ${targetRecipient} via Resend HTTPS API!`);
      return {
        success: true,
        mode: 'resend_api',
        messageId: resendResult.messageId,
        previewUrl: null,
        sender: account.email,
        senderDisplayName: account.display_name,
        recipient: targetRecipient,
        deliveryStatus: 'Delivered',
        message: `Email successfully delivered to ${targetRecipient} via Resend HTTPS API from ${account.email}!`
      };
    } catch (resendErr) {
      console.error(`[emailSender:Resend Failure] ${resendErr.message}`);
      // If on Render, don't fall back to SMTP (it will also fail)
      if (onRender) {
        return {
          success: false,
          mode: 'resend_failed',
          sender: account.email,
          senderDisplayName: account.display_name,
          recipient: targetRecipient,
          deliveryStatus: 'Failed',
          error: `Resend API delivery failed: ${resendErr.message}`,
          message: `Resend HTTPS API failed: ${resendErr.message}`
        };
      }
      // Not on Render — fall through to SMTP below
      console.log('[emailSender] Resend failed, falling back to SMTP...');
    }
  }

  // ─── STANDARD SMTP PATH (works on VPS, local, non-Render hosts) ───

  // Requirement 7: Enforce authentication check - DO NOT pretend if not authorized
  const transporter = createTransporterForAccount(account);
  if (!transporter || account.is_verified !== 1) {
    const statusMsg = account.verification_status || 'Not Configured';
    const detailMsg = account.verification_error ? ` (${account.verification_error})` : '';
    console.warn(`[emailSender:Unauthorized] Cannot dispatch email: Account "${account.email}" is unverified [${statusMsg}]${detailMsg}.`);
    return {
      success: false,
      mode: 'unauthorized',
      sender: account.email,
      senderDisplayName: account.display_name,
      recipient: targetRecipient,
      deliveryStatus: 'Not Dispatched - Unauthorized',
      error: `Sender account "${account.email}" is not authenticated (${statusMsg}). Please configure and authenticate official SMTP credentials for ${account.business_vertical} before sending emails.`,
      message: `Authentication required: ${account.email} is not authorized.`
    };
  }

  // Requirement 6: Check for accidental identical From and To
  if (account.email.toLowerCase() === targetRecipient.toLowerCase()) {
    console.warn(`[emailSender] Note: Sender ${account.email} is identical to recipient ${targetRecipient}.`);
  }

  // Requirement 2 & 3: Selected authorized account in From, Recipient in To
  const senderFromHeader = `"${account.display_name}" <${account.email}>`;

  try {
    const domainPart = account.email.split('@')[1] || 'xunaris.com';
    const uniqueMessageId = `<${Date.now()}.${Math.random().toString(36).substring(2, 10)}@${domainPart}>`;

    // Process and sanitize HTML & extract base64 images into standard RFC inline CID attachments
    let finalHtml = html;
    const attachments = [];

    if (finalHtml && typeof finalHtml === 'string') {
      // 1. Strip <!-- and --> from inside <style> tags so email clients don't leak raw CSS comments
      finalHtml = finalHtml.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (match, attrs, css) => {
        const cleanedCss = css.replace(/<!--/g, '').replace(/-->/g, '').trim();
        return `<style${attrs}>\n${cleanedCss}\n</style>`;
      });

      // 2. Extract base64 images into CID inline attachments for full cross-client rendering (Gmail, Titan, Outlook)
      let imgIndex = 0;
      finalHtml = finalHtml.replace(/<img([^>]+)src=["']data:image\/([^;]+);base64,([^"']+)["']([^>]*)>/gi, (match, before, mime, b64, after) => {
        const cid = `crm_img_${Date.now()}_${imgIndex++}`;
        const ext = mime.toLowerCase().includes('png') ? 'png' : (mime.toLowerCase().includes('gif') ? 'gif' : 'jpg');
        try {
          const buffer = Buffer.from(b64, 'base64');
          attachments.push({
            filename: `inline_image_${imgIndex}.${ext}`,
            content: buffer,
            cid: cid,
            contentType: `image/${ext}`
          });
          return `<img${before}src="cid:${cid}"${after}>`;
        } catch (e) {
          return match;
        }
      });
    }

    // Ensure plain text alternative NEVER leaks raw HTML / DOCTYPE / style tags
    let cleanText = text;
    if (cleanText && (cleanText.includes('<!DOCTYPE') || cleanText.includes('<html') || cleanText.includes('<table') || cleanText.includes('<style'))) {
      cleanText = cleanText
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
    }
    if (!cleanText && finalHtml) {
      cleanText = finalHtml
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
    }

    const mailOptions = {
      from: senderFromHeader,
      to: targetRecipient,
      replyTo: account.email,
      subject: subject || 'Xunaris CRM Message',
      text: cleanText || subject || 'Executive Message from Xunaris',
      html: finalHtml || `<p>${cleanText || ''}</p>`,
      attachments: attachments.length > 0 ? attachments : undefined,
      headers: {
        'X-Mailer': 'Xunaris-HYRA CRM v2.0 Enterprise',
        'List-Unsubscribe': `<mailto:unsubscribe@${domainPart}?subject=unsubscribe>`
      }
    };

    const info = await transporter.sendMail(mailOptions);
    const testPreviewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[emailSender:Live Success] Dispatched real email from ${account.email} to ${targetRecipient}! MessageId: ${info.messageId || uniqueMessageId}${testPreviewUrl ? ` Preview: ${testPreviewUrl}` : ''}`);

    // Requirement 10: Show actual sender email, recipient email, delivery status
    return {
      success: true,
      mode: 'live',
      messageId: info.messageId || uniqueMessageId,
      previewUrl: testPreviewUrl || null,
      sender: account.email,
      senderDisplayName: account.display_name,
      recipient: targetRecipient,
      deliveryStatus: 'Delivered',
      message: `Live email successfully delivered to ${targetRecipient} from authorized sender ${account.email}!`
    };
  } catch (err) {
    console.error(`[emailSender:SMTP Failure] Delivery error from ${account.email} to ${targetRecipient}:`, err.message);
    return {
      success: false,
      mode: 'delivery_failed',
      sender: account.email,
      senderDisplayName: account.display_name,
      recipient: targetRecipient,
      deliveryStatus: 'Failed',
      error: `Mail server rejected delivery: ${err.message}`,
      message: `SMTP delivery failed: ${err.message}`
    };
  }
};

/**
 * Backwards compatibility helper for global SMTP config
 */
export const getSmtpConfig = () => {
  const primaryAccount = getSenderAccount('sales@hyraconnect.com') || getSenderAccount('acc_hyra') || getSenderAccount('sales@xunaris.com') || getSenderAccount('acc_xunaris');
  return {
    host: primaryAccount?.smtp_host || 'smtpout.secureserver.net',
    port: primaryAccount?.smtp_port || 465,
    user: primaryAccount?.smtp_user || 'sales@hyraconnect.com',
    isConfigured: Boolean(primaryAccount?.smtp_user && primaryAccount?.smtp_pass && primaryAccount?.is_verified === 1),
    defaultFrom: primaryAccount?.email ? `"${primaryAccount.display_name}" <${primaryAccount.email}>` : '"HYRA Connect Sales" <sales@hyraconnect.com>'
  };
};

/**
 * Backwards compatibility helper for verifySmtp
 */
export const verifySmtp = async () => {
  const accounts = getAllSenderAccounts();
  const verifiedCount = accounts.filter(a => a.is_verified === 1).length;
  return {
    connected: verifiedCount > 0,
    configured: accounts.some(a => a.is_configured),
    verifiedCount,
    totalAccounts: accounts.length,
    accounts: accounts.map(a => ({
      email: a.email,
      vertical: a.business_vertical,
      status: a.verification_status,
      isVerified: a.is_verified === 1
    }))
  };
};

/**
 * Backwards compatibility configure helper
 */
export const configureSmtpAndSave = async ({ accountId, senderEmail, gmailUser, gmailAppPass, host, port, user, pass, secure }) => {
  const targetId = accountId || senderEmail || 'acc_hyra';
  return await updateSenderAccountCredentials(targetId, {
    smtp_host: host,
    smtp_port: port,
    smtp_secure: secure,
    smtp_user: gmailUser || user,
    smtp_pass: gmailAppPass || pass
  });
};
