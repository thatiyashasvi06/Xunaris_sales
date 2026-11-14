import React, { useCallback, useEffect, useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { apiClient } from '../../services/apiClient';
import { JourneyPanel } from './JourneyPanel';

/**
 * Today: the home screen. It answers "what should I do now?" for the signed-in person.
 * Sales Head and Admin see the whole team; executives see their own leads and follow-ups.
 */

const api = (path, opts) => apiClient.request(`/team${path}`, opts);

const inr = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)} L`;
  return `₹${v.toLocaleString('en-IN')}`;
};
const ago = (h) => (h < 1 ? 'just now' : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`);
const initials = (name) => (name || '?').split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase();
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
const clock = (s) => {
  const d = new Date(String(s).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const STATUS_STYLE = {
  Available: { dot: 'bg-emerald-500', on: 'bg-emerald-600 text-white', label: 'Available' },
  Busy: { dot: 'bg-amber-500', on: 'bg-amber-500 text-white', label: 'Busy' },
  Away: { dot: 'bg-slate-400', on: 'bg-slate-700 text-white', label: 'Away' }
};

const Card = ({ title, hint, right, children, className = '' }) => (
  <section className={`bg-white rounded-2xl border border-[#E6E9F2] ${className}`}>
    {(title || right) && (
      <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-1">
        <div>
          <h2 className="text-[15px] font-bold text-ink-900">{title}</h2>
          {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
        </div>
        {right}
      </header>
    )}
    <div className="px-5 pb-4 pt-2">{children}</div>
  </section>
);

const Chip = ({ children, tone = 'slate' }) => {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    hyra: 'bg-hyra-50 text-hyra-800',
    xun: 'bg-xun-50 text-xun-800',
    rose: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-800'
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
};

export const SpecToday = () => {
  const { setActiveNav } = useCRM();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [awayOpen, setAwayOpen] = useState(false);
  const [awayUntil, setAwayUntil] = useState('');
  const [awayNote, setAwayNote] = useState('');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rules, setRules] = useState(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await api('/today');
      setData(d);
      setRules((r) => r || d.settings);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  const setStatus = async (status, extra = {}) => {
    try {
      await api('/me/availability', { method: 'PUT', body: { status, ...extra } });
      setAwayOpen(false);
      await load();
    } catch (e) { setError(e.message); }
  };

  const saveRules = async () => {
    try {
      const saved = await api('/routing', { method: 'PUT', body: rules });
      setRules(saved);
      setMsg('Routing rules saved.');
      await load();
    } catch (e) { setError(e.message); }
  };

  const openLead = (id) => {
    try { sessionStorage.setItem('xun_open_lead', id); } catch {}
    setActiveNav('leads');
  };

  if (!data) {
    return (
      <div className="max-w-[1200px]">
        <h1 className="text-[28px] font-bold text-ink-900 tracking-tight">Today</h1>
        <p className="text-sm text-slate-500 mt-1">{error || 'Loading your day...'}</p>
      </div>
    );
  }

  const { me, counts, hot, toContact, overdue, unassigned, followUps, meetings, deals, team, feed, settings } = data;
  const first = (me.name || '').split(' ')[0];

  // One list of what needs the person now, most urgent first, no repeats
  const queue = [];
  const seen = new Set();
  const add = (rows, reason, tone) => rows.forEach((l) => {
    if (seen.has(l.id)) return;
    seen.add(l.id);
    queue.push({ ...l, reason: typeof reason === 'function' ? reason(l) : reason, tone });
  });
  if (me.isHead) add(unassigned, 'Nobody owns this yet', 'rose');
  add(overdue, (l) => `Waiting ${ago(l.ageHours).replace(' ago', '')}, limit ${l.slaHours}h`, 'rose');
  add(hot, (l) => `Hot lead, score ${l.score}`, 'hyra');
  if (!me.isHead) add(toContact, 'New, not contacted yet', 'slate');

  const tiles = me.isHead
    ? [
        { label: 'Hot leads', value: counts.hot, hint: `score ${settings.hot_score}+` },
        { label: 'Unassigned', value: counts.unassigned, hint: 'need an owner' },
        { label: 'Overdue', value: counts.overdue, hint: 'past response time' },
        { label: 'Big deals', value: counts.bigDeals, hint: `${inr(settings.big_deal_value)}+` }
      ]
    : [
        { label: 'Hot leads', value: counts.hot, hint: 'yours, score ' + settings.hot_score + '+' },
        { label: 'To contact', value: counts.toContact, hint: 'new and waiting' },
        { label: 'Overdue', value: counts.overdue, hint: 'past response time' },
        { label: 'Follow-ups', value: counts.followUps, hint: 'due today or late' }
      ];

  const maxLoad = Math.max(5, ...team.map((p) => p.openLeads));

  return (
    <div className="max-w-[1200px] space-y-6">
      {/* Greeting and availability */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="text-[28px] sm:text-[32px] leading-tight font-bold text-ink-900 tracking-tight">{greeting()}, {first}</h1>
          <p className="text-sm text-slate-500 mt-1">
            You are the <strong className="text-ink-800">{me.teamRole}</strong>.{' '}
            {me.isHead ? 'Here is what needs you and how the team is doing.' : 'Here is what to do next.'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E6E9F2] p-3 min-w-[280px]">
          <div className="text-[11px] font-semibold text-slate-500 mb-2 px-1">Your availability</div>
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100" role="group" aria-label="Your availability">
            {['Available', 'Busy', 'Away'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => (s === 'Away' ? setAwayOpen((o) => !o) : setStatus(s))}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${me.availability === s ? STATUS_STYLE[s].on : 'text-slate-600 hover:bg-white'}`}
                aria-pressed={me.availability === s}
              >
                {s}
              </button>
            ))}
          </div>
          {me.availability === 'Away' && !awayOpen && (
            <p className="text-[11px] text-slate-500 mt-2 px-1">
              {me.awayUntil ? `Back on ${new Date(me.awayUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}. ` : ''}
              New leads skip you and your new leads move to teammates.
            </p>
          )}
          {me.availability === 'Busy' && <p className="text-[11px] text-slate-500 mt-2 px-1">You keep your leads. New ones go to others.</p>}
          {awayOpen && (
            <div className="mt-3 space-y-2">
              <label className="block text-[11px] font-semibold text-slate-600">
                Back on (optional)
                <input type="date" value={awayUntil} onChange={(e) => setAwayUntil(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm" />
              </label>
              <input value={awayNote} onChange={(e) => setAwayNote(e.target.value)} maxLength={120} placeholder="Note, for example: on leave" className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm" />
              <button type="button" onClick={() => setStatus('Away', { awayUntil, note: awayNote })} className="w-full py-2 rounded-lg bg-slate-800 text-white text-xs font-bold">Set me away</button>
            </div>
          )}
        </div>
      </div>

      {/* Onboarding: shown until the seven steps are done */}
      <JourneyPanel hideWhenComplete />

      {error && <div className="rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-2">{error}</div>}
      {msg && <div className="rounded-xl bg-emerald-50 text-emerald-700 text-sm px-4 py-2">{msg}</div>}

      {/* Four numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="bg-white rounded-2xl border border-[#E6E9F2] px-5 py-4">
            <div className="text-[34px] leading-none font-bold text-ink-900 tabular-nums">{t.value}</div>
            <div className="text-sm font-semibold text-ink-800 mt-2">{t.label}</div>
            <div className="text-xs text-slate-500">{t.hint}</div>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-3 gap-6 items-start">
        {/* Needs you now */}
        <Card className="xl:col-span-2" title={me.isHead ? 'Needs you now' : 'Your next leads'} hint={me.isHead ? 'Most urgent first' : 'Start at the top'}>
          {queue.length === 0 ? (
            <div className="py-8 text-center">
              <div className="text-sm font-bold text-ink-900">You are all caught up</div>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Nothing is waiting for you. New leads are routed to the right person automatically.</p>
              <button type="button" onClick={() => setActiveNav('leads')} className="mt-3 px-4 py-2 rounded-xl bg-hyra-700 hover:bg-hyra-800 text-white text-xs font-bold">Open Leads</button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {queue.slice(0, 10).map((l) => (
                <li key={l.id}>
                  <button type="button" onClick={() => openLead(l.id)} className="w-full flex items-center gap-4 py-3 text-left hover:bg-slate-50/70 -mx-2 px-2 rounded-xl transition-colors">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${l.hot ? 'bg-hyra-700 text-white' : 'bg-slate-100 text-slate-700'}`} title="Lead score">{l.score}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-bold text-ink-900 truncate">{l.company}</span>
                        <Chip tone={l.vertical === 'XUN' ? 'xun' : 'hyra'}>{l.vertical === 'XUN' ? 'Xunaris' : 'HYRA'}</Chip>
                      </span>
                      <span className="block text-xs text-slate-500 truncate">{l.contact}{l.title ? `, ${l.title}` : ''} · {ago(l.ageHours)}{me.isHead ? ` · ${l.owner}` : ''}</span>
                      {l.nextAction && <span className="block text-xs font-medium text-hyra-700 truncate mt-0.5">{l.nextAction}</span>}
                    </span>
                    <span className="hidden sm:block"><Chip tone={l.tone}>{l.reason}</Chip></span>
                    <span className="text-xs font-bold text-hyra-700 shrink-0">Open</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Team */}
        <Card title="Team right now" hint="Who can take a new lead">
          <ul className="space-y-3">
            {team.map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-ink-900 text-white text-xs font-bold flex items-center justify-center shrink-0">{initials(p.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink-900 truncate">{p.name}</span>
                    <span className={`w-2 h-2 rounded-full ${STATUS_STYLE[p.availability]?.dot || 'bg-slate-300'}`} title={p.availability} />
                  </span>
                  <span className="block text-[11px] text-slate-500">{p.teamRole} · {p.availability}{p.availability === 'Away' && p.awayUntil ? ` until ${new Date(p.awayUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}</span>
                  <span className="mt-1 block h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <span className="block h-full rounded-full bg-hyra-600" style={{ width: `${Math.min(100, (p.openLeads / maxLoad) * 100)}%` }} />
                  </span>
                </span>
                <span className="text-xs font-semibold text-slate-600 tabular-nums w-14 text-right">{p.openLeads} open</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
        <Card title="On your calendar" hint="Meetings today and follow-ups due">
          {meetings.length + followUps.length === 0 ? (
            <p className="text-sm text-slate-500 py-2">Nothing scheduled for today.</p>
          ) : (
            <ul className="space-y-3">
              {meetings.map((m) => (
                <li key={m.id} className="flex gap-3">
                  <span className="text-xs font-bold text-xun-800 bg-xun-50 rounded-md px-2 py-1 h-fit tabular-nums">{clock(m.when) || 'Today'}</span>
                  <span className="min-w-0"><span className="block text-sm font-semibold text-ink-900 truncate">{m.subject}</span><span className="block text-[11px] text-slate-500 truncate">Meeting · {m.relatedTo}{me.isHead ? ` · ${m.assignedTo}` : ''}</span></span>
                </li>
              ))}
              {followUps.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className={`text-xs font-bold rounded-md px-2 py-1 h-fit ${a.late ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{a.late ? 'Late' : 'Today'}</span>
                  <span className="min-w-0"><span className="block text-sm font-semibold text-ink-900 truncate">{a.subject}</span><span className="block text-[11px] text-slate-500 truncate">{a.type} · {a.relatedTo}{me.isHead ? ` · ${a.assignedTo}` : ''}</span></span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Big deals" hint={`${inr(settings.big_deal_value)} and above`}>
          {deals.length === 0 ? (
            <p className="text-sm text-slate-500 py-2">No open deals at this size.</p>
          ) : (
            <ul className="space-y-3">
              {deals.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0"><span className="block text-sm font-semibold text-ink-900 truncate">{d.title}</span><span className="block text-[11px] text-slate-500 truncate">{d.company} · {d.stage}{me.isHead ? ` · ${d.owner}` : ''}</span></span>
                  <span className="text-sm font-bold text-ink-900 tabular-nums">{inr(d.value)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Routing activity" hint="Where leads were sent and why">
          {feed.length === 0 ? (
            <p className="text-sm text-slate-500 py-2">Lead assignments will show here.</p>
          ) : (
            <ul className="space-y-3">
              {feed.map((f, i) => (
                <li key={i} className="text-sm">
                  <span className="font-semibold text-ink-900">{f.lead}</span>{f.to ? <> to <span className="font-semibold text-ink-900">{f.to}</span></> : null}
                  <span className="block text-[11px] text-slate-500">{f.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Routing rules for the Sales Head and Admin */}
      {me.isHead && rules && (
        <Card
          title="How leads are routed"
          hint="The CRM follows these rules so nobody has to hand out leads by hand"
          right={<button type="button" onClick={() => setRulesOpen((o) => !o)} className="text-xs font-bold text-hyra-700">{rulesOpen ? 'Hide rules' : 'Edit rules'}</button>}
        >
          <ol className="text-sm text-slate-600 space-y-1 list-decimal pl-5">
            <li>A new lead goes to the available Sales Executive with the fewest open leads.</li>
            <li>Leads scoring {rules.hot_score}+ go to the Sales Head first.</li>
            <li>If the owner is away, or a new lead is untouched for {rules.sla_hours_hot}h (hot) or {rules.sla_hours_normal}h (others), it moves to the next available person and you are told.</li>
            <li>If nobody is available, the lead waits here under Unassigned. Deals of {inr(rules.big_deal_value)}+ alert you.</li>
          </ol>
          {rulesOpen && (
            <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                ['hot_score', 'Hot lead score'],
                ['big_deal_value', 'Big deal value (INR)'],
                ['sla_hours_hot', 'Response time, hot (hours)'],
                ['sla_hours_normal', 'Response time, others (hours)'],
                ['max_reassignments', 'Most handovers per lead']
              ].map(([k, label]) => (
                <label key={k} className="text-[11px] font-semibold text-slate-600">
                  {label}
                  <input type="number" value={rules[k]} onChange={(e) => setRules((r) => ({ ...r, [k]: e.target.value }))} className="mt-1 w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-normal" />
                </label>
              ))}
              <div className="sm:col-span-2 lg:col-span-5">
                <button type="button" onClick={saveRules} className="px-4 py-2 rounded-xl bg-hyra-700 hover:bg-hyra-800 text-white text-xs font-bold">Save rules</button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
