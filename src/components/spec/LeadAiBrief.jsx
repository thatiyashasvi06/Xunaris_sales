import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../../services/apiClient';

/**
 * AI brief for one lead: who they are, the single next step, and a message that is ready to send.
 * It rewrites itself when the lead's status or priority changes.
 */
export const LeadAiBrief = ({ leadId, signature }) => {
  const [brief, setBrief] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | missing | error
  const [showMsg, setShowMsg] = useState(false);
  const [copied, setCopied] = useState(false);
  const first = useRef(true);

  const load = useCallback(async (refresh = false) => {
    setState((s) => (refresh || s === 'loading' ? 'loading' : s));
    try {
      const b = await apiClient.request(`/lead-ai/leads/${encodeURIComponent(leadId)}${refresh ? '/refresh' : ''}`, refresh ? { method: 'POST' } : undefined);
      setBrief(b);
      setState('ready');
    } catch (e) {
      setState(/not found/i.test(e.message) ? 'missing' : 'error');
    }
  }, [leadId]);

  useEffect(() => { load(false); }, [load]);

  // The lead changed (status or priority): write the brief again
  useEffect(() => {
    if (first.current) { first.current = false; return undefined; }
    const t = setTimeout(() => load(true), 1200);
    return () => clearTimeout(t);
  }, [signature, load]);

  const copy = async () => {
    const text = brief?.message ? `${brief.message.subject ? `Subject: ${brief.message.subject}\n\n` : ''}${brief.message.body}` : '';
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  };

  if (state === 'missing') {
    return <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">The AI brief appears once this lead is saved on the server.</div>;
  }

  return (
    <section className="rounded-2xl border border-hyra-100 bg-hyra-50/50 p-4 space-y-3" aria-label="AI brief">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-ink-900">AI brief</h3>
        <div className="flex items-center gap-2">
          {brief?.engine && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-hyra-100 text-hyra-800">{brief.engine}</span>}
          <button type="button" onClick={() => load(true)} disabled={state === 'loading'} className="text-[11px] font-bold text-hyra-700 disabled:opacity-50">
            {state === 'loading' ? 'Writing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {state === 'error' && <p className="text-xs text-rose-700">The brief could not be written right now. Try Refresh.</p>}

      {brief && (
        <>
          {brief.summary && <p className="text-sm text-slate-700 leading-relaxed">{brief.summary}</p>}
          {brief.companySummary && <p className="text-xs text-slate-500"><span className="font-semibold text-slate-600">About the company:</span> {brief.companySummary}</p>}
          {brief.nextAction && (
            <div className="rounded-xl bg-white border border-hyra-200 px-3.5 py-3">
              <div className="text-[11px] font-bold text-hyra-700">Next step</div>
              <p className="text-sm font-semibold text-ink-900 mt-0.5">{brief.nextAction}</p>
            </div>
          )}
          {brief.message?.body && (
            <div>
              <button type="button" onClick={() => setShowMsg((v) => !v)} className="text-xs font-bold text-hyra-700">
                {showMsg ? 'Hide the ready message' : 'Show the ready message'}
              </button>
              {showMsg && (
                <div className="mt-2 rounded-xl bg-white border border-slate-200 p-3">
                  {brief.message.subject && <div className="text-xs font-bold text-ink-900 mb-1">Subject: {brief.message.subject}</div>}
                  <p className="text-xs text-slate-600 whitespace-pre-line">{brief.message.body}</p>
                  <button type="button" onClick={copy} className="mt-2 px-3 py-1.5 rounded-lg bg-hyra-700 hover:bg-hyra-800 text-white text-[11px] font-bold">{copied ? 'Copied' : 'Copy message'}</button>
                  <span className="ml-2 text-[11px] text-slate-400">Check it, then send it from your email.</span>
                </div>
              )}
            </div>
          )}
          {brief.ai && !brief.ai.configured && <p className="text-[11px] text-slate-400">{brief.ai.note}</p>}
        </>
      )}
    </section>
  );
};
