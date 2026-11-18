import db from '../db/database.js';
import { scoreLead, getSettings as getAgentSettings } from './salesAgent.js';
import { createNotification } from './backgroundWorker.js';
import { logAiEvent } from './aiReport.js';

/**
 * Team routing: the CRM acts like a sales manager that knows who is free.
 *  - New leads go to the available Sales Executive with the fewest open leads.
 *  - Hot leads and big deals go to the Sales Head first.
 *  - If the owner is away, or a new lead is not touched within the response time,
 *    it moves to the next available person and the Sales Head is told.
 */

const OPEN = ['New', 'Contacted', 'Qualified', 'Nurture'];
const HEAD_ROLES = ['Sales Head'];
const EXEC_ROLES = ['Sales Executive'];

// ------------------------------------------------------------------ settings

export const getRoutingSettings = () => {
  const r = db.prepare('SELECT * FROM routing_settings WHERE id = 1').get();
  return {
    hot_score: r.hot_score,
    big_deal_value: r.big_deal_value,
    sla_hours_hot: r.sla_hours_hot,
    sla_hours_normal: r.sla_hours_normal,
    max_reassignments: r.max_reassignments
  };
};

export const updateRoutingSettings = (patch) => {
  const cur = getRoutingSettings();
  const n = (v, lo, hi, d) => {
    const x = Number(v);
    return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d;
  };
  const next = {
    hot_score: n(patch.hot_score, 1, 100, cur.hot_score),
    big_deal_value: n(patch.big_deal_value, 0, 1e12, cur.big_deal_value),
    sla_hours_hot: n(patch.sla_hours_hot, 1, 720, cur.sla_hours_hot),
    sla_hours_normal: n(patch.sla_hours_normal, 1, 720, cur.sla_hours_normal),
    max_reassignments: n(patch.max_reassignments, 0, 10, cur.max_reassignments)
  };
  db.prepare(`UPDATE routing_settings SET hot_score = ?, big_deal_value = ?, sla_hours_hot = ?, sla_hours_normal = ?, max_reassignments = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`)
    .run(next.hot_score, next.big_deal_value, next.sla_hours_hot, next.sla_hours_normal, next.max_reassignments);
  return getRoutingSettings();
};

// --------------------------------------------------------------------- people

/** Team role, with a sensible default for users created before roles existed. */
export const teamRoleOf = (u) => {
  if (u.team_role) return u.team_role;
  if (u.role === 'ADMIN') return 'Admin';
  if (u.function_access === 'Marketing') return 'Marketing';
  return 'Sales Executive';
};

/** Away ends by itself on the return date. */
export const effectiveAvailability = (u) => {
  const status = u.availability || 'Available';
  if (status === 'Away' && u.away_until) {
    const until = new Date(`${String(u.away_until).slice(0, 10)}T23:59:59`);
    if (!Number.isNaN(until.getTime()) && until.getTime() < Date.now()) return 'Available';
  }
  return status;
};

export const openLeadCount = (email) => db.prepare(
  `SELECT COUNT(*) c FROM leads WHERE LOWER(owner_email) = LOWER(?) AND lead_status IN (${OPEN.map(() => '?').join(',')})`
).get(email || '', ...OPEN).c;

export const listTeam = () => {
  const rows = db.prepare(`SELECT id, name, email, role, function_access, team_role, availability, away_until, availability_note FROM users WHERE status = 'Active' ORDER BY name`).all();
  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    teamRole: teamRoleOf(u),
    availability: effectiveAvailability(u),
    awayUntil: u.away_until || null,
    note: u.availability_note || '',
    openLeads: openLeadCount(u.email)
  }));
};

