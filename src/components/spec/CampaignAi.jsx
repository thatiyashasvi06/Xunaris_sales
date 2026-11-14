import React, { useEffect, useState } from 'react';
import { apiClient } from '../../services/apiClient';

/**
 * Campaign AI. Describe the goal in one line; it writes the campaign and chooses the audience from the CRM.
 * Nothing is sent: the result fills the builder for a person to review before pressing Launch.
 */

export const CampaignAiPanel = ({ businessUnit, onApply }) => {
  const [open, setOpen] = useState(true);
  const [goal, setGoal] = useState('');
  const [business, setBusiness] = useState(businessUnit === 'Xunaris' ? 'Xunaris' : 'HYRA Connect');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState(null);
  const [subjectIdx, setSubjectIdx] = useState(0);
  const [body, setBody] = useState('');
  const [applied, setApplied] = useState(false);

  const run = async () => {
    setBusy(true); setError(''); setApplied(false);
    try {
      const p = await apiClient.request('/campaign-ai/plan', { method: 'POST', body: { goal, business } });
      setPlan(p); setSubjectIdx(0); setBody(p.body);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    onApply(plan, { subject: plan.subjects[subjectIdx], body });
    setApplied(true);
  };

  return (
    <section className="rounded-2xl border border-hyra-100 bg-white overflow-hidden" aria-label="Campaign AI">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left">
        <span>
          <span className="block text-[15px] font-bold text-ink-900">Campaign AI</span>
          <span className="block text-xs text-slate-500">Say what you want to send. It writes the email and picks who should get it.</span>
        </span>
        <span className="text-xs font-bold text-hyra-700">{open ? 'Hide' : 'Open'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
          <div className="grid sm:grid-cols-[1fr_200px] gap-3">
            <label className="text-xs font-semibold text-slate-600">
              What is this campaign for?
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={2}
                placeholder="For example: Introduce contract staffing to banks in Pune"
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-normal focus:outline-hidden focus:ring-2 focus:ring-hyra-500"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Business
              <select value={business} onChange={(e) => setBusiness(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-normal bg-white">
                <option>HYRA Connect</option>
                <option>Xunaris</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={run} disabled={busy || goal.trim().length < 8} className="px-4 py-2.5 rounded-xl bg-hyra-700 hover:bg-hyra-800 text-white text-sm font-bold disabled:opacity-50">
              {busy ? 'Planning...' : plan ? 'Plan again' : 'Plan my campaign'}
            </button>
            <span className="text-[11px] text-slate-500">Nothing is sent. You review everything first.</span>
          </div>
          {error && <p className="text-sm text-rose-700 bg-rose-50 rounded-lg px-3 py-2">{error}</p>}

          {plan && (
            <div className="space-y-4 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-ink-900">{plan.name}</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-hyra-50 border border-hyra-100 text-hyra-800">{plan.engine}</span>
              </div>

              <div>
                <div className="text-[11px] font-bold text-slate-500 mb-1.5">Subject line (choose one)</div>
                <div className="space-y-1.5">
                  {plan.subjects.map((s, i) => (
                    <label key={i} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${subjectIdx === i ? 'border-hyra-400 bg-hyra-50' : 'border-slate-200'}`}>
                      <input type="radio" name="ai-subject" checked={subjectIdx === i} onChange={() => setSubjectIdx(i)} />
                      <span className="text-ink-900">{s}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="block text-[11px] font-bold text-slate-500">
                The email (you can edit it)
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={9} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-normal text-slate-700 leading-relaxed" />
                <span className="font-normal text-slate-400">{'{{contact_name}} and {{company_name}} are filled in for each person.'}</span>
              </label>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
                <div className="text-sm font-bold text-ink-900">
                  Who gets it: {plan.audience.selected} {plan.audience.selected === 1 ? 'person' : 'people'}
                </div>
                {plan.audience.leads.length > 0 && (
                  <ul className="space-y-1">
                    {plan.audience.leads.slice(0, 6).map((l) => (
                      <li key={l.id} className="text-xs text-slate-600"><strong className="text-ink-900">{l.company}</strong> · {l.contact}{l.title ? `, ${l.title}` : ''} <span className="text-slate-400">· {l.why}</span></li>
                    ))}
                    {plan.audience.selected > 6 && <li className="text-xs text-slate-400">and {plan.audience.selected - 6} more</li>}
                  </ul>
                )}
                {plan.notes.map((n, i) => <p key={i} className="text-xs text-amber-700">{n}</p>)}
                <p className="text-xs text-slate-500">{plan.sendAdvice}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={apply} disabled={plan.audience.selected === 0} className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50">
                  Use this in the builder
                </button>
                {applied && <span className="text-xs font-semibold text-emerald-700">Filled in below. Review it, then press Launch when you are happy.</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

/** "What happened and what to do next" for the latest campaigns. */
export const CampaignAiSummary = () => {
  const [items, setItems] = useState(null);
  useEffect(() => {
    let alive = true;
    apiClient.request('/campaign-ai/summary').then((r) => alive && setItems(r)).catch(() => alive && setItems([]));
    return () => { alive = false; };
  }, []);
  if (!items || items.length === 0) return null;
  const latest = items[0];
  return (
    <section className="rounded-2xl border border-hyra-100 bg-white p-5 space-y-3" aria-label="Campaign results">
      <div>
        <h3 className="text-[15px] font-bold text-ink-900">What happened and what to do next</h3>
        <p className="text-xs text-slate-500">Latest campaign: {latest.name}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {[['Sent', latest.sent], ['Arrived', `${latest.delivered} (${latest.deliveredPct}%)`], ['Did not arrive', latest.failed]].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5">
            <div className="text-lg font-bold text-ink-900 tabular-nums">{v}</div>
            <div className="text-[11px] text-slate-500">{k}</div>
          </div>
        ))}
      </div>
      <ul className="space-y-1.5 list-disc pl-5">
        {latest.advice.map((a, i) => <li key={i} className="text-sm text-slate-700">{a}</li>)}
      </ul>
      {latest.failedAddresses.length > 0 && <p className="text-xs text-slate-500">Did not arrive: {latest.failedAddresses.join(', ')}</p>}
    </section>
  );
};
