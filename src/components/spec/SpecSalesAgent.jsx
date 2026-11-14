import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SpecHeader } from './SpecHeader';
import { apiClient } from '../../services/apiClient';
import {
  Bot, Play, RefreshCw, Target, Users, Send, TrendingUp, Check, X, Mail, MessageSquare,
  CalendarCheck, Power, ShieldCheck, Pencil, Reply, Sparkles
} from 'lucide-react';

const api = (path, opts) => apiClient.request(`/sales-agent${path}`, opts);

const TIER_STYLE = {
  Hot: 'bg-rose-100 text-rose-700 border-rose-200',
  Warm: 'bg-amber-100 text-amber-700 border-amber-200',
  Cool: 'bg-sky-100 text-sky-700 border-sky-200',
  Cold: 'bg-slate-100 text-slate-600 border-slate-200'
};
const STATUS_STYLE = {
  'Pending Approval': 'bg-amber-100 text-amber-700',
  Approved: 'bg-blue-100 text-blue-700',
  Sent: 'bg-emerald-100 text-emerald-700',
  'Task Created': 'bg-indigo-100 text-indigo-700',
  Replied: 'bg-teal-100 text-teal-700',
  Skipped: 'bg-slate-100 text-slate-500',
  Failed: 'bg-red-100 text-red-700'
};

const fmt = (iso) => new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const Card = ({ n, title, accent, icon: Icon, children, right }) => (
  <section className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
    <header className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-orange-50 text-orange-600 border border-orange-100">{n}/4</span>
        <div>
          <h2 className="text-sm font-extrabold text-[#0d2238] flex items-center gap-2">
            <Icon className="w-4 h-4 text-orange-500" /> {title}
          </h2>
          <p className="text-xs font-semibold text-orange-600">{accent}</p>
        </div>
      </div>
      {right}
    </header>
    <div className="p-5">{children}</div>
  </section>
);

const Stat = ({ label, value }) => (
  <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
    <div className="text-xl font-extrabold text-[#0d2238]">{value}</div>
    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
  </div>
);

