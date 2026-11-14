import db from '../db/database.js';
import { askGeminiJson, geminiConfigured } from './gemini.js';
import { scoreLead, getSettings as getAgentSettings, isSuppressed } from './salesAgent.js';

/**
 * Campaign AI: from one line describing the goal, it writes the campaign (name, three subject lines,
 * the email and the button text) and chooses who should get it from the CRM: best-fit leads first,
 * leaving out people with no email, people on the do-not-contact list, existing clients, and anyone
 * emailed in the last 14 days. Uses Gemini when GEMINI_API_KEY is set, otherwise built-in templates.
 * It only prepares the campaign. A person still reviews it and presses Launch.
 */

const OPT_OUT = '\n\nIf this is not relevant, reply "unsubscribe" and we will not contact you again.';
const STOP = new Set(['with', 'that', 'this', 'from', 'your', 'have', 'will', 'about', 'into', 'for', 'and', 'the', 'our', 'are', 'who', 'new', 'send', 'email', 'campaign', 'introduce', 'companies', 'company', 'clients', 'client']);

const BUSINESS = {
  HYRA: {
    code: 'HYRA', label: 'HYRA Connect', template: 'tmpl_hyra_workforce',
    about: 'HYRA Connect Staffing: vetted contract and permanent talent, first profiles usually within 48 hours',
    sign: 'HYRA Connect Staffing', cta: 'Talk to our team'
  },
  XUN: {
    code: 'XUN', label: 'Xunaris', template: 'tmpl_xunaris_enterprise',
    about: 'Xunaris Technology Services: SAP, cloud and application delivery with experienced consultants',
    sign: 'Xunaris Technology Services', cta: 'Book a 15-minute call'
  }
};
const pick = (business) => (String(business).toLowerCase().startsWith('x') ? BUSINESS.XUN : BUSINESS.HYRA);

