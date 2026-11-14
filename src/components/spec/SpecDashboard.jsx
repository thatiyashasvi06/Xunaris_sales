import React, { useState, useEffect, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  FileText,
  Sparkles,
  Filter,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Users,
  Building2,
  Briefcase,
  AlertTriangle,
  Calendar,
  Layers,
  Globe,
  Share2,
  Mail,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  ShieldCheck,
  Check,
  Send
} from 'lucide-react';

export const SpecDashboard = () => {
  const {
    leads,
    opportunities,
    activities,
    campaigns,
    users,
    setActiveNav
  } = useCRM();

  // -------------------------------------------------------------
  // 1. FILTER CONTROLS STATE (Vertical, Date range, Owner, Source, Status)
  // -------------------------------------------------------------
  const [filterVertical, setFilterVertical] = useState('All'); // All | Xunaris | HYRA Connect
  const [filterDateRange, setFilterDateRange] = useState('All'); // All | Today | Week | Month | Quarter | Year
  const [filterOwner, setFilterOwner] = useState('All'); // All | Owner Name | Unassigned
  const [filterSource, setFilterSource] = useState('All'); // All | LinkedIn | Website | Referral | Cold Outreach | Partner
  const [filterStatus, setFilterStatus] = useState('All'); // All | New | Contacted | Qualified | Proposal | Won

  // -------------------------------------------------------------
  // 2. FRESHNESS & AUTO-REFRESH STATE
  // -------------------------------------------------------------
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [refreshIntervalSec, setRefreshIntervalSec] = useState(30); // 30s | 60s | 300s | 0 (off)
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(30);

  // -------------------------------------------------------------
  // 3. "MY ACTIONS" FILTERED LIST MODAL/DRAWER STATE
  // -------------------------------------------------------------
  const [activeActionModal, setActiveActionModal] = useState(null); // 'dueToday' | 'overdue' | 'unassigned' | 'handoff' | null
  const [showSpecMatrix, setShowSpecMatrix] = useState(false);

  // Auto-refresh timer effect
  useEffect(() => {
    if (refreshIntervalSec <= 0) return;

    setSecondsUntilRefresh(refreshIntervalSec);
    const interval = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          triggerRefresh();
          return refreshIntervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [refreshIntervalSec]);

  const triggerRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsRefreshing(false);
      setSecondsUntilRefresh(refreshIntervalSec || 30);
    }, 400);
  };

  const handleResetFilters = () => {
    setFilterVertical('All');
    setFilterDateRange('All');
    setFilterOwner('All');
    setFilterSource('All');
    setFilterStatus('All');
  };

  const activeFiltersCount = [
    filterVertical !== 'All',
    filterDateRange !== 'All',
    filterOwner !== 'All',
    filterSource !== 'All',
    filterStatus !== 'All'
  ].filter(Boolean).length;

  // -------------------------------------------------------------
  // 4. MULTI-DIMENSIONAL FILTER LOGIC
  // -------------------------------------------------------------
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      // Vertical filter
      if (filterVertical === 'Xunaris') {
        const isXun = l.businessVertical === 'Xunaris' || l.verticalCode === 'XUN';
        if (!isXun) return false;
      } else if (filterVertical === 'HYRA Connect') {
        const isHyra = l.businessVertical === 'HYRA Connect' || l.verticalCode === 'HYRA';
        if (!isHyra) return false;
      }

      // Owner filter
      if (filterOwner === 'Unassigned') {
        if (l.ownerName && l.ownerName !== 'Unassigned') return false;
      } else if (filterOwner !== 'All') {
        if (l.ownerName !== filterOwner) return false;
      }

      // Source filter
      if (filterSource !== 'All') {
        if (!l.leadSource?.toLowerCase().includes(filterSource.toLowerCase())) return false;
      }

      // Status filter
      if (filterStatus !== 'All') {
        if (l.status?.toLowerCase() !== filterStatus.toLowerCase()) return false;
      }

      // Date Range filter (simulation on createdAt)
      if (filterDateRange === 'Today') {
        return l.createdAt === '2026-10-17' || l.nextFollowup?.includes('17 Oct');
      } else if (filterDateRange === 'Week') {
        return l.createdAt >= '2026-10-10';
      } else if (filterDateRange === 'Month') {
        return l.createdAt?.startsWith('2026-10') || !l.createdAt;
      }

      return true;
    });
  }, [leads, filterVertical, filterOwner, filterSource, filterStatus, filterDateRange]);

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((o) => {
      // Vertical filter
      if (filterVertical === 'Xunaris') {
        const isXun = o.businessUnit === 'Xunaris' || o.verticalCode === 'XUN';
        if (!isXun) return false;
      } else if (filterVertical === 'HYRA Connect') {
        const isHyra = o.businessUnit === 'HYRA Connect' || o.verticalCode === 'HYRA';
        if (!isHyra) return false;
      }

      // Owner filter
      if (filterOwner === 'Unassigned') {
        if (o.ownerName && o.ownerName !== 'Unassigned') return false;
      } else if (filterOwner !== 'All') {
        if (o.ownerName !== filterOwner) return false;
      }

      // Status filter
      if (filterStatus !== 'All') {
        if (o.stage?.toLowerCase() !== filterStatus.toLowerCase()) return false;
      }

      return true;
    });
  }, [opportunities, filterVertical, filterOwner, filterStatus]);

  const filteredActivities = useMemo(() => {
    return activities.filter((a) => {
      // Owner filter
      if (filterOwner === 'Unassigned') {
        if (a.assignedTo && a.assignedTo !== 'Unassigned') return false;
      } else if (filterOwner !== 'All') {
        if (a.assignedTo !== filterOwner) return false;
      }
      return true;
    });
  }, [activities, filterOwner]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (filterVertical === 'Xunaris' && c.businessUnit !== 'Xunaris') return false;
      if (filterVertical === 'HYRA Connect' && c.businessUnit !== 'HYRA Connect') return false;
      if (filterOwner !== 'All' && c.owner !== filterOwner) return false;
      return true;
    });
  }, [campaigns, filterVertical, filterOwner]);

  // -------------------------------------------------------------
  // 5. KPI TILES CALCULATIONS (6 TILES PER SPECIFICATION)
  // -------------------------------------------------------------
  // 1. New leads
  const kpiNewLeads = filteredLeads.filter((l) => l.status === 'New').length;

  // 2. Qualified leads
  const kpiQualifiedLeads = filteredLeads.filter((l) => l.status === 'Qualified').length;

  // 3. Open opportunities
  const kpiOpenOpps = filteredOpportunities.filter(
    (o) => o.status === 'Open' || (o.stage !== 'Won' && o.stage !== 'Lost')
  ).length;

  // 4. Won value (currency indicated)
  const wonOpps = filteredOpportunities.filter((o) => o.stage === 'Won');
  const kpiWonValueNum = wonOpps.reduce((sum, o) => {
    const val = Number(o.expectedValueNum) || 0;
    return sum + val;
  }, 0);

  // Format currency in INR lakhs or standard
  const formatCurrencyINR = (amount) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    }
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // 5. Overdue tasks
  const kpiOverdueTasks = filteredActivities.filter(
    (a) => a.status === 'Planned' && (a.dateTime?.includes('13 Oct') || a.dateTime?.includes('14 Oct') || a.dateTime?.includes('15 Oct') || a.result?.includes('overdue'))
  ).length + filteredLeads.filter((l) => l.nextFollowup && (l.nextFollowup.includes('15 Oct') || l.nextFollowup.includes('16 Oct'))).length;

  // 6. Campaign responses
  const kpiCampaignResponses = filteredCampaigns.reduce(
    (sum, c) => sum + (Number(c.replies) || 0) + (Number(c.leadsCreated) || 0),
    0
  );

  // -------------------------------------------------------------
  // 6. FUNNEL CHART (New -> Contacted -> Qualified -> Opportunity -> Won)
  // Tracking Unique Lead IDs
  // -------------------------------------------------------------
  // Unique Lead IDs by stage
  const funnelNewIds = filteredLeads.filter((l) => l.status === 'New').map((l) => l.id);
  const funnelContactedIds = filteredLeads.filter((l) => l.status === 'Contacted' || l.status === 'Qualified' || l.status === 'Proposal').map((l) => l.id);
  const funnelQualifiedIds = filteredLeads.filter((l) => l.status === 'Qualified' || l.status === 'Proposal').map((l) => l.id);
  const funnelOpportunityIds = filteredOpportunities.map((o) => o.linkedLeadId || o.id);
  const funnelWonIds = filteredOpportunities.filter((o) => o.stage === 'Won').map((o) => o.linkedLeadId || o.id);

  const funnelStages = [
    {
      stage: 'New',
      count: funnelNewIds.length,
      leadIds: funnelNewIds,
      color: '#0063f2',
      pct: Math.min(100, Math.round((funnelNewIds.length / Math.max(filteredLeads.length, 1)) * 100)),
      desc: 'Captured inquiries'
    },
    {
      stage: 'Contacted',
      count: funnelContactedIds.length,
      leadIds: funnelContactedIds,
      color: '#1d4ed8',
      pct: Math.min(100, Math.round((funnelContactedIds.length / Math.max(filteredLeads.length, 1)) * 100)),
      desc: 'Outreach & discovery'
    },
    {
      stage: 'Qualified',
      count: funnelQualifiedIds.length,
      leadIds: funnelQualifiedIds,
      color: '#4f46e5',
      pct: Math.min(100, Math.round((funnelQualifiedIds.length / Math.max(filteredLeads.length, 1)) * 100)),
      desc: 'Validated budget/authority'
    },
    {
      stage: 'Opportunity',
      count: funnelOpportunityIds.length,
      leadIds: funnelOpportunityIds,
      color: '#06b6d4',
      pct: Math.min(100, Math.round((funnelOpportunityIds.length / Math.max(filteredLeads.length, 1)) * 100)),
      desc: 'Active proposal pipeline'
    },
    {
      stage: 'Won',
      count: funnelWonIds.length,
      leadIds: funnelWonIds,
      color: '#10b981',
      pct: Math.min(100, Math.round((funnelWonIds.length / Math.max(filteredLeads.length, 1)) * 100)),
      desc: 'Closed & contracted'
    }
  ];

  // -------------------------------------------------------------
  // 7. PIPELINE BAR CHART: Value by stage & vertical (Currency indicated)
  // -------------------------------------------------------------
  const pipelineStages = ['Discovery', 'Qualified', 'Proposal', 'Negotiation'];

  const pipelineByStageVertical = pipelineStages.map((stage) => {
    const oppsInStage = filteredOpportunities.filter((o) => o.stage === stage);
    const xunVal = oppsInStage
      .filter((o) => o.businessUnit === 'Xunaris' || o.verticalCode === 'XUN')
      .reduce((sum, o) => sum + (Number(o.expectedValueNum) || 0), 0);
    const hyraVal = oppsInStage
      .filter((o) => o.businessUnit === 'HYRA Connect' || o.verticalCode === 'HYRA')
      .reduce((sum, o) => sum + (Number(o.expectedValueNum) || 0), 0);
    const totalVal = xunVal + hyraVal;
    return {
      stage,
      xunVal,
      hyraVal,
      totalVal
    };
  });

  const maxPipelineVal = Math.max(
    1,
    ...pipelineByStageVertical.map((p) => p.totalVal)
  );

  // -------------------------------------------------------------
  // 8. LEAD SOURCE CHART: Excluding archived & duplicates
  // -------------------------------------------------------------
  // Filter out archived & duplicates
  const cleanLeadsForSource = filteredLeads.filter(
    (l) => l.status !== 'Archived' && !l.isArchived && l.status !== 'Duplicate' && !l.isDuplicate
  );
  const archivedDuplicateCount = filteredLeads.filter(
    (l) => l.status === 'Archived' || l.isArchived || l.status === 'Duplicate' || l.isDuplicate
  ).length;

  const leadSourceMap = {
    LinkedIn: { count: 0, icon: Share2, color: '#0077b5' },
    Website: { count: 0, icon: Globe, color: '#0063f2' },
    Referral: { count: 0, icon: Users, color: '#10b981' },
    'Cold Outreach': { count: 0, icon: Mail, color: '#f59e0b' },
    'Partner Network': { count: 0, icon: Building2, color: '#8b5cf6' },
    Other: { count: 0, icon: Layers, color: '#64748b' }
  };

  cleanLeadsForSource.forEach((l) => {
    const src = l.leadSource || 'Other';
    if (src.includes('LinkedIn')) leadSourceMap.LinkedIn.count += 1;
    else if (src.includes('Website')) leadSourceMap.Website.count += 1;
    else if (src.includes('Referral')) leadSourceMap.Referral.count += 1;
    else if (src.includes('Cold') || src.includes('Outreach')) leadSourceMap['Cold Outreach'].count += 1;
    else if (src.includes('Partner')) leadSourceMap['Partner Network'].count += 1;
    else leadSourceMap.Other.count += 1;
  });

  const totalCleanLeads = Math.max(1, cleanLeadsForSource.length);

  // -------------------------------------------------------------
  // 9. MY ACTIONS: Due today, Overdue, Unassigned, Handoff pending
  // -------------------------------------------------------------
  const actionItemsDueToday = [
    ...filteredActivities.filter(
      (a) => a.dateTime?.includes('17 Oct') || a.result === 'Due today'
    ),
    ...filteredLeads.filter((l) => l.nextFollowup?.includes('17 Oct'))
  ];

  const actionItemsOverdue = [
    ...filteredActivities.filter(
      (a) => a.status === 'Planned' && (a.dateTime?.includes('13 Oct') || a.dateTime?.includes('14 Oct') || a.dateTime?.includes('15 Oct') || a.dateTime?.includes('16 Oct'))
    ),
    ...filteredLeads.filter((l) => l.nextFollowup?.includes('15 Oct') || l.nextFollowup?.includes('16 Oct'))
  ];

  const actionItemsUnassigned = [
    ...filteredLeads.filter(
      (l) => !l.ownerName || l.ownerName === 'Unassigned' || l.ownerEmail === ''
    ),
    ...filteredOpportunities.filter(
      (o) => !o.ownerName || o.ownerName === 'Unassigned'
    )
  ];

  const actionItemsHandoff = [
    ...filteredOpportunities.filter(
      (o) => o.stage === 'Won' || o.status === 'Won' || o.notes?.includes('Handoff')
    )
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* ========================================================= */}
      {/* 1. TOP BRAND BANNER WITH FRESHNESS & AUTO-REFRESH         */}
      {/* ========================================================= */}
      <div className="bg-gradient-to-r from-[#0a1120] via-[#0f172a] to-[#0a1120] border border-slate-800 text-white rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Ambient lighting glow */}
        <div className="absolute -right-20 -top-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl sm:text-2xl tracking-wide text-white">
                XUNARIS
              </span>
              <span className="text-slate-500 font-semibold text-lg">/</span>
              <span className="font-extrabold text-xl sm:text-2xl tracking-wide text-white">
                HYRA CONNECT
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-1 flex items-center gap-2">
              <span>Executive Performance Dashboard</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-mono text-[11px]">Live Multi-Dimensional Analytics</span>
            </p>
          </div>

          {/* FRESHNESS CONTROLS */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Last Updated Timestamp */}
            <div className="bg-slate-900/90 border border-slate-700/80 px-3 py-2 rounded-xl flex items-center gap-2 text-slate-300 shadow-inner">
              <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-mono">Last Updated</span>
                <span className="font-bold font-mono text-white text-[11px]">
                  {lastUpdated.toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* Refresh Interval Selector */}
            <div className="bg-slate-900/90 border border-slate-700/80 px-3 py-2 rounded-xl flex items-center gap-2 shadow-inner">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Interval:</span>
              <select
                value={refreshIntervalSec}
                onChange={(e) => setRefreshIntervalSec(Number(e.target.value))}
                className="bg-transparent text-white font-bold outline-hidden cursor-pointer text-xs"
              >
                <option value={30} className="bg-slate-900">30s Auto</option>
                <option value={60} className="bg-slate-900">1m Auto</option>
                <option value={300} className="bg-slate-900">5m Auto</option>
                <option value={0} className="bg-slate-900">Manual Only</option>
              </select>
              {refreshIntervalSec > 0 && (
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-900/40 px-1.5 py-0.5 rounded border border-cyan-700/40">
                  {secondsUntilRefresh}s
                </span>
              )}
            </div>

            {/* Refresh Now Button */}
            <button
              onClick={triggerRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-xl bg-[#0063f2] hover:bg-blue-600 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              title="Refresh dashboard metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. MULTI-DIMENSIONAL FILTER BAR (Vertical, Date, Owner, Source, Status) */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Global Dimensional Filters
            </h2>
            {activeFiltersCount > 0 && (
              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                {activeFiltersCount} active
              </span>
            )}
          </div>

          {activeFiltersCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset All</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          {/* Filter 1: Vertical */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Vertical
            </label>
            <select
              value={filterVertical}
              onChange={(e) => setFilterVertical(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Verticals</option>
              <option value="Xunaris">Xunaris (IT/SAP)</option>
              <option value="HYRA Connect">HYRA Connect (Staffing)</option>
            </select>
          </div>

          {/* Filter 2: Date Range */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Date Range
            </label>
            <select
              value={filterDateRange}
              onChange={(e) => setFilterDateRange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Time</option>
              <option value="Today">Today ({new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})</option>
              <option value="Week">This Week</option>
              <option value="Month">This Month</option>
              <option value="Quarter">This Quarter</option>
            </select>
          </div>

          {/* Filter 3: Owner */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Owner
            </label>
            <select
              value={filterOwner}
              onChange={(e) => setFilterOwner(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Owners</option>
              <option value="Sales User">Sales User</option>
              <option value="Admin User">Admin User</option>
              <option value="Marketing User">Marketing User</option>
              <option value="Unassigned">Unassigned Only</option>
            </select>
          </div>

          {/* Filter 4: Lead Source */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Lead Source
            </label>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Sources</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Website">Website</option>
              <option value="Referral">Referral</option>
              <option value="Cold Outreach">Cold Outreach</option>
              <option value="Partner">Partner Network</option>
            </select>
          </div>

          {/* Filter 5: Status */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Stage / Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Qualified">Qualified</option>
              <option value="Proposal">Proposal</option>
              <option value="Won">Won</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. KPI TILES (6 TILES PER SPECIFICATION)                  */}
      {/* New leads, Qualified, Open opportunities, Won value, Overdue tasks, Campaign responses */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* TILE 1: New Leads */}
        <div
          onClick={() => setActiveNav('leads')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs cursor-pointer hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">New Leads</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition-colors" />
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-[#0a1120] mt-2 block tracking-tight font-mono group-hover:text-[#0063f2] transition-colors">
            {kpiNewLeads}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Awaiting qualification</span>
        </div>

        {/* TILE 2: Qualified */}
        <div
          onClick={() => setActiveNav('leads')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs cursor-pointer hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Qualified</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition-colors" />
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-[#0a1120] mt-2 block tracking-tight font-mono group-hover:text-[#0063f2] transition-colors">
            {kpiQualifiedLeads}
          </span>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">Sales-ready accounts</span>
        </div>

        {/* TILE 3: Open Opportunities */}
        <div
          onClick={() => setActiveNav('opportunities')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs cursor-pointer hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Open Deals</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition-colors" />
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-[#0a1120] mt-2 block tracking-tight font-mono group-hover:text-[#0063f2] transition-colors">
            {kpiOpenOpps}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Active sales pipeline</span>
        </div>

        {/* TILE 4: Won Value (Currency Indicated) */}
        <div
          onClick={() => setActiveNav('opportunities')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs cursor-pointer hover:border-emerald-400 hover:shadow-md hover:-translate-y-0.5 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Won Value</span>
            <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
              INR (₹)
            </span>
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-2 block tracking-tight font-mono">
            {formatCurrencyINR(kpiWonValueNum)}
          </span>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block truncate">
            {wonOpps.length} deals closed won
          </span>
        </div>

        {/* TILE 5: Overdue Tasks */}
        <div
          onClick={() => setActiveActionModal('overdue')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs cursor-pointer hover:border-rose-400 hover:shadow-md hover:-translate-y-0.5 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Overdue Tasks</span>
            <Clock className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 mt-2 block tracking-tight font-mono">
            {kpiOverdueTasks}
          </span>
          <span className="text-[10px] text-rose-600 font-semibold mt-1 block flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5" /> Past due deadline
          </span>
        </div>

        {/* TILE 6: Campaign Responses */}
        <div
          onClick={() => setActiveNav('campaigns')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs cursor-pointer hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Responses</span>
            <Send className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600 mt-2 block tracking-tight font-mono">
            {kpiCampaignResponses}
          </span>
          <span className="text-[10px] text-indigo-600 font-semibold mt-1 block">
            Campaign outreach
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. VISUAL CHARTS ROW: FUNNEL + PIPELINE VALUE BY VERTICAL  */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: FUNNEL (New -> Contacted -> Qualified -> Opportunity -> Won) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-[#0a1120] tracking-tight flex items-center gap-2">
                <span>Lead-to-Won Funnel</span>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  Unique Lead IDs
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                New &rarr; Contacted &rarr; Qualified &rarr; Opportunity &rarr; Won
              </p>
            </div>
            <span className="text-xs font-bold font-mono text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
              {filteredLeads.length} Total Leads
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {funnelStages.map((stage) => {
              return (
                <div key={stage.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                      <strong>{stage.stage}</strong>
                      <span className="text-[10px] text-slate-400 font-normal">({stage.desc})</span>
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-slate-900 font-bold">{stage.count} Unique IDs</span>
                      <span className="text-[10px] text-slate-500 font-bold w-10 text-right">
                        {stage.pct}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 h-5 rounded-lg overflow-hidden p-0.5 flex items-center">
                    <div
                      style={{
                        width: `${stage.pct}%`,
                        backgroundColor: stage.color
                      }}
                      className="h-full rounded-md transition-all duration-500 shadow-2xs"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CHART 2: PIPELINE BAR CHART BY STAGE & VERTICAL (Currency Indicated) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-[#0a1120] tracking-tight flex items-center gap-2">
                <span>Pipeline Value by Vertical</span>
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Currency: INR (₹)
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Open opportunity monetary value grouped by stage & business unit
              </p>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-3 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-[#0063f2]">
                <span className="w-2.5 h-2.5 rounded bg-[#0063f2]" /> Xunaris
              </span>
              <span className="flex items-center gap-1 text-[#06b6d4]">
                <span className="w-2.5 h-2.5 rounded bg-[#06b6d4]" /> HYRA Connect
              </span>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {pipelineByStageVertical.map((item) => {
              const xunPct = Math.round((item.xunVal / maxPipelineVal) * 100);
              const hyraPct = Math.round((item.hyraVal / maxPipelineVal) * 100);

              return (
                <div key={item.stage} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800 font-bold">{item.stage}</span>
                    <span className="font-mono font-bold text-slate-900">
                      Total: {formatCurrencyINR(item.totalVal)}
                    </span>
                  </div>

                  {/* Dual comparative bar */}
                  <div className="space-y-1">
                    {/* Xunaris Bar */}
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="w-12 text-slate-400 font-medium">Xunaris</span>
                      <div className="flex-1 bg-slate-100 h-3 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.max(5, xunPct)}%` }}
                          className="h-full bg-[#0063f2] rounded-full transition-all duration-500"
                        />
                      </div>
                      <span className="w-16 text-right font-mono text-slate-700 font-semibold">
                        {formatCurrencyINR(item.xunVal)}
                      </span>
                    </div>

                    {/* HYRA Connect Bar */}
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="w-12 text-slate-400 font-medium">HYRA</span>
                      <div className="flex-1 bg-slate-100 h-3 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.max(5, hyraPct)}%` }}
                          className="h-full bg-[#06b6d4] rounded-full transition-all duration-500"
                        />
                      </div>
                      <span className="w-16 text-right font-mono text-slate-700 font-semibold">
                        {formatCurrencyINR(item.hyraVal)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. LEAD SOURCE CHART (Excluding archived & duplicates)    */}
      {/* ========================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4 hover:shadow-md transition-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold text-[#0a1120] tracking-tight flex items-center gap-2">
              <span>Lead Source Distribution</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Excludes Archived & Duplicates
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified active leads categorized by acquisition channel
            </p>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {cleanLeadsForSource.length} Active Leads ({archivedDuplicateCount} Excluded)
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {Object.entries(leadSourceMap).map(([sourceName, data]) => {
            const Icon = data.icon;
            const pct = Math.round((data.count / totalCleanLeads) * 100);

            return (
              <div
                key={sourceName}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-white shadow-xs"
                      style={{ backgroundColor: data.color }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">{sourceName}</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-slate-900">
                    {data.count} ({pct}%)
                  </span>
                </div>

                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    style={{
                      width: `${pct}%`,
                      backgroundColor: data.color
                    }}
                    className="h-full rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 6. MY ACTIONS CENTER: Click opens filtered list           */}
      {/* Due today, overdue, unassigned and handoff pending        */}
      {/* ========================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-[#0a1120] tracking-tight flex items-center gap-2">
              <span>My Actions Center</span>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                Click Tile Opens Filtered List
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Prioritized operational workflow triggers across your accounts
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-1">
          {/* ACTION 1: Due Today */}
          <button
            type="button"
            onClick={() => setActiveActionModal('dueToday')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer group ${
              activeActionModal === 'dueToday'
                ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20'
                : 'bg-white border-slate-200/90 hover:border-blue-400 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600">Due Today</span>
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-2xl font-extrabold text-[#0a1120] font-mono block">
              {actionItemsDueToday.length}
            </span>
            <span className="text-[10px] text-blue-600 font-semibold mt-1 block">
              Click to view list &rarr;
            </span>
          </button>

          {/* ACTION 2: Overdue */}
          <button
            type="button"
            onClick={() => setActiveActionModal('overdue')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer group ${
              activeActionModal === 'overdue'
                ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500/20'
                : 'bg-white border-slate-200/90 hover:border-rose-400 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600">Overdue</span>
              <Clock className="w-4 h-4 text-rose-600" />
            </div>
            <span className="text-2xl font-extrabold text-rose-600 font-mono block">
              {actionItemsOverdue.length}
            </span>
            <span className="text-[10px] text-rose-600 font-semibold mt-1 block">
              Click to view list &rarr;
            </span>
          </button>

          {/* ACTION 3: Unassigned */}
          <button
            type="button"
            onClick={() => setActiveActionModal('unassigned')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer group ${
              activeActionModal === 'unassigned'
                ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/20'
                : 'bg-white border-slate-200/90 hover:border-amber-400 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600">Unassigned</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-2xl font-extrabold text-amber-600 font-mono block">
              {actionItemsUnassigned.length}
            </span>
            <span className="text-[10px] text-amber-700 font-semibold mt-1 block">
              Click to view list &rarr;
            </span>
          </button>

          {/* ACTION 4: Handoff Pending */}
          <button
            type="button"
            onClick={() => setActiveActionModal('handoff')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer group ${
              activeActionModal === 'handoff'
                ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-200/90 hover:border-emerald-400 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600">Handoff Pending</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-2xl font-extrabold text-emerald-600 font-mono block">
              {actionItemsHandoff.length}
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
              Click to view list &rarr;
            </span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* INTERACTIVE FILTERED ACTION LIST DRAWER                   */}
        {/* ========================================================= */}
        {activeActionModal && (
          <div className="mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 transition-all animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-[#0a1120]">
                  Filtered List:{' '}
                  {activeActionModal === 'dueToday'
                    ? 'Actions Due Today'
                    : activeActionModal === 'overdue'
                    ? 'Overdue Follow-ups & Tasks'
                    : activeActionModal === 'unassigned'
                    ? 'Unassigned Mandates & Leads'
                    : 'Won Deals Pending Delivery / Staffing Handoff'}
                </span>
                <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-300">
                  {activeActionModal === 'dueToday'
                    ? actionItemsDueToday.length
                    : activeActionModal === 'overdue'
                    ? actionItemsOverdue.length
                    : activeActionModal === 'unassigned'
                    ? actionItemsUnassigned.length
                    : actionItemsHandoff.length}{' '}
                  items
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveActionModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List entries */}
            <div className="divide-y divide-slate-200 max-h-60 overflow-y-auto">
              {activeActionModal === 'dueToday' &&
                actionItemsDueToday.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">
                        {item.subject || item.companyName}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {item.relatedTo || item.service} &bull; Due: {item.dateTime || item.nextFollowup}
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveNav('activities')}
                      className="px-2.5 py-1 text-[11px] font-bold text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      Open in Activities
                    </button>
                  </div>
                ))}

              {activeActionModal === 'overdue' &&
                actionItemsOverdue.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <p className="font-bold text-slate-800">
                          {item.subject || item.companyName}
                        </p>
                      </div>
                      <p className="text-[11px] text-rose-600 font-medium">
                        Scheduled: {item.dateTime || item.nextFollowup} &bull; Owner: {item.assignedTo || item.ownerName}
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveNav('activities')}
                      className="px-2.5 py-1 text-[11px] font-bold text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      Resolve Overdue
                    </button>
                  </div>
                ))}

              {activeActionModal === 'unassigned' &&
                actionItemsUnassigned.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">
                        {item.companyName || item.title}
                      </p>
                      <p className="text-[11px] text-amber-700 font-medium">
                        Vertical: {item.businessVertical || item.businessUnit} &bull; Priority: {item.priority || 'High'}
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveNav('leads')}
                      className="px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
                    >
                      Assign Owner
                    </button>
                  </div>
                ))}

              {activeActionModal === 'handoff' &&
                actionItemsHandoff.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">
                        {item.title || item.opportunityName}
                      </p>
                      <p className="text-[11px] text-emerald-700 font-medium font-mono">
                        Value: {formatCurrencyINR(item.expectedValueNum || 0)} &bull; {item.companyName}
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveNav('opportunities')}
                      className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors"
                    >
                      Complete Handoff
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
