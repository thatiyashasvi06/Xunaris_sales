import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import { useRecruitment } from '../../context/RecruitmentContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  Kanban,
  CalendarClock,
  Briefcase,
  UserCheck,
  UserPlus,
  Send,
  FileCheck,
  Award,
  Sparkles,
  Layers,
  Globe,
  SlidersHorizontal,
  X
} from 'lucide-react';

export const Sidebar = ({ mobileOpen, onCloseMobile }) => {
  const { activeModule, currentUser, permissions } = useAuth();
  const { activeTab: crmTab, setActiveTab: setCrmTab, metrics: crmMetrics } = useCRM();
  const {
    activeTab: recruitTab,
    setActiveTab: setRecruitTab,
    metrics: recruitMetrics
  } = useRecruitment();

  const isCRM = activeModule === 'crm';

  const crmNavItems = [
    {
      id: 'leads',
      label: 'All Leads',
      icon: Users,
      badge: crmMetrics.totalLeads
    },
    {
      id: 'pipeline',
      label: 'Sales Pipeline',
      icon: Kanban,
      badge: crmMetrics.qualifiedLeads + crmMetrics.proposalLeads
    },
    {
      id: 'followups',
      label: 'Follow-up Tracker',
      icon: CalendarClock,
      badge: crmMetrics.urgentCount,
      badgeColor: 'bg-rose-500 text-white'
    }
  ];

  const recruitmentNavItems = [
    {
      id: 'jobs',
      label: 'Job Postings',
      icon: Briefcase,
      badge: recruitMetrics.pendingJobs > 0 && permissions.canApproveJobs ? `${recruitMetrics.pendingJobs} Pending` : recruitMetrics.totalJobs,
      badgeColor: recruitMetrics.pendingJobs > 0 && permissions.canApproveJobs ? 'bg-amber-500 text-white animate-pulse' : undefined
    },
    {
      id: 'candidates',
      label: 'Candidate Pipeline',
      icon: UserCheck,
      badge: recruitMetrics.totalCandidates
    },
    {
      id: 'partners',
      label: 'Partner Onboarding',
      icon: Building2,
      badge: recruitMetrics.pendingPartners > 0 && permissions.canApprovePartners ? `${recruitMetrics.pendingPartners} Review` : recruitMetrics.totalPartners,
      badgeColor: recruitMetrics.pendingPartners > 0 && permissions.canApprovePartners ? 'bg-amber-500 text-white' : undefined,
      visible: permissions.canApprovePartners || permissions.isPartner
    },
    {
      id: 'recruiters',
      label: 'Recruiter Team',
      icon: UserPlus,
      badge: recruitMetrics.recruiters?.length || 3,
      visible: permissions.canInviteRecruiters
    },
    {
      id: 'portal',
      label: 'Candidate Job Board',
      icon: Globe,
      badge: 'Public View'
    }
  ];

  const navItems = isCRM
    ? crmNavItems
    : recruitmentNavItems.filter(item => item.visible === undefined || item.visible);

  const activeTab = isCRM ? crmTab : recruitTab;
  const setActiveTab = (id) => {
    if (isCRM) {
      setCrmTab(id);
    } else {
      setRecruitTab(id);
    }
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200/90 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Module Header Pill */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isCRM ? 'bg-hyra-700 ring-4 ring-hyra-100' : 'bg-teal-600 ring-4 ring-teal-100'
              }`}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {isCRM ? 'Xunaris CRM Suite' : 'HYRA Connect Portal'}
            </span>
          </div>

          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1 text-slate-400 hover:text-slate-700 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? isCRM
                      ? 'bg-hyra-700 text-white shadow-sm font-semibold'
                      : 'bg-teal-600 text-white shadow-sm shadow-teal-500/20 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                      item.badgeColor
                        ? item.badgeColor
                        : isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Role & Payroll Status Footer Box */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 m-3 rounded-2xl">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Active Role:</span>
            <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
              {currentUser.role}
            </span>
          </div>

          {!isCRM && (
            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
              <span>Payroll Systems:</span>
              <span className="font-semibold text-teal-700">Xunaris &bull; Partner</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