const keywordsOf = (goal) => [...new Set(String(goal || '').toLowerCase().match(/[a-z0-9+#.]{4,}/g) || [])].filter((w) => !STOP.has(w)).slice(0, 12);
const hay = (l) => `${l.industry || ''} ${l.city || ''} ${l.service || ''} ${l.requirement_summary || ''} ${l.job_title || ''} ${l.company_name || ''}`.toLowerCase();

// ------------------------------------------------------------------ audience

export const pickAudience = ({ business, goal, limit = 50 }) => {
  const b = pick(business);
  const leads = db.prepare(`SELECT * FROM leads WHERE business_vertical_code = ? AND lead_status IN ('New','Contacted','Qualified','Nurture')`).all(b.code);
  const closed = db.prepare(`SELECT COUNT(*) c FROM leads WHERE business_vertical_code = ? AND lead_status = 'Disqualified'`).get(b.code).c;
  const recent = new Set(db.prepare(`SELECT DISTINCT LOWER(recipient_email) e FROM campaign_delivery_logs WHERE sent_at >= datetime('now','-14 day') AND status IN ('Sent','Delivered','Queued')`).all().map((r) => r.e));
  const words = keywordsOf(goal);
  const settings = getAgentSettings();

  const left = { noEmail: 0, doNotContact: 0, recentlyEmailed: 0, duplicate: 0, disqualified: closed, notMatching: 0 };
  const seen = new Set();
  const chosen = [];
  for (const l of leads) {
    const email = (l.work_email || '').trim().toLowerCase();
    if (!email) { left.noEmail++; continue; }
    if (isSuppressed(l)) { left.doNotContact++; continue; }
    if (recent.has(email)) { left.recentlyEmailed++; continue; }
    if (seen.has(email)) { left.duplicate++; continue; }
    seen.add(email);
    const s = scoreLead(l, settings);
    const text = hay(l);
    const matched = words.filter((w) => text.includes(w));
    chosen.push({
      id: l.id, company: l.company_name, contact: l.contact_name, title: l.job_title || '', email, score: s.score,
      matchedCount: matched.length,
      rank: s.score + matched.length * 8,
      why: matched.length ? `Matches your goal: ${matched.slice(0, 3).join(', ')}` : (s.reasons[0] || 'Reachable lead')
    });
  }
  chosen.sort((a, b2) => b2.rank - a.rank);
  // Relevance first: if some leads match the goal, only they are chosen; the rest are counted and left out
  const matchedOnes = chosen.filter((c) => c.matchedCount > 0);
  const useMatched = words.length > 0 && matchedOnes.length > 0;
  const pool = useMatched ? matchedOnes : chosen;
  left.notMatching = useMatched ? chosen.length - matchedOnes.length : 0;
  const top = pool.slice(0, Math.min(200, Math.max(1, limit)));
  return {
    total: pool.length,
    noMatch: words.length > 0 && matchedOnes.length === 0 && chosen.length > 0,
    selected: top.length,
    leadIds: top.map((c) => c.id),
    leads: top.slice(0, 12).map(({ id, company, contact, title, score, why }) => ({ id, company, contact, title, score, why })),
    left
  };
};

// ---------------------------------------------------------------------- copy

const shortGoal = (goal) => {
  const g = String(goal || '').replace(/\s+/g, ' ').trim().replace(/[.!]+$/, '');
  return g.length > 90 ? `${g.slice(0, 87)}...` : g;
};

const ruleCopy = ({ goal, b }) => {
  const g = shortGoal(goal);
  const lower = g.charAt(0).toLowerCase() + g.slice(1);
  const body = b.code === 'XUN'
    ? `Hi {{contact_name}},\n\nI am reaching out about ${lower}. At ${b.sign} we help teams like {{company_name}} deliver SAP, cloud and application projects with experienced consultants, without long hiring cycles.\n\nWould a 15-minute call this week be useful?\n\nRegards,\n${b.sign}`
    : `Hi {{contact_name}},\n\nI am reaching out about ${lower}. At ${b.sign} we place vetted contract and permanent talent for teams like {{company_name}}, usually sharing first profiles within 48 hours.\n\nWould a 15-minute call this week be useful?\n\nRegards,\n${b.sign}`;
  return {
    engine: 'Built-in templates',
    name: `${b.label}: ${g.slice(0, 50)}`,
    subjects: b.code === 'XUN'
      ? [`${g.slice(0, 48)} for {{company_name}}`, 'SAP and cloud delivery support for {{company_name}}', 'A quick question for {{contact_name}}']
      : [`Hiring support for {{company_name}}`, `${g.slice(0, 48)}: {{company_name}}`, 'Quick question about hiring at {{company_name}}'],
    body: body + OPT_OUT,
    ctaText: b.cta
  };
};

const aiCopy = async ({ goal, b, audience }) => {
  const sample = audience.leads.slice(0, 6).map((l) => `${l.title || 'contact'} at ${l.company}`);
  const out = await askGeminiJson(
    `You write B2B outreach for a sales team in India. Business: ${b.about}.\n` +
    `Goal of this campaign: ${goal}\nTypical recipients: ${sample.join('; ') || 'business decision makers'}\n\n` +
    `Rules: use only the facts above, never invent clients, numbers, awards or promises. Friendly, specific, no hype, no spammy words. ` +
    `The email must be under 110 words, use the tags {{contact_name}} and {{company_name}} exactly, have one clear ask (a 15 minute call), and end with a sign-off from "${b.sign}". ` +
    `Subject lines under 60 characters.\n` +
    `Return JSON: {"name": "short campaign name", "subjects": ["subject 1", "subject 2", "subject 3"], "body": "the email", "ctaText": "button text under 5 words"}`
  );
  if (!out || typeof out.body !== 'string' || !Array.isArray(out.subjects)) return null;
  const subjects = out.subjects.map((s) => String(s).trim()).filter(Boolean).slice(0, 3);
  if (subjects.length < 2 || out.body.length < 40) return null;
  let body = out.body.trim().slice(0, 1500);
  if (!body.includes('{{contact_name}}')) body = `Hi {{contact_name}},\n\n${body}`;
  if (!/unsubscribe/i.test(body)) body += OPT_OUT;
  return { engine: 'Gemini AI', name: String(out.name || '').trim().slice(0, 80) || `${b.label}: ${shortGoal(goal).slice(0, 50)}`, subjects, body, ctaText: String(out.ctaText || b.cta).trim().slice(0, 40) };
};

// ---------------------------------------------------------------------- plan

export const planCampaign = async ({ goal, business }) => {
  const g = String(goal || '').trim();
  if (g.length < 8) throw new Error('Describe the campaign in a sentence, for example: "Introduce contract staffing to banks in Pune".');
  const b = pick(business);
  const audience = pickAudience({ business, goal: g });
  const copy = (geminiConfigured() ? await aiCopy({ goal: g, b, audience }) : null) || ruleCopy({ goal: g, b });

  const notes = [];
  if (audience.selected === 0) notes.push('No leads qualify yet. Add leads with an email address, then plan again.');
  const l = audience.left;
  if (audience.noMatch) notes.push('No lead matches the words in your goal, so the best-scoring leads were chosen. Check the list before you launch.');
  if (l.notMatching) notes.push(`${l.notMatching} eligible lead${l.notMatching === 1 ? '' : 's'} left out: they do not match your goal.`);
  if (l.noEmail) notes.push(`${l.noEmail} lead${l.noEmail === 1 ? '' : 's'} left out: no email address.`);
  if (l.doNotContact) notes.push(`${l.doNotContact} left out: on the do-not-contact list or already clients.`);
  if (l.recentlyEmailed) notes.push(`${l.recentlyEmailed} left out: emailed in the last 14 days.`);
  if (l.duplicate) notes.push(`${l.duplicate} left out: duplicate email.`);

  return {
    ...copy,
    business: b.label,
    templateId: b.template,
    audience,
    notes,
    sendAdvice: 'Send Tuesday to Thursday, between 10:00 and 11:30 IST. Avoid Monday mornings and Friday afternoons. Review the email and the list, then press Launch.'
  };
};

// ------------------------------------------------------------ after sending

/** Plain-language results for the most recent campaigns, with what to do next. */
export const campaignSummaries = (limit = 3) => {
  const camps = db.prepare(`SELECT campaign_id, MAX(campaign_name) name, MIN(sent_at) first_at, COUNT(*) total,
      SUM(CASE WHEN status IN ('Sent','Delivered') THEN 1 ELSE 0 END) delivered,
      SUM(CASE WHEN status IN ('Failed','Bounced') THEN 1 ELSE 0 END) failed
    FROM campaign_delivery_logs GROUP BY campaign_id ORDER BY MAX(sent_at) DESC LIMIT ?`).all(limit);
  return camps.map((c) => {
    const bad = db.prepare(`SELECT recipient_email e, error_message m FROM campaign_delivery_logs WHERE campaign_id = ? AND status IN ('Failed','Bounced') LIMIT 5`).all(c.campaign_id);
    const rate = c.total ? Math.round((c.delivered / c.total) * 100) : 0;
    const daysAgo = Math.floor((Date.now() - new Date(String(c.first_at).replace(' ', 'T') + 'Z').getTime()) / 86400000);
    const advice = [];
    if (c.failed > 0) advice.push(`${c.failed} email${c.failed === 1 ? '' : 's'} did not arrive. Check these addresses and fix or remove them${bad[0]?.m ? ` (first error: ${String(bad[0].m).slice(0, 80)})` : ''}.`);
    if (rate < 90 && c.total >= 10) advice.push('Fewer than 9 in 10 arrived. Check the sender account is verified and the list is clean before the next send.');
    advice.push(daysAgo >= 3
      ? 'It has been 3 days or more. Follow up with the people who have not replied, and mark replies on their leads.'
      : 'Give it 3 days, then follow up with the people who have not replied. Mark replies on their leads so the CRM knows.');
    advice.push('Replies are not read automatically yet, so open the lead and press "They replied" when someone answers.');
    return { campaignId: c.campaign_id, name: c.name, sent: c.total, delivered: c.delivered, failed: c.failed, deliveredPct: rate, failedAddresses: bad.map((x) => x.e), daysAgo, advice };
  });
};
