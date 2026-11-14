import crypto from 'crypto';
import db from '../db/database.js';
import { sendRealEmail } from './emailSender.js';
import { generateActivityId } from './idGenerator.js';
import { createNotification } from './backgroundWorker.js';

/**
 * HYRA Connect AI Sales Agent
 *  1. Finds & scores leads (rule-based score + weekly learned adjustments)
 *  2. Picks the right prospects (decision makers in target industries, reachable)
 *  3. Drafts a multichannel sequence (Email -> LinkedIn task -> Email) with a booking link
 *  4. Sends approved steps inside business hours and the daily limit, books meetings
 *  5. Learns weekly from replies / meetings / qualified leads and adjusts scoring
 */

const BASE_URL = () => (process.env.PUBLIC_BASE_URL || 'https://sales.hyraconnect.com').replace(/\/$/, '');
const TZ = 'Asia/Kolkata';
const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_INDUSTRIES = ['it', 'software', 'technology', 'healthcare', 'bfsi', 'banking', 'finance', 'manufacturing', 'retail', 'logistics', 'telecom', 'e-commerce', 'pharma', 'consulting'];
const DECISION_WORDS = ['ceo', 'founder', 'co-founder', 'owner', 'managing director', 'md', 'president', 'coo', 'cto', 'chro', 'director', 'vp', 'vice president', 'head', 'chief'];
const HR_WORDS = ['hr', 'human resource', 'talent', 'recruit', 'people', 'staffing', 'acquisition'];
const HIRING_WORDS = ['hiring', 'hire', 'recruit', 'staff', 'opening', 'vacanc', 'contract', 'manpower', 'headcount', 'talent', 'resource', 'bench'];

