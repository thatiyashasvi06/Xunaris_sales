import React from 'react';
import { useRecruitment } from '../../context/RecruitmentContext';
import { useAuth } from '../../context/AuthContext';
import { MetricCard } from '../common/MetricCard';
import { JobPostings } from '../recruitment/JobPostings';
import { CandidatePipeline } from '../recruitment/CandidatePipeline';
import { PartnerManagement } from '../recruitment/PartnerManagement';
import { RecruiterInvites } from '../recruitment/RecruiterInvites';
import { CandidatePortal } from '../recruitment/CandidatePortal';
import hyraFullLogoImg from '../../assets/hyra-full-logo.png';
import {
  Briefcase,
  Users,
  Building2,
  ShieldCheck,
  Sparkles,
  Layers,
  CheckCircle2
} from 'lucide-react';

export const RecruitmentDashboard = () => {
  const { metrics, activeTab, setActiveTab } = useRecruitment();
  const { permissions } = useAuth();

  return (
    <div className="space-y-6">
      {/* Official HYRA Connect Header */}
      <div className="bg-[#0f172a] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="px-5 py-3 rounded-2xl bg-[#0a1120]/90 border border-cyan-500/30 shadow-xl shadow-cyan-950/40 shrink-0 flex items-center justify-center">
              <img
                src={hyraFullLogoImg}
                alt="HYRA Connect"
                className="h-10 sm:h-12 w-auto object-contain drop-shadow-[0_0_16px_rgba(0,198,255,0.45)]"
              />
            </div>
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800/80 text-cyan-300 border border-cyan-500/30">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                HYRA Connect &bull; AI Talent Network & Dual Payroll Workflows
              </div>

              <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight font-display">
                Trusted Networks &bull; AI Signals &bull;{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-200">
                  Build Elite Teams
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-slate-300">
                Partner agency vetting, duplicate-validated recruiter sourcing, AI candidate scoring, and dual payroll management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('portal')}
              className="px-4 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-sm transition-all"
            >
              Careers Job Board
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className="px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all"
            >
              Manage Postings
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <MetricCard
          title="Active Jobs"
          value={metrics.totalJobs}
          subtitle={`${metrics.approvedJobs} Approved • ${metrics.pendingJobs} Pending`}
          icon={Briefcase}
          color="amber"
          onClick={() => setActiveTab('jobs')}
        />

        <MetricCard
          title="Talent Pool"
          value={metrics.totalCandidates}
          subtitle={`${metrics.shortlistedCandidates} Shortlisted`}
          icon={Users}
          color="blue"
          onClick={() => setActiveTab('candidates')}
        />

        <MetricCard
          title="Partner Agencies"
          value={metrics.totalPartners}
          subtitle={`${metrics.approvedPartners} Approved`}
          icon={Building2}
          color="purple"
          onClick={() => setActiveTab('partners')}
        />

        <MetricCard
          title="Payroll Model Ratio"
          value={`${metrics.xunarisPayrollJobs} / ${metrics.partnerPayrollJobs}`}
          subtitle="Xunaris vs Partner Payroll"
          icon={ShieldCheck}
          color="emerald"
          onClick={() => setActiveTab('jobs')}
        />
      </div>

      {/* Tab Panels */}
      {activeTab === 'jobs' && <JobPostings />}
      {activeTab === 'candidates' && <CandidatePipeline />}
      {activeTab === 'partners' && <PartnerManagement />}
      {activeTab === 'recruiters' && <RecruiterInvites />}
      {activeTab === 'portal' && <CandidatePortal />}
    </div>
  );
};
