import db from '../db/database.js';
import { askGeminiJson, geminiConfigured, geminiStatus } from './gemini.js';
import { scoreLead, getSettings as getAgentSettings } from './salesAgent.js';
import { getRoutingSettings } from './routing.js';
import { fetchPage, extractText } from './icpFromWebsite.js';

/**
 * Leads AI: for every open lead it writes a short brief, the single next best action and a
 * ready-to-send message, looks up the company website, and finds duplicates, so people do not
 * have to read, decide and type each time. Uses Gemini when GEMINI_API_KEY is set, otherwise
 * built-in rules, so it always works.
 */

const FREE_MAIL = ['gmail.com', 'yahoo.com', 'yahoo.in', 'outlook.com', 'hotmail.com', 'live.com', 'rediffmail.com', 'icloud.com', 'proton.me', 'protonmail.com', 'aol.com'];
const firstName = (n) => (n || '').trim().split(/\s+/)[0] || 'there';
const daysSince = (d) => (d ? Math.floor((Date.now() - new Date(String(d).replace(' ', 'T') + (String(d).includes('T') || String(d).includes('Z') ? '' : 'Z')).getTime()) / 86400000) : null);

export const aiEngineStatus = () => {
  const g = geminiStatus();
  return {
    engine: g.configured && !g.lastError ? 'Gemini AI' : g.configured ? 'Built-in rules (Gemini unavailable)' : 'Built-in rules',
    configured: g.configured,
    model: g.model,
    note: g.lastError || (g.configured ? '' : 'Add GEMINI_API_KEY in the server settings for AI-written briefs.')
  };
};

// ----------------------------------------------------------------- context

const buildContext = (lead) => {
  const activities = db.prepare(`SELECT activity_type t, subject, status, date_time d, outcome FROM activities WHERE related_id = ? ORDER BY created_at DESC LIMIT 5`).all(lead.id);
  const outreach = db.prepare(`SELECT step_no, channel, status FROM agent_outreach WHERE lead_id = ? ORDER BY step_no`).all(lead.id);
  const meeting = db.prepare(`SELECT status, slot_start FROM agent_meetings WHERE lead_id = ? ORDER BY created_at DESC LIMIT 1`).get(lead.id);
  const opp = db.prepare(`SELECT id, stage, expected_value FROM opportunities WHERE lead_id = ? ORDER BY created_at DESC LIMIT 1`).get(lead.id);
  const s = scoreLead(lead, getAgentSettings());
  return { lead, activities, outreach, meeting, opp, score: s.score, tier: s.tier, reasons: s.reasons, ageDays: daysSince(lead.created_at), lastTouchDays: daysSince(activities.find((a) => a.status === 'Completed')?.d || null) };
};

// ------------------------------------------------------------------- rules