const parseJson = (s, fallback) => {
  try { return JSON.parse(s); } catch { return fallback; }
};
const newId = (p) => `${p}_${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
const iso = (d) => new Date(d).toISOString();

// ---------------------------------------------------------------- settings

export const getSettings = () => {
  const row = db.prepare('SELECT * FROM agent_settings WHERE id = 1').get();
  return {
    ...row,
    enabled: !!row.enabled,
    target_industries: parseJson(row.target_industries, []),
    target_titles: parseJson(row.target_titles, [])
  };
};

export const updateSettings = (patch) => {
  const cur = getSettings();
  const next = {
    enabled: patch.enabled === undefined ? cur.enabled : !!patch.enabled,
    mode: patch.mode === 'auto' ? 'auto' : patch.mode === 'approval' ? 'approval' : cur.mode,
    daily_send_limit: Math.min(200, Math.max(1, Number(patch.daily_send_limit ?? cur.daily_send_limit) || cur.daily_send_limit)),
    min_score: Math.min(100, Math.max(0, Number(patch.min_score ?? cur.min_score) || cur.min_score)),
    target_industries: Array.isArray(patch.target_industries) ? patch.target_industries.map((s) => String(s).trim()).filter(Boolean) : cur.target_industries,
    target_titles: Array.isArray(patch.target_titles) ? patch.target_titles.map((s) => String(s).trim()).filter(Boolean) : cur.target_titles,
    sender_email: String(patch.sender_email || cur.sender_email).trim()
  };
  db.prepare(`
    UPDATE agent_settings SET enabled = ?, mode = ?, daily_send_limit = ?, min_score = ?,
      target_industries = ?, target_titles = ?, sender_email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1
  `).run(next.enabled ? 1 : 0, next.mode, next.daily_send_limit, next.min_score,
    JSON.stringify(next.target_industries), JSON.stringify(next.target_titles), next.sender_email);
  return getSettings();
};

// ----------------------------------------------------------------- scoring

const has = (text, words) => words.some((w) => text.includes(w));

/** Returns { score, tier, reasons[], features[] } for a lead row. */
export const scoreLead = (lead, settings = getSettings(), adjustments = loadAdjustments()) => {
  const reasons = [];
  const features = [];
  let score = 20;

  const title = (lead.job_title || '').toLowerCase();
  const industry = (lead.industry || '').toLowerCase();
  const need = `${lead.requirement_summary || ''} ${lead.notes || ''} ${lead.service || ''}`.toLowerCase();
  const customTitles = settings.target_titles.map((t) => t.toLowerCase());

  // Who: decision makers and HR / talent owners
  if (customTitles.some((t) => title.includes(t)) || has(title, DECISION_WORDS)) {
    score += 25; features.push('title:decision'); reasons.push('Decision-maker title');
  } else if (has(title, HR_WORDS)) {
    score += 18; features.push('title:hr'); reasons.push('HR / talent owner');
  } else if (title) {
    score += 6; features.push('title:other');
  }

  // Where: target industries
  const targets = (settings.target_industries.length ? settings.target_industries : DEFAULT_INDUSTRIES).map((i) => i.toLowerCase());
  const hit = industry && targets.find((t) => industry.includes(t) || t.includes(industry));
  if (hit) {
    score += 18; features.push(`industry:${hit}`); reasons.push(`Target industry (${lead.industry})`);
  }

  // Intent: talks about hiring
  if (has(need, HIRING_WORDS)) {
    score += 14; features.push('intent:hiring'); reasons.push('Mentions hiring need');
  }

  // Reachability
  if (lead.work_email) { score += 8; features.push('contact:email'); } else { reasons.push('No email on file'); }
  if (lead.phone) { score += 3; features.push('contact:phone'); }

  // Priority + source + status
  if (lead.priority === 'High') { score += 8; features.push('priority:high'); reasons.push('High priority'); }
  else if (lead.priority === 'Medium') score += 3;
  const source = (lead.lead_source || '').toLowerCase();
  if (source) {
    features.push(`source:${source}`);
    if (source.includes('referral')) { score += 8; reasons.push('Referral source'); }
    else if (source.includes('website') || source.includes('inbound')) { score += 6; reasons.push('Inbound source'); }
  }
  if (lead.lead_status === 'Qualified') { score += 8; reasons.push('Already qualified'); }
  if (lead.lead_status === 'Nurture') score -= 8;

  // Freshness
  const ageDays = (Date.now() - new Date(lead.created_at || Date.now()).getTime()) / DAY_MS;
  if (ageDays <= 14) { score += 4; reasons.push('Fresh lead'); }
  else if (ageDays > 90) score -= 6;

  // Learned adjustments (from last weekly learning pass)
  let learned = 0;
  for (const f of features) learned += adjustments[f] || 0;
  learned = Math.max(-15, Math.min(15, learned));
  if (learned) reasons.push(`Learned ${learned > 0 ? '+' : ''}${learned} from past results`);
  score += learned;

  score = Math.max(0, Math.min(100, Math.round(score)));
  const tier = score >= 80 ? 'Hot' : score >= 65 ? 'Warm' : score >= 45 ? 'Cool' : 'Cold';
  return { score, tier, reasons, features };
};

const loadAdjustments = () => {
  const out = {};
  for (const r of db.prepare('SELECT feature, adjustment FROM agent_weights').all()) out[r.feature] = r.adjustment;
  return out;
};

export const scoreAllLeads = () => {
  const settings = getSettings();
  const adj = loadAdjustments();
  const leads = db.prepare(`
    SELECT * FROM leads WHERE business_vertical_code = 'HYRA' AND lead_status != 'Disqualified'
  `).all();
  const upsert = db.prepare(`
    INSERT INTO agent_lead_scores (lead_id, score, tier, reasons, features, scored_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(lead_id) DO UPDATE SET score = excluded.score, tier = excluded.tier,
      reasons = excluded.reasons, features = excluded.features, scored_at = CURRENT_TIMESTAMP
  `);
  const tx = db.transaction(() => {
    for (const lead of leads) {
      const s = scoreLead(lead, settings, adj);
      upsert.run(lead.id, s.score, s.tier, JSON.stringify(s.reasons), JSON.stringify(s.features));
    }
  });
  tx();
  return leads.length;
};

// ---------------------------------------------------------------- prospects

/** Ranked, reachable decision-makers. `all` includes ones below the min score. */
export const listProspects = ({ limit = 50, includeBelowMin = false } = {}) => {
  const settings = getSettings();
  const rows = db.prepare(`
    SELECT l.id, l.company_name, l.contact_name, l.job_title, l.work_email, l.phone, l.industry, l.city,
           l.lead_source, l.lead_status, l.priority, l.requirement_summary,
           s.score, s.tier, s.reasons, s.features,
           (SELECT COUNT(*) FROM agent_outreach o WHERE o.lead_id = l.id) AS steps,
           (SELECT COUNT(*) FROM agent_outreach o WHERE o.lead_id = l.id AND o.status IN ('Sent','Task Created')) AS steps_done,
           (SELECT COUNT(*) FROM agent_outreach o WHERE o.lead_id = l.id AND o.status = 'Replied') AS replied,
           (SELECT status FROM agent_meetings m WHERE m.lead_id = l.id ORDER BY m.created_at DESC LIMIT 1) AS meeting_status
    FROM agent_lead_scores s JOIN leads l ON l.id = s.lead_id
    WHERE l.lead_status != 'Disqualified' ${includeBelowMin ? '' : 'AND s.score >= ?'}
    ORDER BY s.score DESC, l.created_at DESC LIMIT ?
  `).all(...(includeBelowMin ? [limit] : [settings.min_score, limit]));
  return rows.map((r) => ({ ...r, reasons: parseJson(r.reasons, []), features: parseJson(r.features, []) }));
};


// ------------------------------------------------------------- suppression

/** Never contact: listed emails/domains, existing clients (a Won opportunity), unsubscribed or disqualified leads. */
export const isSuppressed = (lead) => {
  const email = (lead.work_email || '').trim().toLowerCase();
  const domain = email.includes('@') ? email.split('@')[1] : '';
  if (email && db.prepare(`SELECT 1 FROM agent_suppressions WHERE kind = 'email' AND value = ?`).get(email)) return 'On suppression list';
  if (domain && db.prepare(`SELECT 1 FROM agent_suppressions WHERE kind = 'domain' AND value = ?`).get(domain)) return 'Domain on suppression list';
  const client = db.prepare(`
    SELECT 1 FROM opportunities WHERE stage = 'Won' AND (LOWER(company_name) = LOWER(?) OR (company_id IS NOT NULL AND company_id = ?)) LIMIT 1
  `).get(lead.company_name || '', lead.company_id || '');
  return client ? 'Existing client' : '';
};

export const listSuppressions = () => db.prepare(`SELECT value, kind, reason, created_at FROM agent_suppressions ORDER BY created_at DESC LIMIT 500`).all();

export const addSuppressions = (text, reason = 'Added manually') => {
  const ins = db.prepare(`INSERT OR IGNORE INTO agent_suppressions (value, kind, reason) VALUES (?, ?, ?)`);
  let n = 0;
  for (const raw of String(text || '').split(/[\s,;]+/)) {
    const v = raw.trim().toLowerCase().replace(/^@/, '');
    if (!v) continue;
    const kind = v.includes('@') ? 'email' : (v.includes('.') ? 'domain' : null);
    if (kind) n += ins.run(v, kind, reason).changes;
  }
  // stop anything already queued for suppressed leads
  for (const o of db.prepare(`SELECT DISTINCT o.lead_id FROM agent_outreach o WHERE o.status IN ('Pending Approval','Approved')`).all()) {
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(o.lead_id);
    if (lead && isSuppressed(lead)) {
      db.prepare(`UPDATE agent_outreach SET status = 'Skipped', error = 'Suppressed', updated_at = CURRENT_TIMESTAMP WHERE lead_id = ? AND status IN ('Pending Approval','Approved')`).run(o.lead_id);
    }
  }
  return n;
};

export const removeSuppression = (value) => db.prepare(`DELETE FROM agent_suppressions WHERE value = ?`).run(String(value).toLowerCase()).changes;

/** They asked to stop: suppress the address and cancel the rest of the sequence. */
export const markUnsubscribed = (leadId) => {
  const lead = db.prepare('SELECT work_email FROM leads WHERE id = ?').get(leadId);
  if (lead?.work_email) addSuppressions(lead.work_email, 'Unsubscribed');
  db.prepare(`UPDATE agent_outreach SET status = 'Skipped', updated_at = CURRENT_TIMESTAMP WHERE lead_id = ? AND status IN ('Pending Approval','Approved')`).run(leadId);
};

// ---------------------------------------------------------------- outreach

const firstName = (full) => (full || '').trim().split(/\s+/)[0] || 'there';

const ensureMeetingToken = (leadId) => {
  const existing = db.prepare(`SELECT token FROM agent_meetings WHERE lead_id = ? AND status != 'Cancelled' ORDER BY created_at DESC LIMIT 1`).get(leadId);
  if (existing) return existing.token;
  const token = crypto.randomBytes(12).toString('hex');
  db.prepare(`INSERT INTO agent_meetings (id, lead_id, token) VALUES (?, ?, ?)`).run(newId('mtg'), leadId, token);
  return token;
};

const OPT_OUT = '\n\nIf this is not relevant, reply "unsubscribe" and we will not contact you again.';

const draftTemplates = (lead, bookingUrl) => {
  const name = firstName(lead.contact_name);
  const co = lead.company_name;
  const ask = (lead.requirement_summary || '').trim();
  const hook = ask
    ? `I noticed ${co} is looking at: "${ask.slice(0, 120)}".`
    : `We help ${lead.industry ? lead.industry + ' ' : ''}teams like ${co} close critical roles faster.`;
  return [
    {
      step_no: 1, channel: 'Email', dayOffset: 0,
      subject: `Faster hiring for ${co}`,
      body: `Hi ${name},\n\n${hook}\n\nHYRA Connect Staffing places vetted contract and permanent talent, typically with first profiles in 48 hours. If useful, you can grab 20 minutes with us here: ${bookingUrl}\n\nRegards,\nHYRA Connect Staffing${OPT_OUT}`
    },
    {
      step_no: 2, channel: 'LinkedIn', dayOffset: 1,
      subject: null,
      body: `Hi ${name}, I emailed about hiring support for ${co}. We place vetted talent quickly and I thought it may be relevant to you as ${lead.job_title || 'a hiring leader'}. Happy to share a few profiles, no obligation.`
    },
    {
      step_no: 3, channel: 'Email', dayOffset: 3,
      subject: `Re: Faster hiring for ${co}`,
      body: `Hi ${name},\n\nFollowing up in case my note got buried. If you have open roles at ${co}, we can share matching profiles within 48 hours. Pick a time that suits you: ${bookingUrl}\n\nRegards,\nHYRA Connect Staffing${OPT_OUT}`
    }
  ];
};

/** Optional personalisation of step bodies with Gemini; silently falls back to templates. */
const personalise = async (lead, drafts) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return drafts;
  try {
    const prompt = `Rewrite these 3 B2B staffing outreach messages for ${lead.contact_name} (${lead.job_title}) at ${lead.company_name} (${lead.industry || 'unknown industry'}). Keep each under 90 words, friendly, no hype, keep any URL and the unsubscribe line exactly. Return JSON array of 3 strings in the same order.\n\n${JSON.stringify(drafts.map((d) => d.body))}`;
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } })
    });
    if (!res.ok) return drafts;
    const data = await res.json();
    const arr = JSON.parse(data.candidates[0].content.parts[0].text);
    if (!Array.isArray(arr) || arr.length !== 3) return drafts;
    return drafts.map((d, i) => (typeof arr[i] === 'string' && arr[i].length > 20 && (d.channel !== 'Email' || arr[i].includes(d.body.match(/https?:\/\/\S+/)?.[0] || '') ) ? { ...d, body: arr[i] } : d));
  } catch {
    return drafts;
  }
};

export const draftSequenceForLead = async (leadId) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
  if (!lead) throw new Error('Lead not found');
  if (db.prepare('SELECT 1 FROM agent_outreach WHERE lead_id = ?').get(leadId)) return 0;
  if (isSuppressed(lead)) return 0;
  const settings = getSettings();
  const bookingUrl = `${BASE_URL()}/book/${ensureMeetingToken(leadId)}`;
  const drafts = await personalise(lead, draftTemplates(lead, bookingUrl));
  const status = settings.mode === 'auto' ? 'Approved' : 'Pending Approval';
  const ins = db.prepare(`
    INSERT INTO agent_outreach (id, lead_id, step_no, channel, subject, body, status, scheduled_for)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = Date.now();
  db.transaction(() => {
    for (const d of drafts) ins.run(newId('out'), leadId, d.step_no, d.channel, d.subject, d.body, status, iso(now + d.dayOffset * DAY_MS));
  })();
  return drafts.length;
};

