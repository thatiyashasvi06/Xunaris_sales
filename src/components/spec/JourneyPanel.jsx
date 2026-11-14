import React, { useEffect, useMemo, useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { apiClient } from '../../services/apiClient';
import { Check, ArrowRight, ChevronDown, ChevronUp, Users, Target, Send, Power, CalendarCheck, Briefcase, Sparkles } from 'lucide-react';

/**
 * Guided journey: shows where the team is from the first lead to a won deal,
 * the single next step to take, and the whole flow with live counts.
 * Everything is computed from real CRM and Sales Agent data.
 */
export const JourneyPanel = () => {
  const { leads, opportunities, setActiveNav } = useCRM();
  const [agent, setAgent] = useState(null);
  const [showAll, setShowAll] = useState(() => {
    try { return localStorage.getItem('xun_journey_all') !== 'closed'; } catch { return true; }
  });

  useEffect(() => {
    let alive = true;
    const load = () =>
      apiClient.request('/sales-agent/overview')
        .then((o) => alive && setAgent(o))
        .catch(() => alive && setAgent(null));
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const toggleAll = () => {
    const next = !showAll;
    setShowAll(next);
    try { localStorage.setItem('xun_journey_all', next ? 'open' : 'closed'); } catch {}
  };

  const model = useMemo(() => {
    const ov = agent?.overview || {};
    const st = agent?.settings || {};
    const weeklySent = (agent?.weekly || []).reduce((n, w) => n + (w.sent || 0), 0);
    const sent = Math.max(ov.sent_total || 0, weeklySent);
    const qualified = leads.filter((l) => l.status === 'Qualified').length;
    const openDeals = opportunities.filter((o) => o.stage !== 'Won' && o.stage !== 'Lost').length;
    const won = opportunities.filter((o) => o.stage === 'Won').length;
    const meetings = ov.meetings_booked || 0;
    const replies = ov.replies || 0;
    const hasTarget = Boolean(agent?.icp) || (st.target_industries || []).length > 0 || (st.target_titles || []).length > 0;

    const steps = [
      {
        id: 'leads', icon: Users, nav: 'leads', cta: 'Add leads',
        title: 'Add your leads',
        why: 'Everything starts with people to contact. Add them one by one or import a CSV or Excel file.',
        done: leads.length > 0,
        hint: leads.length > 0 ? `${leads.length} lead${leads.length === 1 ? '' : 's'} in your CRM` : 'Include email, job title and industry so they score well.'
      },
      {
        id: 'target', icon: Target, nav: 'sales-agent', cta: 'Set your ideal customer',
        title: 'Tell the agent who you sell to',
        why: 'Enter your website. The agent writes who buys from you and uses it to rank your leads.',
        done: hasTarget,
        hint: hasTarget ? 'Ideal customer saved' : 'Takes about a minute.'
      },
      {
        id: 'approve', icon: Send, nav: 'sales-agent', cta: ov.pending_approval > 0 ? 'Review drafts' : 'Draft messages',
        title: 'Approve the first messages',
        why: 'The agent drafts an email, a LinkedIn task and a follow-up for your best leads. Nothing is sent until you approve.',
        done: sent > 0 || (ov.approved || 0) > 0,
        hint: ov.pending_approval > 0 ? `${ov.pending_approval} draft${ov.pending_approval === 1 ? ' is' : 's are'} waiting for you` : (leads.length > 0 ? 'Press Run now in Sales Agent to create drafts.' : 'Add leads first.')
      },
      {
        id: 'on', icon: Power, nav: 'sales-agent', cta: 'Switch the agent on',
        title: 'Switch the agent on',
        why: 'When it is on, approved emails go out Monday to Saturday, 9:00 to 18:00 IST, within your daily limit.',
        done: Boolean(st.enabled),
        hint: st.enabled ? 'The agent is running' : 'You can pause it any time.'
      },
      {
        id: 'meetings', icon: CalendarCheck, nav: 'sales-agent', cta: 'See replies and meetings',
        title: 'Get replies and meetings',
        why: 'Each email has a personal booking link. When someone replies, press "They replied" so the agent stops and learns.',
        done: meetings > 0 || replies > 0,
        hint: meetings + replies > 0 ? `${replies} repl${replies === 1 ? 'y' : 'ies'}, ${meetings} meeting${meetings === 1 ? '' : 's'}` : 'Replies usually arrive within a few days.'
      },
      {
        id: 'deals', icon: Briefcase, nav: 'opportunities', cta: 'Create a deal',
        title: 'Turn interest into a deal',
        why: 'When a lead is qualified, convert it into a deal and track it through the stages.',
        done: opportunities.length > 0,
        hint: opportunities.length > 0 ? `${openDeals} open deal${openDeals === 1 ? '' : 's'}` : 'Open a lead and press Convert to Opportunity.'
      },
      {
        id: 'won', icon: Sparkles, nav: 'opportunities', cta: 'Open your deals',
        title: 'Win it and hand it over',
        why: 'Mark the deal Won. A handoff task is created for delivery.',
        done: won > 0,
        hint: won > 0 ? `${won} deal${won === 1 ? '' : 's'} won` : 'This is the goal.'
      }
    ];

    const flow = [
      { label: 'Leads', value: leads.length, nav: 'leads' },
      { label: 'Qualified', value: qualified, nav: 'leads' },
      { label: 'Reached out', value: sent, nav: 'sales-agent' },
      { label: 'Meetings', value: meetings, nav: 'sales-agent' },
      { label: 'Open deals', value: openDeals, nav: 'opportunities' },
      { label: 'Won', value: won, nav: 'opportunities' }
    ];

    const nextIndex = steps.findIndex((s) => !s.done);
    return { steps, flow, nextIndex, doneCount: steps.filter((s) => s.done).length };
  }, [agent, leads, opportunities]);

  const { steps, flow, nextIndex, doneCount } = model;
  const complete = nextIndex === -1;
  const next = complete ? null : steps[nextIndex];
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <section className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden" aria-label="Your sales journey">
      {/* Header + progress */}
      <div className="px-5 sm:px-6 pt-5 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#0d2238]">Your sales journey</h2>
            <p className="text-xs text-slate-500">From the first lead to a won deal. We show you the one step to do next.</p>
          </div>
          <span className="text-xs font-bold text-slate-600">{doneCount} of {steps.length} done</span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-gradient-to-r from-[#0063f2] to-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* The one next step */}
      {next ? (
        <div className="mx-4 sm:mx-6 mb-4 rounded-2xl border border-hyra-200 bg-hyra-50/70 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-hyra-500 text-white flex items-center justify-center shrink-0">
              <next.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-hyra-700">Next step · {nextIndex + 1} of {steps.length}</div>
              <div className="text-sm sm:text-base font-extrabold text-[#0d2238]">{next.title}</div>
              <p className="text-xs text-slate-600 mt-0.5">{next.why}</p>
              <p className="text-[11px] font-semibold text-hyra-800 mt-1">{next.hint}</p>
            </div>
          </div>
          <button
            onClick={() => setActiveNav(next.nav)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-hyra-700 hover:bg-hyra-800 text-white text-sm font-bold shadow-sm shrink-0"
          >
            {next.cta} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="mx-4 sm:mx-6 mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-emerald-800">You have completed the journey</div>
            <p className="text-xs text-emerald-700">Keep adding leads and approving messages. See how you are doing in Reports.</p>
          </div>
          <button onClick={() => setActiveNav('reports')} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold shrink-0">Open Reports</button>
        </div>
      )}

      {/* Live flow: where everything is right now */}
      <div className="px-4 sm:px-6 pb-4">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">The flow right now</div>
        <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1">
          {flow.map((f, i) => (
            <React.Fragment key={f.label}>
              <button
                onClick={() => setActiveNav(f.nav)}
                className="min-w-[88px] flex-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 px-3 py-2 text-left transition-colors"
              >
                <div className="text-lg font-extrabold text-[#0d2238] leading-none">{f.value}</div>
                <div className="text-[11px] font-semibold text-slate-500 mt-1">{f.label}</div>
              </button>
              {i < flow.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-slate-300 self-center shrink-0" aria-hidden="true" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* All steps */}
      <div className="border-t border-slate-100">
        <button onClick={toggleAll} className="w-full flex items-center justify-between px-5 sm:px-6 py-3 text-xs font-bold text-slate-600 hover:text-slate-900">
          <span>{showAll ? 'Hide all steps' : `See all ${steps.length} steps`}</span>
          {showAll ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showAll && (
          <ol className="px-4 sm:px-6 pb-5 grid md:grid-cols-2 gap-2">
            {steps.map((s, i) => {
              const isNext = i === nextIndex;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => setActiveNav(s.nav)}
                    className={`w-full text-left flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                      s.done ? 'border-emerald-200 bg-emerald-50/50' : isNext ? 'border-hyra-300 bg-hyra-50/60' : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 mt-0.5 ${
                      s.done ? 'bg-emerald-500 text-white' : isNext ? 'bg-hyra-500 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {s.done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-[#0d2238]">{s.title}</span>
                      <span className="block text-[11px] text-slate-500">{s.hint}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
};
