import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { XunarisLogo } from '../common/XunarisLogo';
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  CalendarCheck,
  Send,
  BarChart3,
  Settings,
  LogOut,
  Terminal,
  Database
} from 'lucide-react';

export const SpecSidebar = () => {
  const { activeNav, setActiveNav, currentUser, setIsLoggedIn } = useCRM();

  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'companies', label: 'Companies & Contacts', icon: Building2 },
    { id: 'opportunities', label: 'Opportunities', icon: Briefcase },
    { id: 'activities', label: 'Activities', icon: CalendarCheck },
    { id: 'campaigns', label: 'Campaigns', icon: Send },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'admin', label: 'Admin Settings', icon: Settings, adminOnly: true }
  ];

  // Enforce specification: Settings Admin only
  const crmNavItems = allNavItems.filter(item => !item.adminOnly || currentUser?.role === 'ADMIN');

  return (
    <aside className="w-64 bg-[#0a1120] text-white flex flex-col shrink-0 min-h-full h-full select-none border-r border-slate-800/80 font-sans">
      <div className="sticky top-0 flex flex-col h-screen max-h-screen">
        {/* Official Xunaris Logo Brand Header */}
        <div className="p-5 border-b border-slate-800/80 bg-gradient-to-b from-slate-900/60 to-transparent shrink-0">
          <XunarisLogo size="default" />
        </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
          CRM MODULE
        </div>
        {crmNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#0063f2] text-white font-bold shadow-md shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
              {item.badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 font-mono ml-auto">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Developer & Backend Swagger API Section */}
        <div className="pt-5 px-3 pb-1.5 text-[10px] font-bold tracking-wider text-emerald-400/90 uppercase flex items-center justify-between">
          <span>DEVELOPER & BACKEND</span>
          <span className="text-[9px] bg-emerald-400/15 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.2 rounded font-mono">PORT 5000</span>
        </div>
        {(() => {
          const isActive = activeNav === 'swagger';
          return (
            <button
              onClick={() => setActiveNav('swagger')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-md shadow-emerald-900/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">Swagger REST API</span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 shrink-0 ml-1">
                LIVE
              </span>
            </button>
          );
        })()}
      </nav>

      {/* Role Indicator & Sign Out Footer */}
      <div className="p-3.5 m-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400 shadow-inner space-y-2.5 shrink-0">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-400 font-medium text-[11px]">Server Assigned:</span>
            </div>
            <span className={`font-bold px-2 py-0.5 rounded-lg text-[10px] ${
              currentUser?.role === 'ADMIN'
                ? 'text-amber-300 bg-amber-500/20 border border-amber-500/40'
                : 'text-cyan-300 bg-cyan-500/20 border border-cyan-500/40'
            }`}>
              {currentUser?.role || 'USER'}
            </span>
          </div>

          <p className="text-[12px] text-white font-semibold mt-1.5 truncate">
            {currentUser?.name}
          </p>
          <p className="text-[10px] text-slate-400 truncate font-mono">
            {currentUser?.email}
          </p>

          <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-col gap-1 text-[10px]">
            <div className="flex items-center justify-between text-slate-400">
              <span>Function Access:</span>
              <span className="font-semibold text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded">
                {currentUser?.functionAccess || (currentUser?.role === 'ADMIN' ? 'Both' : 'Sales')}
              </span>
            </div>
            <div className="flex items-center justify-between text-[9px] text-slate-400">
              <span>Scope Enforced:</span>
              <span className="font-medium text-emerald-400">
                {currentUser?.role === 'ADMIN' ? 'Global Organization' : 'Owner / Team Scope'}
              </span>
            </div>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={() => setIsLoggedIn(false)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-600/80 border border-rose-500/20 hover:border-rose-500/60 transition-all active:scale-[0.98] group cursor-pointer"
          title="Sign out of CRM session"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-400 group-hover:text-white transition-colors" />
          <span>Sign Out</span>
        </button>
      </div>
      </div>
    </aside>
  );
};
