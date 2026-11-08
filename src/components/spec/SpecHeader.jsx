import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { ChevronDown, Check, RotateCcw } from 'lucide-react';

export const SpecHeader = ({ title, subtitle, actionButtons = [] }) => {
  const { currentUser, switchUser, users, resetToSpecification, clearAllTestData } = useCRM();
  const [userDropdown, setUserDropdown] = useState(false);

  return (
    <div className="space-y-4 mb-6">
      {/* Top row: Page Title & User Persona Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0d2238] tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              {subtitle}
            </p>
          )}
        </div>

        {/* Top Right User Info & Persona Switcher */}
        <div className="relative">
          <div className="flex items-center text-xs sm:text-sm font-medium text-slate-600">
            <button
              onClick={() => setUserDropdown(!userDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 hover:text-slate-900 font-semibold transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{currentUser?.name || 'Sales User'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* Quick User Switcher Menu */}
          {userDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-xs">
              <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                Switch Role / User
              </div>
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    switchUser(u.id);
                    setUserDropdown(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition-colors ${
                    currentUser.id === u.id ? 'bg-blue-50 text-blue-800 font-bold' : 'text-slate-700'
                  }`}
                >
                  <div>
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-[10px] text-slate-500">{u.role} &bull; {u.department}</p>
                  </div>
                  {currentUser.id === u.id && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              ))}

              <div className="pt-1.5 mt-1 border-t border-slate-100 px-3 space-y-1">
                <button
                  onClick={() => {
                    if (window.confirm('Clear all sample leads, deals, companies, and activities for live testing?')) {
                      clearAllTestData();
                      setUserDropdown(false);
                    }
                  }}
                  className="w-full text-left py-1 text-[11px] text-rose-600 hover:text-rose-800 flex items-center gap-1.5 font-semibold"
                >
                  <RotateCcw className="w-3 h-3 text-rose-500" />
                  <span>Clear Test Data (Live Testing)</span>
                </button>
                <button
                  onClick={() => {
                    resetToSpecification();
                    setUserDropdown(false);
                  }}
                  className="w-full text-left py-1 text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3 h-3 text-slate-400" />
                  <span>Reload Mockup Sample Data</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons Row (Xunaris Primary Blue Buttons) */}
      {actionButtons.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {actionButtons.map((btn, idx) => (
            <button
              key={idx}
              onClick={btn.onClick}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-xs ${
                btn.variant === 'secondary'
                  ? 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 shadow-2xs'
                  : 'bg-[#0063f2] text-white hover:bg-[#0052cc] shadow-blue-500/25 hover:shadow-md hover:shadow-blue-500/30 active:scale-[0.98]'
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
