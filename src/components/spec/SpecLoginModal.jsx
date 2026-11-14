import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { apiClient } from '../../services/apiClient';
import xunarisLogo from '../../assets/xunaris-full-logo.png';
import hyraLogo from '../../assets/hyra-full-logo.png';

/**
 * Sign in. Passwords are checked by the server. Accounts are created by an administrator,
 * so there is no sign-up or self-service reset here.
 */
export const SpecLoginModal = () => {
  const { setIsLoggedIn, setCurrentUser } = useCRM();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) { setError('Enter your work email address.'); return; }
    if (!password) { setError('Enter your password.'); return; }
    setBusy(true); setError('');
    try {
      const res = await apiClient.login(clean, password);
      setCurrentUser(res.user);
      setIsLoggedIn(true);
    } catch (err) {
      setError(err.message || 'Could not sign in. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-canvas">
      {/* Brand side */}
      <aside className="hidden lg:flex flex-col justify-between bg-ink-900 text-white p-12 xl:p-16">
        <div className="flex items-center gap-4">
          <img src={xunarisLogo} alt="Xunaris" className="h-9 w-auto" />
          <span className="w-px h-8 bg-white/20" />
          <span className="bg-white rounded-xl px-4 py-2.5 flex items-center"><img src={hyraLogo} alt="HYRA Connect" className="h-8 w-auto" /></span>
        </div>
        <div className="max-w-md">
          <h1 className="text-[40px] leading-[1.1] font-bold tracking-tight">One CRM for IT services and staffing.</h1>
          <p className="mt-5 text-lg text-slate-300 leading-relaxed">
            Leads are routed to the right person, briefed by AI, and followed up on time, so your team spends its day selling.
          </p>
        </div>
        <p className="text-sm text-slate-400">Xunaris Technology Services &middot; HYRA Connect Staffing</p>
      </aside>

      {/* Form side */}
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <span className="bg-ink-900 rounded-lg px-3 py-2 flex items-center"><img src={xunarisLogo} alt="Xunaris" className="h-6 w-auto" /></span>
            <span className="w-px h-6 bg-slate-300" />
            <img src={hyraLogo} alt="HYRA Connect" className="h-8 w-auto" />
          </div>

          <h2 className="text-[28px] font-bold text-ink-900 tracking-tight">Sign in</h2>
          <p className="text-sm text-slate-500 mt-1.5">Use your work email and the password your administrator gave you.</p>

          <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
            <label className="block">
              <span className="text-sm font-semibold text-ink-900">Work email</span>
              <input
                type="email" autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="name@xunaris.com"
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] text-ink-900 placeholder:text-slate-400 focus:outline-hidden focus:border-hyra-600 focus:ring-4 focus:ring-hyra-100"
              />
            </label>

            <label className="block">
              <span className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink-900">Password</span>
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-xs font-semibold text-hyra-700 hover:text-hyra-800">
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </span>
              <input
                type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] text-ink-900 placeholder:text-slate-400 focus:outline-hidden focus:border-hyra-600 focus:ring-4 focus:ring-hyra-100"
              />
            </label>

            {error && <p role="alert" className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700">{error}</p>}

            <button type="submit" disabled={busy} className="w-full rounded-xl bg-hyra-700 hover:bg-hyra-800 disabled:opacity-60 text-white font-semibold text-[15px] py-3.5 transition-colors">
              {busy ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 text-sm text-slate-500">
            Forgot your password, or need an account? Ask your administrator.
          </p>
        </div>
      </main>
    </div>
  );
};
