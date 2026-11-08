import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import { aiService } from '../../services/aiService';
import { AISettingsModal } from './AISettingsModal';
import {
  Sparkles,
  Users,
  Briefcase,
  RotateCcw,
  ChevronDown,
  ShieldCheck,
  Check,
  Menu,
  Zap,
  Globe
} from 'lucide-react';

export const Navbar = ({ onToggleMobileSidebar }) => {
  const { currentUser, switchUser, availableUsers, activeModule, setActiveModule, permissions } = useAuth();
  const { resetLeads } = useCRM();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [resetNotice, setResetNotice] = useState(false);

  const engineStatus = aiService.getEngineLabel();
  const isCRM = activeModule === 'crm';

  const handleResetData = () => {
    if (window.confirm('Reset all leads, jobs, partners, and candidate records to official sample dataset?')) {
      resetLeads();
      setResetNotice(true);
      setTimeout(() => setResetNotice(false), 2000);
      window.location.reload();
    }
  };

  return (
    <>
      <header className={`sticky top-0 z-40 w-full transition-colors duration-200 border-b ${
        isCRM
          ? 'bg-xunaris-navy text-white border-slate-800 shadow-md'
          : 'bg-[#0f172a] text-white border-slate-800 shadow-md'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Dual Branding with Official Logos */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onToggleMobileSidebar}
                className="lg:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                {/* Xunaris Official Brand */}
                <div
                  onClick={() => permissions.canAccessCRM && setActiveModule('crm')}
                  className={`flex items-center gap-2 cursor-pointer transition-opacity ${
                    isCRM ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                  }`}
                  title="Xunaris Technologies"
                >
                  <img
                    src="/xunaris-icon.png"
                    alt="Xunaris"
                    className="h-8 w-8 object-contain rounded-md drop-shadow-[0_0_10px_rgba(0,198,255,0.45)]"
                  />
                  <div className="hidden sm:flex flex-col">
                    <span className="font-extrabold text-white tracking-tight text-sm font-display">
                      XUNARIS
                    </span>
                    <span className="text-[9px] text-cyan-400 font-medium uppercase tracking-wider">
                      Technologies
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-slate-700/80 mx-1"></div>

                {/* HYRA Connect Official Brand */}
                <div
                  onClick={() => permissions.canAccessRecruitment && setActiveModule('recruitment')}
                  className={`flex items-center gap-2 cursor-pointer transition-opacity ${
                    !isCRM ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                  }`}
                  title="HYRA Connect - AI Talent Network"
                >
                  <img
                    src="/hyra-full-logo.png"
                    alt="HYRA Connect"
                    className="h-7 w-auto object-contain drop-shadow-[0_0_10px_rgba(0,198,255,0.45)]"
                  />
                  <div className="hidden lg:flex flex-col">
                    <span className="text-[9px] text-cyan-400 font-medium tracking-wide">
                      AI Talent Network
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Center: Official Module Switcher */}
            <div className="hidden md:flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-700/80">
              <button
                onClick={() => setActiveModule('crm')}
                disabled={!permissions.canAccessCRM}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  isCRM
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : permissions.canAccessCRM
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5 text-cyan-300" />
                <span>Xunaris CRM</span>
              </button>

              <button
                onClick={() => setActiveModule('recruitment')}
                disabled={!permissions.canAccessRecruitment}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  !isCRM
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-sm shadow-amber-500/20'
                    : permissions.canAccessRecruitment
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-amber-300" />
                <span>HYRA Connect</span>
              </button>
            </div>

            {/* Right: AI Mode, Sample Reset & User Persona */}
            <div className="flex items-center gap-2.5">
              {/* AI Engine Status Pill */}
              <button
                onClick={() => setIsAiModalOpen(true)}
                className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border shadow-2xs transition-colors ${
                  engineStatus.isDemo
                    ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                }`}
                title="Configure Live Gemini API or Demo Mode"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{engineStatus.label}</span>
              </button>

              {/* Reset Sample Data */}
              <button
                onClick={handleResetData}
                title="Reset leads and candidates to official baseline records"
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-slate-700/60"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{resetNotice ? 'Data Reset!' : 'Reset Data'}</span>
              </button>

              {/* User Persona Switcher */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 transition-all text-left shadow-2xs"
                >
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-600"
                  />
                  <div className="hidden sm:block">
                    <p className="text-xs font-semibold text-white line-clamp-1 leading-tight">
                      {currentUser.name}
                    </p>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                      {currentUser.role}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {/* Dropdown */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 text-slate-800">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                        Role Persona Switcher
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Test role-based access for Admin, Sales, Partner, Recruiter, and Candidate:
                      </p>
                    </div>

                    <div className="py-1">
                      {availableUsers.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => {
                            switchUser(user.id);
                            setIsUserMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-2 text-left hover:bg-slate-50 transition-colors ${
                            currentUser.id === user.id ? 'bg-blue-50/80 text-blue-900' : 'text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="w-7 h-7 rounded-full object-cover"
                            />
                            <div>
                              <p className="text-xs font-bold">{user.name}</p>
                              <p className="text-[11px] text-slate-500">
                                {user.role} &bull; {user.department}
                              </p>
                            </div>
                          </div>
                          {currentUser.id === user.id && (
                            <Check className="w-4 h-4 text-blue-600" />
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="px-4 pt-2 pb-1 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold text-slate-600">Official Web Theme Active</span>
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsAiModalOpen(true);
                        }}
                        className="text-blue-600 font-semibold hover:underline"
                      >
                        AI Settings
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Module Switcher Bar */}
        <div className="md:hidden flex items-center justify-around border-t border-slate-800 bg-slate-900 px-2 py-1.5">
          <button
            onClick={() => setActiveModule('crm')}
            disabled={!permissions.canAccessCRM}
            className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-colors ${
              isCRM ? 'bg-blue-600 text-white' : 'text-slate-400'
            }`}
          >
            Xunaris CRM
          </button>
          <button
            onClick={() => setActiveModule('recruitment')}
            disabled={!permissions.canAccessRecruitment}
            className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-colors ${
              !isCRM ? 'bg-amber-600 text-white' : 'text-slate-400'
            }`}
          >
            HYRA Connect
          </button>
        </div>
      </header>

      {/* AI Settings Modal */}
      <AISettingsModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />
    </>
  );
};
