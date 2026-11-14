import React, { useEffect, useMemo, useState } from 'react';

/** Public page opened from the link in outreach emails: /book/:token. No login. */
export const PublicBooking = ({ token }) => {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState('');
  const [done, setDone] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/public/book/${token}`)
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; })
      .then(setInfo)
      .catch((e) => setError(e.message));
  }, [token]);

  const byDay = useMemo(() => {
    const g = {};
    (info?.slots || []).forEach((s) => {
      const k = new Date(s).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' });
      (g[k] = g[k] || []).push(s);
    });
    return Object.entries(g).slice(0, 5);
  }, [info]);

  const confirm = async () => {
    setSaving(true); setError('');
    try {
      const r = await fetch(`/api/public/book/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slot: picked }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setDone(d);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const time = (s) => new Date(s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  const full = (s) => new Date(s).toLocaleString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center p-4 sm:p-10">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="text-xs font-bold tracking-wider text-orange-600 uppercase">HYRA Connect Staffing</div>
        <h1 className="text-2xl font-extrabold text-[#0d2238] mt-1">Book a 30-minute intro call</h1>

        {error && <p className="mt-4 text-sm font-semibold text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        {!info && !error && <p className="mt-4 text-sm text-slate-500">Loading available times...</p>}

        {done && (
          <div className="mt-5 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <p className="font-bold text-emerald-800">You are booked, {done.contact_name}.</p>
            <p className="text-sm text-emerald-700 mt-1">{full(done.start)} IST. Our team will reach out with the call details.</p>
          </div>
        )}

        {info?.status === 'Booked' && !done && (
          <div className="mt-5 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
            A call is already booked for {full(info.slot_start)} IST.
          </div>
        )}

        {info?.status === 'Open' && !done && (
          <>
            <p className="text-sm text-slate-500 mt-1">Hi {info.contact_name}, pick a time that works for you and {info.company_name}. Times are in IST.</p>
            <div className="mt-5 space-y-4">
              {byDay.map(([day, slots]) => (
                <div key={day}>
                  <div className="text-xs font-bold text-slate-500 mb-1.5">{day}</div>
                  <div className="flex flex-wrap gap-2">
                    {slots.map((s) => (
                      <button key={s} onClick={() => setPicked(s)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${picked === s ? 'bg-[#0063f2] text-white border-[#0063f2]' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'}`}>
                        {time(s)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button disabled={!picked || saving} onClick={confirm}
              className="mt-6 w-full py-3 rounded-xl bg-orange-600 text-white font-bold disabled:opacity-50">
              {saving ? 'Booking...' : picked ? `Confirm ${time(picked)}` : 'Choose a time'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
