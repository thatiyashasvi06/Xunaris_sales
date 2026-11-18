import React, { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../services/apiClient';

const fmtTime = (min) => {
  if (min < 60) return `${Math.round(min)} min`;
  const h = min / 60;
  return `${h >= 10 ? Math.round(h) : Math.round(h * 10) / 10} h`;
};

/** An honest estimate of the time the CRM saves: counted actions times minutes per task. */
export const AiTimeSaved = () => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [edit, setEdit] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await apiClient.request(`/team/ai-report?days=${days}`);
      setData(d); setEdit({}); setError('');
    } catch (e) { setError(e.message); }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setBusy(true); setMsg(''); setError('');
    try {
      const d = await apiClient.request(`/team/ai-report/minutes?days=${days}`, { method: 'PUT', body: edit });
      setData(d); setEdit({}); setMsg('Minutes saved. The totals are recalculated.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  if (!data) return error ? <div className="rounded-2xl border border-[#E6E9F2] bg-white p-5 text-sm text-rose-700">{error}</div> : null;

  const maxWeek = Math.max(1, ...data.weeks.map((w) => w.minutes));
  const changed = Object.keys(edit).length > 0;

  return (
    <section className="rounded-2xl border border-[#E6E9F2] bg-white" aria-label="Time saved by AI">
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h2 className="text-[17px] font-bold text-ink-900">Time saved by AI</h2>
          <p className="text-xs text-slate-500 mt-0.5">An estimate of the work the CRM did so people did not have to.</p>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white" aria-label="Period">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </header>

      <div className="grid md:grid-cols-[220px_1fr] gap-6 px-5 py-4">
        <div>
          <div className="text-[44px] leading-none font-bold text-ink-900 tabular-nums">{fmtTime(data.totalMinutes)}</div>
          <div className="text-sm font-semibold text-ink-800 mt-2">saved in {data.days} days</div>
          <div className="text-xs text-slate-500">{data.actions} actions done by the CRM</div>
          {data.countingSince && <div className="text-[11px] text-slate-400 mt-2">Counting since {new Date(data.countingSince.replace(' ', 'T') + 'Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
        </div>

        <div>
          <div className="text-[11px] font-semibold text-slate-500 mb-2">Last 4 weeks</div>
          <div className="flex items-end gap-3 h-24">
            {data.weeks.map((w) => (
              <div key={w.start} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end h-16">
                  <div className="w-full rounded-t-md bg-hyra-600" style={{ height: `${(w.minutes / maxWeek) * 100}%`, minHeight: w.minutes ? 4 : 0 }} title={`${w.actions} actions`} />
                </div>
                <div className="text-[11px] font-semibold text-ink-900 tabular-nums">{w.minutes ? fmtTime(w.minutes) : '0'}</div>
                <div className="text-[10px] text-slate-400">{new Date(w.start + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {data.actions === 0 ? (
        <p className="px-5 pb-5 text-sm text-slate-500">
          Nothing counted yet. The CRM counts each lead it briefs or assigns, each outreach sequence it drafts, each campaign it plans and each email it sends from approved drafts.
        </p>
      ) : (
        <div className="px-5 pb-2 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] font-semibold text-slate-500 border-b border-slate-100">
                <th className="py-2 pr-4">What the CRM did</th>
                <th className="py-2 pr-4 text-right">Times</th>
                <th className="py-2 pr-4 text-right">Minutes each</th>
                <th className="py-2 text-right">Time saved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.rows.map((r) => (
                <tr key={r.type}>
                  <td className="py-2.5 pr-4">
                    <div className="font-semibold text-ink-900">{r.label}</div>
                    <div className="text-[11px] text-slate-400">{r.hint}{r.byGemini > 0 ? ` · ${r.byGemini} written by Gemini AI` : ''}</div>
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{r.count}</td>
                  <td className="py-2.5 pr-4 text-right">
                    {data.canEdit ? (
                      <input type="number" min="0" max="600" value={edit[r.type] ?? r.minutesEach} onChange={(e) => setEdit((x) => ({ ...x, [r.type]: e.target.value }))}
                        className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-sm text-right tabular-nums" aria-label={`Minutes each for ${r.label}`} />
                    ) : <span className="tabular-nums">{r.minutesEach}</span>}
                  </td>
                  <td className="py-2.5 text-right font-semibold text-ink-900 tabular-nums">{fmtTime(r.minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <footer className="px-5 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-slate-500 max-w-xl">{data.note}</p>
        {data.canEdit && changed && (
          <button type="button" onClick={save} disabled={busy} className="px-4 py-2 rounded-xl bg-hyra-700 hover:bg-hyra-800 text-white text-xs font-bold disabled:opacity-60">
            {busy ? 'Saving...' : 'Save minutes'}
          </button>
        )}
      </footer>
      {(msg || error) && <p className={`px-5 pb-4 text-xs font-semibold ${error ? 'text-rose-700' : 'text-emerald-700'}`}>{error || msg}</p>}
    </section>
  );
};