// ----------------------------------------------------------------- sending

const istParts = (d = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', weekday: 'short', hour12: false }).formatToParts(d);
  return { hour: Number(parts.find((p) => p.type === 'hour').value) % 24, weekday: parts.find((p) => p.type === 'weekday').value };
};
const inBusinessHours = () => {
  const { hour, weekday } = istParts();
  return weekday !== 'Sun' && hour >= 9 && hour < 18;
};

const sentToday = () => db.prepare(`
  SELECT COUNT(*) AS c FROM agent_outreach WHERE channel = 'Email' AND status IN ('Sent','Replied') AND sent_at >= datetime('now','-1 day')
`).get().c;

const stopped = (leadId) => {
  const lead = db.prepare('SELECT lead_status FROM leads WHERE id = ?').get(leadId);
  if (!lead || lead.lead_status === 'Disqualified') return true;
  if (isSuppressed(db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId))) return true;
  if (db.prepare(`SELECT 1 FROM agent_outreach WHERE lead_id = ? AND status = 'Replied'`).get(leadId)) return true;
  return !!db.prepare(`SELECT 1 FROM agent_meetings WHERE lead_id = ? AND status = 'Booked'`).get(leadId);
};

const toHtml = (text) => `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#1e293b">${text
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1">$1</a>')
  .replace(/\n/g, '<br>')}</div>`;