export const SpecSalesAgent = () => {
  const [data, setData] = useState(null);
  const [prospects, setProspects] = useState([]);
  const [outreach, setOutreach] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('Pending Approval');
  const [industries, setIndustries] = useState('');
  const [titles, setTitles] = useState('');

  const load = useCallback(async () => {
    try {
      const [o, p, out] = await Promise.all([api('/overview'), api('/prospects?limit=30'), api('/outreach')]);
      setData(o);
      setProspects(p);
      setOutreach(out);
      setIndustries((v) => v || o.settings.target_industries.join(', '));
      setTitles((v) => v || o.settings.target_titles.join(', '));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const act = async (fn, okMsg) => {
    setBusy(true); setMsg(''); setError('');
    try { const r = await fn(); if (okMsg) setMsg(typeof okMsg === 'function' ? okMsg(r) : okMsg); await load(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const saveSettings = (patch, okMsg = 'Settings saved') =>
    act(() => api('/settings', { method: 'PUT', body: patch }), okMsg);

  const split = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

  const shown = useMemo(() => (filter === 'All' ? outreach : outreach.filter((o) => o.status === filter)), [outreach, filter]);

  const meetingsByDay = useMemo(() => {
    const g = {};
    (data?.meetings || []).forEach((m) => {
      const k = new Date(m.slot_start).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
      (g[k] = g[k] || []).push(m);
    });
    return g;
  }, [data]);

  if (!data) {
    return (
      <div>
        <SpecHeader title="Sales Agent" subtitle="Loading your HYRA Connect sales agent..." />
        {error && <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
      </div>
    );
  }

  const { settings, overview, weekly, insights } = data;
  const maxWeek = Math.max(1, ...weekly.map((w) => Math.max(w.sent, w.replies, w.meetings)));

  return (
    <div className="space-y-6">
      <SpecHeader
        title="Sales Agent"
        subtitle="Your sales agent runs 24/7: finds and scores leads, reaches the right people, books meetings, and gets better every week."
      />

      {/* Control bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => saveSettings({ enabled: !settings.enabled }, settings.enabled ? 'Agent paused' : 'Agent is running')}
            disabled={busy}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border ${settings.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}
          >
            <Power className="w-4 h-4" /> {settings.enabled ? 'Agent ON' : 'Agent OFF'}
          </button>
          <button
            onClick={() => act(() => api('/run', { method: 'POST' }), (r) => `Run complete: ${r.scored ?? 0} leads scored, ${r.drafted ?? 0} sequences drafted, ${r.sent ?? 0} emails sent`)}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-[#0063f2] text-white hover:bg-[#0050c7] disabled:opacity-60"
          >
            {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Run now
          </button>
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
            <ShieldCheck className="w-4 h-4 text-slate-400" /> Sending
            <select
              value={settings.mode}
              onChange={(e) => saveSettings({ mode: e.target.value })}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white"
            >
              <option value="approval">Needs my approval (recommended)</option>
              <option value="auto">Automatic</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
            Emails/day
            <input
              type="number" min="1" max="200" defaultValue={settings.daily_send_limit}
              onBlur={(e) => Number(e.target.value) !== settings.daily_send_limit && saveSettings({ daily_send_limit: Number(e.target.value) })}
              className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
            />
          </label>
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
            Min score
            <input
              type="number" min="0" max="100" defaultValue={settings.min_score}
              onBlur={(e) => Number(e.target.value) !== settings.min_score && saveSettings({ min_score: Number(e.target.value) })}
              className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
            />
          </label>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-slate-500">
            Target industries (comma separated, blank = IT, healthcare, BFSI, manufacturing and more)
            <input value={industries} onChange={(e) => setIndustries(e.target.value)}
              onBlur={() => saveSettings({ target_industries: split(industries) })}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-normal text-slate-800" placeholder="IT, Healthcare, BFSI" />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Extra target titles (comma separated)
            <input value={titles} onChange={(e) => setTitles(e.target.value)}
              onBlur={() => saveSettings({ target_titles: split(titles) })}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-normal text-slate-800" placeholder="Head of Talent, Hiring Manager" />
          </label>
        </div>
        {msg && <div className="text-sm font-semibold text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{msg}</div>}
        {error && <div className="text-sm font-semibold text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
        <p className="text-[11px] text-slate-400">
          Last run: {settings.last_run_at ? fmt(settings.last_run_at.replace(' ', 'T') + 'Z') : 'never'}. Emails go out Mon-Sat, 9:00-18:00 IST, within the daily limit.
          LinkedIn steps become tasks for the lead owner because LinkedIn does not allow automated sending.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Stat label="Leads scored" value={overview.scored} />
        <Stat label="Hot leads" value={overview.hot} />
        <Stat label="Awaiting approval" value={overview.pending_approval} />
        <Stat label="Emails sent today" value={overview.sent_today} />
        <Stat label="Replies" value={overview.replies} />
        <Stat label="Meetings booked" value={overview.meetings_booked} />
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        {/* 1/4 Finds & scores */}
        <Card n={1} title="Finds & scores your best leads first" accent="Highest chance to convert at the top" icon={Target}>
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {prospects.length === 0 && <p className="text-sm text-slate-500">No HYRA leads above the minimum score yet. Add leads or lower the minimum score, then press Run now.</p>}
            {prospects.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200">
                <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center font-extrabold text-[#0d2238]">{p.score}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-[#0d2238] truncate">{p.company_name}</div>
                  <div className="text-xs text-slate-500 truncate">{p.reasons.slice(0, 3).join(' · ') || 'Basic fit'}</div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${TIER_STYLE[p.tier]}`}>{p.tier}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* 2/4 Right prospects */}
        <Card n={2} title="The right prospects, not just more leads" accent="Decision-makers you can actually reach" icon={Users}>
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {prospects.filter((p) => p.work_email && p.features.some((f) => f.startsWith('title:decision') || f.startsWith('title:hr'))).slice(0, 15).map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                <div className="w-9 h-9 rounded-full bg-[#0d2238] text-white flex items-center justify-center text-xs font-bold">
                  {(p.contact_name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-[#0d2238] truncate">{p.contact_name}</div>
                  <div className="text-xs text-slate-500 truncate">{p.job_title || 'Contact'} · {p.company_name}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  {p.meeting_status === 'Booked' && <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-emerald-100 text-emerald-700">Meeting</span>}
                  {p.replied > 0 && <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-teal-100 text-teal-700">Replied</span>}
                  {p.steps === 0 && (
                    <button disabled={busy}
                      onClick={() => act(() => api(`/leads/${p.id}/draft`, { method: 'POST' }), 'Sequence drafted. Review it in step 3.')}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-orange-50 text-orange-700 border border-orange-100 hover:bg-orange-100">Draft outreach</button>
                  )}
                </div>
              </div>
            ))}
            {prospects.length > 0 && !prospects.some((p) => p.work_email) && <p className="text-sm text-slate-500">None of the top leads have an email address yet.</p>}
          </div>
        </Card>
      </div>

      {/* 3/4 Outreach */}
      <Card
        n={3} title="Multichannel outreach that books more meetings" accent="Email, LinkedIn task, follow-up, then a booking link" icon={Send}
        right={
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold bg-white">
            {['Pending Approval', 'Approved', 'Sent', 'Task Created', 'Replied', 'Failed', 'Skipped', 'All'].map((s) => <option key={s}>{s}</option>)}
          </select>
        }
      >
        <div className="grid xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-3 max-h-[520px] overflow-y-auto">
            {shown.length === 0 && <p className="text-sm text-slate-500">Nothing in "{filter}". Press Run now to draft sequences for your top leads.</p>}
            {shown.map((o) => (
              <div key={o.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center gap-2 text-xs">
                  {o.channel === 'Email' ? <Mail className="w-3.5 h-3.5 text-slate-400" /> : <MessageSquare className="w-3.5 h-3.5 text-slate-400" />}
                  <span className="font-bold text-[#0d2238]">Step {o.step_no} · {o.contact_name}, {o.company_name}</span>
                  <span className={`ml-auto px-2 py-0.5 rounded-md font-bold ${STATUS_STYLE[o.status]}`}>{o.status}</span>
                </div>
                {editing === o.id ? (
                  <EditBox o={o} onCancel={() => setEditing(null)} onSave={(subject, body) => act(() => api(`/outreach/${o.id}`, { method: 'PUT', body: { subject, body } }), 'Draft updated').then(() => setEditing(null))} />
                ) : (
                  <>
                    {o.subject && <div className="mt-2 text-sm font-semibold text-slate-800">{o.subject}</div>}
                    <p className="mt-1 text-xs text-slate-600 whitespace-pre-line line-clamp-4">{o.body}</p>
                    {o.error && <p className="mt-1 text-xs text-red-600">{o.error}</p>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {['Pending Approval', 'Failed'].includes(o.status) && (
                        <button disabled={busy} onClick={() => act(() => api(`/outreach/${o.id}/approve`, { method: 'POST' }), 'Approved. It sends in the next run.')} className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-emerald-600 text-white"><Check className="w-3 h-3" /> {o.status === 'Failed' ? 'Retry' : 'Approve'}</button>
                      )}
                      {['Pending Approval', 'Approved', 'Failed'].includes(o.status) && (
                        <>
                          <button onClick={() => setEditing(o.id)} className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700"><Pencil className="w-3 h-3" /> Edit</button>
                          <button disabled={busy} onClick={() => act(() => api(`/outreach/${o.id}/skip`, { method: 'POST' }), 'Skipped')} className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700"><X className="w-3 h-3" /> Skip</button>
                        </>
                      )}
                      {['Sent', 'Task Created'].includes(o.status) && (
                        <button disabled={busy} onClick={() => act(() => api(`/leads/${o.lead_id}/replied`, { method: 'POST' }), 'Marked as replied. The rest of the sequence is stopped.')} className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-teal-50 text-teal-700 border border-teal-100"><Reply className="w-3 h-3" /> They replied</button>
                      )}
                      {o.status === 'Pending Approval' && o.step_no === 1 && (
                        <button disabled={busy} onClick={() => act(() => api(`/leads/${o.lead_id}/approve-all`, { method: 'POST' }), 'Whole sequence approved')} className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100">Approve all 3 steps</button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Booked calendar */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1.5 mb-2"><CalendarCheck className="w-3.5 h-3.5" /> Booked meetings</h3>
            {Object.keys(meetingsByDay).length === 0 && <p className="text-sm text-slate-500">No meetings yet. Each email carries a personal booking link; slots are Mon-Fri, 10:00-17:00 IST.</p>}
            <div className="space-y-3 max-h-[480px] overflow-y-auto">
              {Object.entries(meetingsByDay).map(([day, list]) => (
                <div key={day}>
                  <div className="text-[11px] font-bold text-slate-400 mb-1">{day}</div>
                  {list.map((m) => (
                    <div key={m.id} className="mb-1.5 rounded-lg bg-orange-50 border border-orange-100 px-3 py-2">
                      <div className="text-xs font-bold text-orange-800">{new Date(m.slot_start).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {m.contact_name}</div>
                      <div className="text-[11px] text-orange-700/80">{m.company_name}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* 4/4 Gets better */}
      <Card n={4} title="Gets better every week" accent="Learns from replies, meetings and qualified leads" icon={TrendingUp}>
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-end gap-4 h-40 border-b border-slate-200 pb-1">
              {weekly.map((w) => (
                <div key={w.week_start} className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex items-end gap-1 h-32">
                    <div title={`${w.sent} sent`} className="w-3 rounded-t bg-slate-300" style={{ height: `${(w.sent / maxWeek) * 100}%`, minHeight: w.sent ? 3 : 0 }} />
                    <div title={`${w.replies} replies`} className="w-3 rounded-t bg-teal-400" style={{ height: `${(w.replies / maxWeek) * 100}%`, minHeight: w.replies ? 3 : 0 }} />
                    <div title={`${w.meetings} meetings`} className="w-3 rounded-t bg-orange-500" style={{ height: `${(w.meetings / maxWeek) * 100}%`, minHeight: w.meetings ? 3 : 0 }} />
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500">{w.label}</div>
                  <div className="text-[10px] text-slate-400">{w.reply_rate}% reply</div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-2 text-[11px] text-slate-500">
              <span><i className="inline-block w-2 h-2 bg-slate-300 rounded-sm mr-1" />Sent</span>
              <span><i className="inline-block w-2 h-2 bg-teal-400 rounded-sm mr-1" />Replies</span>
              <span><i className="inline-block w-2 h-2 bg-orange-500 rounded-sm mr-1" />Meetings</span>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1.5 mb-2"><Sparkles className="w-3.5 h-3.5" /> What it has learned</h3>
            {insights.length === 0 ? (
              <p className="text-sm text-slate-500">Learning starts once at least 10 leads have been contacted. Each week the agent compares who replied or booked and adjusts scoring toward what works.</p>
            ) : (
              <ul className="space-y-1.5">
                {insights.map((i) => (
                  <li key={i.feature} className="flex items-center justify-between text-sm rounded-lg bg-slate-50 px-3 py-2">
                    <span className="font-semibold text-slate-700">{i.feature.replace(':', ': ')}</span>
                    <span className={`text-xs font-bold ${i.adjustment > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {i.adjustment > 0 ? '+' : ''}{i.adjustment} pts · {Math.round(i.success_rate * 100)}% success ({i.samples})
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-slate-400 mt-2">
              <Bot className="w-3 h-3 inline mr-1" />
              Last learning pass: {settings.last_learned_at ? fmt(settings.last_learned_at.replace(' ', 'T') + 'Z') : 'not yet'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

const EditBox = ({ o, onSave, onCancel }) => {
  const [subject, setSubject] = useState(o.subject || '');
  const [body, setBody] = useState(o.body);
  return (
    <div className="mt-2 space-y-2">
      {o.channel === 'Email' && <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm" />}
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" />
      <div className="flex gap-2">
        <button onClick={() => onSave(o.channel === 'Email' ? subject : null, body)} className="text-[11px] font-bold px-3 py-1 rounded-md bg-[#0063f2] text-white">Save</button>
        <button onClick={onCancel} className="text-[11px] font-bold px-3 py-1 rounded-md bg-slate-100 text-slate-700">Cancel</button>
      </div>
    </div>
  );
};