const draftMessage = (lead) => {
  const name = firstName(lead.contact_name);
  const need = (lead.requirement_summary || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  const owner = lead.owner_name && lead.owner_name !== 'Unassigned' ? lead.owner_name : 'the team';
  if (lead.business_vertical_code === 'XUN') {
    return {
      subject: `${lead.service && lead.service !== 'Other' ? lead.service : 'IT and SAP services'} for ${lead.company_name}`,
      body: `Hi ${name},\n\n${need ? `I understand ${lead.company_name} is looking at: ${need}.` : `I wanted to introduce Xunaris Technology Services.`} We help teams deliver SAP, cloud and application projects with experienced consultants.\n\nCould we speak for 15 minutes this week?\n\nRegards,\n${owner}\nXunaris Technology Services`
    };
  }
  return {
    subject: `Hiring support for ${lead.company_name}`,
    body: `Hi ${name},\n\n${need ? `I saw that ${lead.company_name} is looking at: ${need}.` : `I wanted to introduce HYRA Connect Staffing.`} We place vetted contract and permanent talent, usually with first profiles within 48 hours.\n\nCould we speak for 15 minutes this week?\n\nRegards,\n${owner}\nHYRA Connect Staffing`
  };
};

const ruleBrief = (ctx) => {
  const { lead, score, tier, opp, meeting, lastTouchDays } = ctx;
  const rs = getRoutingSettings();
  const where = [lead.industry && lead.industry !== 'Other' ? lead.industry : '', lead.city].filter(Boolean).join(', ');
  const summary = [
    `${lead.contact_name}${lead.job_title ? `, ${lead.job_title}` : ''} at ${lead.company_name}${where ? ` (${where})` : ''}.`,
    lead.requirement_summary ? `Needs: ${lead.requirement_summary.replace(/\s+/g, ' ').slice(0, 160)}.` : 'No requirement written yet.',
    `Came from ${lead.lead_source || 'an unknown source'}. Score ${score}, ${tier.toLowerCase()}.`
  ].join(' ');

  let nextAction;
  if (lead.lead_status === 'Disqualified') nextAction = 'No action needed. This lead is marked Disqualified.';
  else if (!lead.work_email && !lead.phone) nextAction = `Find an email or phone number for ${firstName(lead.contact_name)}. Check their LinkedIn profile or the company website.`;
  else if (meeting?.status === 'Booked') nextAction = `Prepare for the meeting on ${new Date(meeting.slot_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, then move the lead to Qualified.`;
  else if (lead.lead_status === 'New') nextAction = score >= rs.hot_score
    ? `Hot lead. Contact ${firstName(lead.contact_name)} within ${rs.sla_hours_hot} hours. ${lead.phone ? 'Call first, then email.' : 'Send the email below.'}`
    : `Send a short introduction today. The message below is ready to use.`;
  else if (lead.lead_status === 'Contacted') nextAction = (lastTouchDays ?? ctx.ageDays) >= 3
    ? `No reply for ${lastTouchDays ?? ctx.ageDays} days. Follow up now, by phone if you have a number.`
    : 'Wait for a reply, then follow up if nothing comes in 3 days.';
  else if (lead.lead_status === 'Qualified') nextAction = opp ? `Move the deal ${opp.id} forward. It is at ${opp.stage}.` : 'Create an opportunity and book a discovery call.';
  else nextAction = `Check in again${lead.next_followup_date ? ` on ${lead.next_followup_date}` : ' in a few weeks'}.`;

  return { summary, nextAction, message: draftMessage(lead), engine: 'Built-in rules' };
};

// ------------------------------------------------------------------- Gemini

const aiBrief = async (ctx, companySummary) => {
  const { lead } = ctx;
  const facts = {
    contact: lead.contact_name, jobTitle: lead.job_title, company: lead.company_name, industry: lead.industry, city: lead.city,
    business: lead.business_vertical_code === 'XUN' ? 'Xunaris Technology Services (IT, SAP, cloud services)' : 'HYRA Connect Staffing (contract and permanent staffing)',
    service: lead.service, source: lead.lead_source, requirement: lead.requirement_summary, notes: lead.notes, status: lead.lead_status,
    priority: lead.priority, hasEmail: Boolean(lead.work_email), hasPhone: Boolean(lead.phone), score: ctx.score, scoreReasons: ctx.reasons,
    daysSinceCreated: ctx.ageDays, recentActivities: ctx.activities, outreach: ctx.outreach, meeting: ctx.meeting, opportunity: ctx.opp,
    companyWebsiteSummary: companySummary || null, owner: lead.owner_name
  };
  const out = await askGeminiJson(
    `You help a sales person in India decide what to do with one lead. Use ONLY the facts given. Never invent facts, numbers or promises.\n` +
    `Return JSON: {"summary": "2 short sentences: who they are and what they need", "nextAction": "one clear action for today, one sentence", "message": {"subject": "...", "body": "a friendly email under 90 words, signed by the owner, asking for a 15 minute call"}}.\n` +
    `If email and phone are both missing, nextAction must be to find one. If status is Disqualified, say no action is needed.\n\nFACTS:\n${JSON.stringify(facts)}`
  );
  if (!out || typeof out.summary !== 'string' || typeof out.nextAction !== 'string' || typeof out.message?.body !== 'string') return null;
  return { summary: out.summary.slice(0, 500), nextAction: out.nextAction.slice(0, 300), message: { subject: String(out.message.subject || '').slice(0, 150), body: out.message.body.slice(0, 1200) }, engine: 'Gemini AI' };
};

// -------------------------------------------------------- website lookup

/** Reads the company home page once: a one-line description, and fills a blank website from the email domain. */
const lookupWebsite = async (lead) => {
  let site = (lead.company_website || '').trim();
  if (!site && lead.work_email?.includes('@')) {
    const d = lead.work_email.split('@')[1].toLowerCase();
    if (!FREE_MAIL.includes(d)) site = `https://${d}`;
  }
  if (!site || /example\.(com|org|net)$/i.test(site.replace(/^https?:\/\//, '').replace(/\/.*$/, ''))) return { site: lead.company_website || '', summary: '' };
  try {
    const page = await fetchPage(site);
    const t = extractText(page.html);
    return { site, summary: (t.desc || t.title || '').replace(/\s+/g, ' ').trim().slice(0, 300) };
  } catch {
    return { site, summary: '' };
  }
};

// ----------------------------------------------------------------- refresh

export const refreshLead = async (leadId, { website = true } = {}) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
  if (!lead) throw new Error('Lead not found');

  let companySummary = lead.ai_company_summary || '';
  let site = lead.company_website || '';
  if (website && !companySummary) {
    const w = await lookupWebsite(lead);
    companySummary = w.summary || companySummary;
    if (!site && w.site) site = w.site;
  }

  const ctx = buildContext({ ...lead, company_website: site });
  const brief = (geminiConfigured() ? await aiBrief(ctx, companySummary) : null) || ruleBrief(ctx);
  const message = typeof brief.message === 'string' ? { subject: '', body: brief.message } : brief.message;

  db.prepare(`
    UPDATE leads SET ai_summary = ?, ai_next_action = ?, ai_message = ?, ai_company_summary = ?, ai_engine = ?, ai_updated_at = CURRENT_TIMESTAMP,
      company_website = CASE WHEN COALESCE(company_website, '') = '' THEN ? ELSE company_website END
    WHERE id = ?
  `).run(brief.summary, brief.nextAction, JSON.stringify(message), companySummary, brief.engine, site, leadId);
  return getBrief(leadId);
};

export const getBrief = (leadId) => {
  const l = db.prepare('SELECT id, ai_summary, ai_next_action, ai_message, ai_company_summary, ai_engine, ai_updated_at, company_website FROM leads WHERE id = ?').get(leadId);
  if (!l) return null;
  let message = null;
  try { message = l.ai_message ? JSON.parse(l.ai_message) : null; } catch { message = null; }
  return { leadId: l.id, summary: l.ai_summary || '', nextAction: l.ai_next_action || '', message, companySummary: l.ai_company_summary || '', website: l.company_website || '', engine: l.ai_engine || '', updatedAt: l.ai_updated_at || null };
};

/** Runs on a timer: briefs for open leads that have none, or whose lead changed since. Small batches keep AI use low. */
export const refreshStale = async (limit = 5) => {
  const rows = db.prepare(`
    SELECT id FROM leads
    WHERE lead_status IN ('New','Contacted','Qualified','Nurture')
      AND (ai_updated_at IS NULL OR updated_at > ai_updated_at OR ai_updated_at < datetime('now','-1 day'))
    ORDER BY CASE WHEN ai_updated_at IS NULL THEN 0 ELSE 1 END, created_at DESC LIMIT ?
  `).all(limit);
  let n = 0;
  for (const r of rows) {
    try { await refreshLead(r.id); n++; } catch { /* skip, try again next time */ }
  }
  return n;
};

// -------------------------------------------------------------- duplicates

export const findDuplicates = ({ email, phone, company, excludeId } = {}) => {
  const out = new Map();
  const add = (rows, match) => rows.forEach((r) => {
    if (excludeId && r.id === excludeId) return;
    const prev = out.get(r.id);
    if (!prev || match.strong) out.set(r.id, { id: r.id, company: r.company_name, contact: r.contact_name, owner: r.owner_name, status: r.lead_status, match: match.label, strong: match.strong });
  });
  const e = (email || '').trim().toLowerCase();
  const p = (phone || '').replace(/[^0-9]/g, '');
  const c = (company || '').trim().toLowerCase();
  if (e) add(db.prepare(`SELECT * FROM leads WHERE LOWER(work_email) = ? LIMIT 5`).all(e), { label: 'Same email address', strong: true });
  if (p.length >= 8) add(db.prepare(`SELECT * FROM leads WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone,' ',''),'-',''),'+',''),'(','') LIKE ? LIMIT 5`).all(`%${p.slice(-10)}`), { label: 'Same phone number', strong: true });
  if (c.length >= 3) add(db.prepare(`SELECT * FROM leads WHERE LOWER(company_name) = ? LIMIT 5`).all(c), { label: 'Same company', strong: false });
  return [...out.values()].sort((a, b) => Number(b.strong) - Number(a.strong)).slice(0, 5);
};