export const sendDueSteps = async () => {
  const settings = getSettings();
  let sent = 0;
  const due = db.prepare(`
    SELECT o.*, l.work_email, l.contact_name, l.company_name, l.owner_email
    FROM agent_outreach o JOIN leads l ON l.id = o.lead_id
    WHERE o.status = 'Approved' AND o.scheduled_for <= ? ORDER BY o.scheduled_for ASC LIMIT 50
  `).all(iso(Date.now()));

  for (const step of due) {
    if (stopped(step.lead_id)) {
      db.prepare(`UPDATE agent_outreach SET status = 'Skipped', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(step.id);
      continue;
    }
    if (step.channel === 'LinkedIn') {
      // LinkedIn has no sanctioned send API: create a task for the owner with the drafted message.
      db.prepare(`
        INSERT INTO activities (id, related_type, related_id, related_to, activity_type, subject, date_time, assigned_to, status, outcome, created_by)
        VALUES (?, 'Lead', ?, ?, 'Task', ?, ?, ?, 'Planned', ?, 'Sales Agent')
      `).run(generateActivityId(), step.lead_id, `${step.contact_name} (${step.company_name})`,
        `Send LinkedIn message to ${step.contact_name}`, iso(Date.now()), step.owner_email || 'sales@hyraconnect.com', step.body);
      db.prepare(`UPDATE agent_outreach SET status = 'Task Created', sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(step.id);
      if (step.owner_email) createNotification(step.owner_email, 'LinkedIn message ready', `Send the drafted message to ${step.contact_name} at ${step.company_name}.`, 'info');
      continue;
    }
    if (!inBusinessHours() || sentToday() >= settings.daily_send_limit) continue;
    if (!step.work_email) {
      db.prepare(`UPDATE agent_outreach SET status = 'Skipped', error = 'No email address', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(step.id);
      continue;
    }
    try {
      const r = await sendRealEmail({
        to: step.work_email, subject: step.subject, text: step.body, html: toHtml(step.body),
        fromSenderEmail: settings.sender_email, businessUnit: 'HYRA Connect'
      });
      if (r.success) {
        db.prepare(`UPDATE agent_outreach SET status = 'Sent', sent_at = CURRENT_TIMESTAMP, error = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(step.id);
        db.prepare(`UPDATE leads SET lead_status = CASE WHEN lead_status = 'New' THEN 'Contacted' ELSE lead_status END, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(step.lead_id);
        sent++;
      } else {
        db.prepare(`UPDATE agent_outreach SET status = 'Failed', error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(r.error || r.message || 'Send failed', step.id);
      }
    } catch (e) {
      db.prepare(`UPDATE agent_outreach SET status = 'Failed', error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(e.message, step.id);
    }
  }
  return sent;
};

// --------------------------------------------------------- reply / meetings

export const markReplied = (leadId) => {
  db.prepare(`
    UPDATE agent_outreach SET status = 'Skipped', updated_at = CURRENT_TIMESTAMP
    WHERE lead_id = ? AND status IN ('Pending Approval','Approved')
  `).run(leadId);
  const last = db.prepare(`SELECT id FROM agent_outreach WHERE lead_id = ? AND status IN ('Sent','Task Created') ORDER BY step_no DESC LIMIT 1`).get(leadId);
  if (last) db.prepare(`UPDATE agent_outreach SET status = 'Replied', replied_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(last.id);
};

const BOOKING = { days: [1, 2, 3, 4, 5], start: 10, end: 17, minutes: 30 };

export const availableSlots = (daysAhead = 7) => {
  const booked = new Set(db.prepare(`SELECT slot_start FROM agent_meetings WHERE status = 'Booked' AND slot_start >= ?`).all(iso(Date.now())).map((r) => r.slot_start));
  const slots = [];
  for (let d = 1; d <= daysAhead + 2 && slots.length < daysAhead * 12; d++) {
    const day = new Date(Date.now() + d * DAY_MS);
    const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(day);
    const dow = new Date(`${ymd}T12:00:00+05:30`).getUTCDay();
    if (!BOOKING.days.includes(dow)) continue;
    for (let h = BOOKING.start; h < BOOKING.end; h++) {
      for (const m of [0, 30]) {
        const start = new Date(`${ymd}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+05:30`);
        if (!booked.has(start.toISOString())) slots.push(start.toISOString());
      }
    }
  }
  return slots;
};

export const getBookingContext = (token) => {
  const m = db.prepare(`
    SELECT m.*, l.contact_name, l.company_name, l.owner_email FROM agent_meetings m JOIN leads l ON l.id = m.lead_id WHERE m.token = ?
  `).get(token);
  return m || null;
};

export const bookSlot = (token, slotStart) => {
  const m = getBookingContext(token);
  if (!m) throw new Error('Invalid booking link');
  if (m.status === 'Booked') throw new Error('This link has already been used to book a meeting');
  const slots = availableSlots();
  const start = new Date(slotStart).toISOString();
  if (!slots.includes(start)) throw new Error('That slot is no longer available. Please pick another.');
  const end = new Date(new Date(start).getTime() + BOOKING.minutes * 60000).toISOString();
  db.transaction(() => {
    db.prepare(`UPDATE agent_meetings SET status = 'Booked', slot_start = ?, slot_end = ?, booked_at = CURRENT_TIMESTAMP WHERE id = ?`).run(start, end, m.id);
    db.prepare(`
      INSERT INTO activities (id, related_type, related_id, related_to, activity_type, subject, date_time, assigned_to, status, outcome, created_by)
      VALUES (?, 'Lead', ?, ?, 'Meeting', ?, ?, ?, 'Planned', 'Booked via sales agent link', 'Sales Agent')
    `).run(generateActivityId(), m.lead_id, `${m.contact_name} (${m.company_name})`,
      `Intro call: ${m.contact_name}, ${m.company_name}`, start, m.owner_email || 'sales@hyraconnect.com');
    db.prepare(`UPDATE leads SET lead_status = 'Qualified', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(m.lead_id);
    db.prepare(`UPDATE agent_outreach SET status = 'Skipped', updated_at = CURRENT_TIMESTAMP WHERE lead_id = ? AND status IN ('Pending Approval','Approved')`).run(m.lead_id);
  })();
  if (m.owner_email) createNotification(m.owner_email, 'Meeting booked by Sales Agent', `${m.contact_name} (${m.company_name}) booked ${start}.`, 'success');
  return { start, end, contact_name: m.contact_name, company_name: m.company_name };
};

export const listMeetings = () => db.prepare(`
  SELECT m.id, m.lead_id, m.status, m.slot_start, m.slot_end, l.contact_name, l.company_name, l.job_title
  FROM agent_meetings m JOIN leads l ON l.id = m.lead_id
  WHERE m.status = 'Booked' ORDER BY m.slot_start ASC LIMIT 100
`).all();

// ---------------------------------------------------------------- learning

/**
 * Compare each feature's success rate with the overall rate and nudge scoring by up to +/-10.
 * Success = replied, meeting booked, or lead became Qualified. Needs >= 5 contacted leads per feature.
 */
export const learn = () => {
  const rows = db.prepare(`
    SELECT s.lead_id, s.features, l.lead_status,
      EXISTS(SELECT 1 FROM agent_outreach o WHERE o.lead_id = s.lead_id AND o.status = 'Replied') AS replied,
      EXISTS(SELECT 1 FROM agent_meetings m WHERE m.lead_id = s.lead_id AND m.status = 'Booked') AS booked
    FROM agent_lead_scores s JOIN leads l ON l.id = s.lead_id
    WHERE EXISTS(SELECT 1 FROM agent_outreach o WHERE o.lead_id = s.lead_id AND o.status IN ('Sent','Task Created','Replied'))
  `).all();
  if (rows.length < 10) return { learned: 0, samples: rows.length, note: 'Needs at least 10 contacted leads before learning.' };

  const win = (r) => (r.replied || r.booked || r.lead_status === 'Qualified') ? 1 : 0;
  const overall = rows.reduce((a, r) => a + win(r), 0) / rows.length;
  const stats = {};
  for (const r of rows) {
    for (const f of parseJson(r.features, [])) {
      stats[f] = stats[f] || { n: 0, w: 0 };
      stats[f].n++; stats[f].w += win(r);
    }
  }
  const up = db.prepare(`
    INSERT INTO agent_weights (feature, adjustment, samples, success_rate, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(feature) DO UPDATE SET adjustment = excluded.adjustment, samples = excluded.samples,
      success_rate = excluded.success_rate, updated_at = CURRENT_TIMESTAMP
  `);
  let changed = 0;
  db.transaction(() => {
    for (const [f, s] of Object.entries(stats)) {
      if (s.n < 5) continue;
      const rate = s.w / s.n;
      const adj = Math.max(-10, Math.min(10, Math.round((rate - overall) * 40)));
      up.run(f, adj, s.n, rate);
      changed++;
    }
    db.prepare(`UPDATE agent_settings SET last_learned_at = CURRENT_TIMESTAMP WHERE id = 1`).run();
  })();
  return { learned: changed, samples: rows.length, overall };
};

export const getInsights = () => db.prepare(`
  SELECT feature, adjustment, samples, success_rate FROM agent_weights WHERE adjustment != 0
  ORDER BY ABS(adjustment) DESC LIMIT 8
`).all();

/** Weekly performance for the last `weeks` weeks (Monday-based, server time). */
export const weeklyStats = (weeks = 5) => {
  const out = [];
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  for (let i = weeks - 1; i >= 0; i--) {
    const from = new Date(monday.getTime() - i * 7 * DAY_MS);
    const to = new Date(from.getTime() + 7 * DAY_MS);
    const a = iso(from), b = iso(to);
    const sql = (q, ...p) => db.prepare(q).get(...p);
    const sent = sql(`SELECT COUNT(*) c FROM agent_outreach WHERE sent_at >= ? AND sent_at < ?`, a.replace('T', ' ').slice(0, 19), b.replace('T', ' ').slice(0, 19)).c;
    const replies = sql(`SELECT COUNT(*) c FROM agent_outreach WHERE status = 'Replied' AND replied_at >= ? AND replied_at < ?`, a.replace('T', ' ').slice(0, 19), b.replace('T', ' ').slice(0, 19)).c;
    const meetings = sql(`SELECT COUNT(*) c FROM agent_meetings WHERE status = 'Booked' AND booked_at >= ? AND booked_at < ?`, a.replace('T', ' ').slice(0, 19), b.replace('T', ' ').slice(0, 19)).c;
    out.push({
      label: `Week ${weeks - i}`, week_start: a.slice(0, 10), sent, replies, meetings,
      reply_rate: sent ? Math.round((replies / sent) * 100) : 0
    });
  }
  return out;
};

export const getOverview = () => {
  const c = (q) => db.prepare(q).get().c;
  return {
    scored: c(`SELECT COUNT(*) c FROM agent_lead_scores`),
    hot: c(`SELECT COUNT(*) c FROM agent_lead_scores WHERE tier = 'Hot'`),
    pending_approval: c(`SELECT COUNT(*) c FROM agent_outreach WHERE status = 'Pending Approval'`),
    sent_today: sentToday(),
    meetings_booked: c(`SELECT COUNT(*) c FROM agent_meetings WHERE status = 'Booked'`),
    replies: c(`SELECT COUNT(*) c FROM agent_outreach WHERE status = 'Replied'`),
    suppressed: c(`SELECT COUNT(*) c FROM agent_suppressions`)
  };
};

// -------------------------------------------------------------- main cycle

let running = false;

/** One full agent pass. Safe to call repeatedly (worker calls it every few minutes). */
export const runCycle = async ({ force = false } = {}) => {
  if (running) return { skipped: 'already running' };
  const settings = getSettings();
  if (!settings.enabled && !force) return { skipped: 'agent is off' };
  running = true;
  try {
    const scored = scoreAllLeads();
    let drafted = 0;
    const candidates = db.prepare(`
      SELECT s.lead_id FROM agent_lead_scores s JOIN leads l ON l.id = s.lead_id
      WHERE s.score >= ? AND l.work_email IS NOT NULL AND l.work_email != ''
        AND l.lead_status IN ('New','Contacted','Qualified')
        AND NOT EXISTS (SELECT 1 FROM agent_outreach o WHERE o.lead_id = s.lead_id)
      ORDER BY s.score DESC LIMIT 60
    `).all(settings.min_score);
    for (const c of candidates) {
      if (drafted >= 15) break;
      drafted += await draftSequenceForLead(c.lead_id) ? 1 : 0; // suppressed leads draft nothing
    }

    const sent = await sendDueSteps();

    // Weekly learning pass
    const last = settings.last_learned_at ? new Date(settings.last_learned_at.replace(' ', 'T') + 'Z').getTime() : 0;
    let note = '';
    if (Date.now() - last > 7 * DAY_MS) note = JSON.stringify(learn());

    db.prepare(`UPDATE agent_settings SET last_run_at = CURRENT_TIMESTAMP WHERE id = 1`).run();
    db.prepare(`INSERT INTO agent_runs (scored, drafted, sent, note) VALUES (?, ?, ?, ?)`).run(scored, drafted, sent || 0, note);
    return { scored, drafted, sent: sent || 0 };
  } finally {
    running = false;
  }
};