export const setAvailability = (userId, { status, awayUntil, note }) => {
  if (!['Available', 'Busy', 'Away'].includes(status)) throw new Error('Status must be Available, Busy or Away.');
  const until = status === 'Away' && awayUntil ? String(awayUntil).slice(0, 10) : null;
  db.prepare(`UPDATE users SET availability = ?, away_until = ?, availability_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(status, until, String(note || '').slice(0, 120), userId);
};

export const setTeamRole = (userId, teamRole) => {
  if (!['Admin', 'Sales Head', 'Sales Executive', 'Marketing'].includes(teamRole)) throw new Error('Invalid team role.');
  db.prepare(`UPDATE users SET team_role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(teamRole, userId);
};

// ------------------------------------------------------------------- routing

const pickFrom = (roles, excludeEmail) => {
  const pool = listTeam().filter((p) => roles.includes(p.teamRole) && p.availability === 'Available' && p.email.toLowerCase() !== String(excludeEmail || '').toLowerCase());
  pool.sort((a, b) => a.openLeads - b.openLeads || a.name.localeCompare(b.name));
  return pool[0] || null;
};

/** Hot leads: Sales Head first. Others: Sales Executive first. Falls back to the other group, then nobody. */
export const pickOwner = ({ hot, excludeEmail } = {}) => {
  const order = hot ? [HEAD_ROLES, EXEC_ROLES] : [EXEC_ROLES, HEAD_ROLES];
  for (const roles of order) {
    const p = pickFrom(roles, excludeEmail);
    if (p) return p;
  }
  return null;
};

/** Score a lead row (or a request body shaped like one) with the same scoring the Sales Agent uses. */
export const scoreRow = (lead) => {
  try { return scoreLead(lead, getAgentSettings()).score; } catch { return 0; }
};

export const isHotRow = (lead) => scoreRow(lead) >= getRoutingSettings().hot_score;

/** Used when a lead is created without a chosen owner. Returns { ownerName, ownerEmail, reason }. */
export const routeNewLead = (leadLike) => {
  const hot = isHotRow(leadLike);
  const person = pickOwner({ hot });
  if (!person) return { ownerName: 'Unassigned', ownerEmail: '', reason: 'No one is available. Waiting in the Sales Head queue.' };
  logAiEvent('lead_routed');
  const reason = hot
    ? (person.teamRole === 'Sales Head' ? 'Hot lead, sent to the Sales Head' : 'Hot lead, no Sales Head free, sent to the least busy teammate')
    : (person.teamRole === 'Sales Head' ? 'No executive free, sent to the Sales Head' : 'Sent to the least busy available teammate');
  return { ownerName: person.name, ownerEmail: person.email, reason };
};

export const logRouting = (leadId, from, to, reason) => {
  db.prepare(`INSERT INTO lead_routing_log (lead_id, from_owner, to_owner, reason) VALUES (?, ?, ?, ?)`).run(leadId, from || '', to || '', reason);
};

const notifyHeads = (title, message) => {
  for (const p of listTeam().filter((t) => ['Sales Head', 'Admin'].includes(t.teamRole))) {
    createNotification(p.email, title, message, 'warning');
  }
};

/** Runs every few minutes: moves untouched or orphaned leads to the next available person. */
export const reassignStaleLeads = () => {
  const s = getRoutingSettings();
  const people = new Map(listTeam().map((p) => [p.email.toLowerCase(), p]));
  const leads = db.prepare(`SELECT * FROM leads WHERE lead_status = 'New'`).all();
  let moved = 0;
  for (const lead of leads) {
    const owner = people.get((lead.owner_email || '').toLowerCase());
    const hot = isHotRow(lead);
    const ageHours = (Date.now() - new Date(String(lead.created_at).replace(' ', 'T') + 'Z').getTime()) / 3600000;
    const sla = hot ? s.sla_hours_hot : s.sla_hours_normal;
    // Away takes existing new leads away; Busy only stops new leads arriving
    const ownerGone = !owner || owner.availability === 'Away';
    const late = ageHours >= sla;
    if (!ownerGone && !late) continue;

    const times = db.prepare(`SELECT COUNT(*) c FROM lead_routing_log WHERE lead_id = ? AND reason LIKE 'Reassigned%'`).get(lead.id).c;
    if (times >= s.max_reassignments) continue;
    const next = pickOwner({ hot, excludeEmail: lead.owner_email });
    const why = ownerGone ? (owner ? `${owner.name} is away` : 'It had no owner') : `Not contacted within ${sla} hours`;
    if (!next) {
      if (late && times === 0) {
        notifyHeads('Lead needs attention', `${lead.company_name} (${lead.contact_name}) is waiting and nobody is available. ${why}.`);
        logRouting(lead.id, lead.owner_name, '', `Needs attention: ${why}. Nobody available.`);
      }
      continue;
    }
    db.prepare(`UPDATE leads SET owner_name = ?, owner_email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(next.name, next.email, lead.id);
    logRouting(lead.id, lead.owner_name, next.name, `Reassigned: ${why}.`);
    logAiEvent('lead_reassigned', { ref: lead.id });
    if (owner) createNotification(owner.email, 'Lead moved', `${lead.company_name} was moved to ${next.name}. ${why}.`, 'info');
    createNotification(next.email, 'New lead for you', `${lead.company_name} (${lead.contact_name}) was assigned to you. ${why}.`, 'success');
    if (lead.owner_email !== next.email) notifyHeads('Lead reassigned', `${lead.company_name} moved from ${lead.owner_name || 'nobody'} to ${next.name}. ${why}.`);
    moved++;
  }
  return moved;
};

/** Gives users created before roles existed a team role, once. */
export const ensureTeamDefaults = () => {
  db.prepare(`UPDATE users SET team_role = CASE WHEN role = 'ADMIN' THEN 'Admin' WHEN function_access = 'Marketing' THEN 'Marketing' ELSE 'Sales Executive' END WHERE team_role IS NULL`).run();
};

/** Called when a deal is created: a deal at or above the big-deal value is flagged to the Sales Head. */
export const notifyBigDeal = (opp) => {
  const s = getRoutingSettings();
  if (Number(opp.expected_value) >= s.big_deal_value) {
    notifyHeads('Big deal created', `${opp.title} for ${opp.company_name} (INR ${Number(opp.expected_value).toLocaleString('en-IN')}) is owned by ${opp.owner_name}.`);
  }
};

// ------------------------------------------------------------------- Today

const todayStr = () => new Date().toISOString().slice(0, 10);

export const buildToday = (user) => {
  const s = getRoutingSettings();
  const team = listTeam();
  const me = team.find((p) => p.id === user.id) || { teamRole: 'Sales Executive', availability: 'Available', openLeads: 0, note: '', awayUntil: null };
  const isHead = ['Sales Head', 'Admin'].includes(me.teamRole);
  const mine = (v) => String(v || '').toLowerCase() === user.email.toLowerCase();

  const leadRows = db.prepare(`SELECT * FROM leads WHERE lead_status IN ('New','Contacted','Qualified','Nurture') ORDER BY created_at DESC LIMIT 500`).all();
  const scored = leadRows.map((l) => {
    const score = scoreRow(l);
    const ageHours = (Date.now() - new Date(String(l.created_at).replace(' ', 'T') + 'Z').getTime()) / 3600000;
    const hot = score >= s.hot_score;
    const sla = hot ? s.sla_hours_hot : s.sla_hours_normal;
    return {
      id: l.id, company: l.company_name, contact: l.contact_name, title: l.job_title, status: l.lead_status,
      vertical: l.business_vertical_code, source: l.lead_source, owner: l.owner_name || 'Unassigned', ownerEmail: l.owner_email || '',
      score, hot, ageHours: Math.round(ageHours), slaHours: sla, overdue: l.lead_status === 'New' && ageHours >= sla,
      requirement: (l.requirement_summary || '').slice(0, 140),
      nextAction: l.ai_next_action || ''
    };
  });
  const visible = isHead ? scored : scored.filter((l) => mine(l.ownerEmail));

  const unassigned = scored.filter((l) => !l.ownerEmail && l.status === 'New');
  const hot = visible.filter((l) => l.hot && l.status !== 'Nurture').sort((a, b) => b.score - a.score).slice(0, 8);
  const toContact = visible.filter((l) => l.status === 'New').sort((a, b) => Number(b.overdue) - Number(a.overdue) || b.score - a.score).slice(0, 10);
  const overdue = visible.filter((l) => l.overdue).sort((a, b) => b.ageHours - a.ageHours).slice(0, 8);

  const acts = db.prepare(`SELECT * FROM activities WHERE status = 'Planned' ORDER BY date_time ASC LIMIT 300`).all();
  const t = todayStr();
  const myActs = acts.filter((a) => isHead || String(a.assigned_to || '').toLowerCase() === user.name.toLowerCase());
  const followUps = myActs.filter((a) => a.activity_type !== 'Meeting' && String(a.date_time).slice(0, 10) <= t).slice(0, 10)
    .map((a) => ({ id: a.id, type: a.activity_type, subject: a.subject, relatedTo: a.related_to, when: a.date_time, late: String(a.date_time).slice(0, 10) < t, assignedTo: a.assigned_to }));
  const meetings = myActs.filter((a) => a.activity_type === 'Meeting' && String(a.date_time).slice(0, 10) === t)
    .map((a) => ({ id: a.id, subject: a.subject, relatedTo: a.related_to, when: a.date_time, assignedTo: a.assigned_to }));

  const deals = db.prepare(`SELECT * FROM opportunities WHERE stage NOT IN ('Won','Lost') AND expected_value >= ? ORDER BY expected_value DESC LIMIT 8`).all(s.big_deal_value)
    .filter((o) => isHead || String(o.owner_name || '').toLowerCase() === user.name.toLowerCase())
    .map((o) => ({ id: o.id, title: o.title, company: o.company_name, stage: o.stage, value: o.expected_value, owner: o.owner_name }));

  const feed = isHead
    ? db.prepare(`SELECT r.*, l.company_name FROM lead_routing_log r LEFT JOIN leads l ON l.id = r.lead_id ORDER BY r.id DESC LIMIT 8`).all()
    : db.prepare(`SELECT r.*, l.company_name FROM lead_routing_log r LEFT JOIN leads l ON l.id = r.lead_id WHERE r.to_owner = ? OR r.from_owner = ? ORDER BY r.id DESC LIMIT 5`).all(user.name, user.name);

  return {
    me: { id: user.id, name: user.name, email: user.email, teamRole: me.teamRole, availability: me.availability, awayUntil: me.awayUntil, note: me.note, isHead },
    settings: s,
    counts: { hot: hot.length, toContact: toContact.length, overdue: overdue.length, unassigned: isHead ? unassigned.length : 0, followUps: followUps.length, meetings: meetings.length, bigDeals: deals.length },
    hot, toContact, overdue, unassigned: isHead ? unassigned.slice(0, 8) : [], followUps, meetings, deals,
    team: team.filter((p) => ['Sales Head', 'Sales Executive'].includes(p.teamRole)),
    feed: feed.map((f) => ({ lead: f.company_name || f.lead_id, from: f.from_owner, to: f.to_owner, reason: f.reason, at: f.created_at }))
  };
};
