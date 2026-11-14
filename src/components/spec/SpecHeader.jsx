import React from 'react';
import { useCRM } from '../../context/CRMContext';

/** Page title, one line of help, and the page's actions. The first action is the primary one. */
export const SpecHeader = ({ title, subtitle, actionButtons = [] }) => {
  const { currentUser } = useCRM();
  const initials = (currentUser?.name || '?').split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  const role = currentUser?.teamRole || (currentUser?.role === 'ADMIN' ? 'Admin' : '');

  return (
    <div className="mb-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[28px] sm:text-[32px] leading-tight font-bold text-ink-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-1.5 max-w-2xl">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2.5 bg-white border border-[#E6E9F2] rounded-full pl-1.5 pr-4 py-1.5 shrink-0" title={currentUser?.email}>
          <span className="w-8 h-8 rounded-full bg-ink-900 text-white text-xs font-bold flex items-center justify-center">{initials}</span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold text-ink-900">{currentUser?.name || 'You'}</span>
            {role && <span className="block text-[11px] text-slate-500">{role}</span>}
          </span>
        </div>
      </div>

      {actionButtons.length > 0 && (
        <div className="flex flex-wrap items-center gap-2.5">
          {actionButtons.map((btn, idx) => (
            <button
              key={idx}
              type="button"
              onClick={btn.onClick}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                btn.variant === 'secondary'
                  ? 'bg-white text-ink-900 border border-slate-300 hover:bg-slate-50'
                  : 'bg-hyra-700 text-white hover:bg-hyra-800'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
