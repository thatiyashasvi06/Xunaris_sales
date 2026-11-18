import db from '../db/database.js';

/**
 * "Time saved by AI": every time the CRM does a piece of work that a person would otherwise do,
 * it records one event. The report multiplies the counts by a minutes-per-task figure that the
 * team can change. The result is an ESTIMATE of time not spent, not a measured stopwatch.
 */

export const TASKS = {
  lead_brief: { label: 'Lead briefs and next steps written', minutes: 4, hint: 'Reading the lead and deciding what to do next' },
  website_lookup: { label: 'Company websites read', minutes: 3, hint: 'Looking the company up before contacting them' },
  lead_routed: { label: 'Leads given to the right person', minutes: 2, hint: 'Deciding who gets the lead and assigning it' },
  lead_reassigned: { label: 'Leads moved when the owner was away or slow', minutes: 3, hint: 'Noticing and moving the lead by hand' },
  sequence_drafted: { label: 'Outreach sequences drafted', minutes: 12, hint: 'Writing an email, a LinkedIn message and a follow-up' },
  message_sent: { label: 'Emails sent from approved drafts', minutes: 1, hint: 'Copying, sending and logging each email' },
  campaign_plan: { label: 'Campaigns written and audiences chosen', minutes: 45, hint: 'Writing the copy, choosing and cleaning the list' },
  icp_built: { label: 'Ideal customer profiles written', minutes: 20, hint: 'Working out who you sell to from your website' }
};

// Defaults for minutes per task (kept in the database so the team can change them)
const ensureDefaults = () => {
  const ins = db.prepare('INSERT OR IGNORE INTO ai_time_settings (type, minutes) VALUES (?, ?)');
  for (const [type, t] of Object.entries(TASKS)) ins.run(type, t.minutes);
};
ensureDefaults();

/** Record one piece of work done by the CRM. Never throws: reporting must not break the real work. */
export const logAiEvent = (type, { engine = '', ref = '' } = {}) => {
  try {
    if (!TASKS[type]) return;
    db.prepare('INSERT INTO ai_events (type, engine, ref) VALUES (?, ?, ?)').run(type, engine || '', String(ref || '').slice(0, 60));
  } catch { /* ignore */ }
};

export const getMinutes = () => {
  const out = {};
  for (const r of db.prepare('SELECT type, minutes FROM ai_time_settings').all()) out[r.type] = r.minutes;
  for (const [type, t] of Object.entries(TASKS)) if (out[type] === undefined) out[type] = t.minutes;
  return out;
};

export const updateMinutes = (patch) => {
  const up = db.prepare('INSERT INTO ai_time_settings (type, minutes) VALUES (?, ?) ON CONFLICT(type) DO UPDATE SET minutes = excluded.minutes');
  for (const [type, v] of Object.entries(patch || {})) {
    if (!TASKS[type]) continue;
    const m = Number(v);
    if (Number.isFinite(m) && m >= 0 && m <= 600) up.run(type, m);
  }
  return getMinutes();
};

const DAY = 86400000;
const sqlTime = (ms) => new Date(ms).toISOString().replace('T', ' ').slice(0, 19);

export const getAiReport = (days = 30) => {
  const span = Math.min(365, Math.max(1, Number(days) || 30));
  const since = sqlTime(Date.now() - span * DAY);
  const minutes = getMinutes();

  const counts = db.prepare('SELECT type, COUNT(*) c, SUM(CASE WHEN engine IN (\'Gemini AI\', \'Claude AI\') THEN 1 ELSE 0 END) ai FROM ai_events WHERE created_at >= ? GROUP BY type').all(since);
  const byType = Object.fromEntries(counts.map((r) => [r.type, r]));

  const rows = Object.entries(TASKS).map(([type, t]) => {
    const c = byType[type]?.c || 0;
    return { type, label: t.label, hint: t.hint, count: c, byAi: byType[type]?.ai || 0, minutesEach: minutes[type], minutes: Math.round(c * minutes[type]) };
  });
  const totalMinutes = rows.reduce((n, r) => n + r.minutes, 0);

  // Last 4 weeks, Monday to Sunday, for the bars
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const weeks = [];
  for (let i = 3; i >= 0; i--) {
    const from = monday.getTime() - i * 7 * DAY;
    const w = db.prepare('SELECT type, COUNT(*) c FROM ai_events WHERE created_at >= ? AND created_at < ? GROUP BY type').all(sqlTime(from), sqlTime(from + 7 * DAY));
    const m = w.reduce((n, r) => n + r.c * (minutes[r.type] || 0), 0);
    const d0 = new Date(from);
    const startLabel = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, '0')}-${String(d0.getDate()).padStart(2, '0')}`;
    weeks.push({ start: startLabel, actions: w.reduce((n, r) => n + r.c, 0), minutes: Math.round(m) });
  }

  const first = db.prepare('SELECT MIN(created_at) f FROM ai_events').get().f;
  return {
    days: span,
    totalMinutes,
    hours: Math.round((totalMinutes / 60) * 10) / 10,
    actions: rows.reduce((n, r) => n + r.count, 0),
    rows,
    weeks,
    countingSince: first || null,
    note: 'This is an estimate: the number of things the CRM did, times the minutes each would take a person. Change the minutes to match your team.'
  };
};
