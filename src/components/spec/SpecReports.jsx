import React, { useState, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { SpecHeader } from './SpecHeader';
import { excelService } from '../../services/excelService';
import { CheckCircle2, Download, ArrowUpRight, Filter, RefreshCw } from 'lucide-react';

export const SpecReports = () => {
  const { reports, leads, opportunities, activities, campaigns, users, setActiveNav } = useCRM();

  const [reportType, setReportType] = useState('All Reports');
  const [businessUnit, setBusinessUnit] = useState('Both');
  const [dateRange, setDateRange] = useState('01-31 Oct 2026');
  const [owner, setOwner] = useState('All permitted users');
  const [leadSource, setLeadSource] = useState('All');
  const [status, setStatus] = useState('All');

  const [notice, setNotice] = useState('');

  // Dynamic filter logic
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (businessUnit !== 'Both' && l.businessVertical !== businessUnit) return false;
      if (owner !== 'All permitted users' && l.ownerName !== owner) return false;
      if (leadSource !== 'All' && l.leadSource !== leadSource) return false;
      if (status !== 'All' && l.status !== status) return false;
      return true;
    });
  }, [leads, businessUnit, owner, leadSource, status]);

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(o => {
      if (businessUnit !== 'Both' && o.businessUnit !== businessUnit) return false;
      if (owner !== 'All permitted users' && o.ownerName !== owner) return false;
      return true;
    });
  }, [opportunities, businessUnit, owner]);

  const filteredActivities = useMemo(() => {
    return activities.filter(a => {
      if (owner !== 'All permitted users' && a.assignedTo !== owner) return false;
      return true;
    });
  }, [activities, owner]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      if (businessUnit !== 'Both' && c.businessUnit !== businessUnit) return false;
      if (owner !== 'All permitted users' && c.owner !== owner) return false;
      return true;
    });
  }, [campaigns, businessUnit, owner]);

  // Dynamic calculations
  const totalLeads = filteredLeads.length;
  const qualifiedLeads = filteredLeads.filter(l => l.status === 'Qualified').length;
  const conversionRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;

  const openOpps = filteredOpportunities.filter(o => o.status === 'Open' || o.stage !== 'Won' && o.stage !== 'Lost');
  const openPipelineValue = openOpps.reduce((sum, o) => sum + (o.expectedValueNum || 0), 0);
  const formattedPipeline = openPipelineValue > 0 ? `INR ${openPipelineValue.toLocaleString('en-IN')}` : 'INR 0';

  const plannedFollowups = filteredActivities.filter(a => a.status === 'Planned').length;
  const totalReplies = filteredCampaigns.reduce((sum, c) => sum + (Number(c.replies) || 0), 0);
  const wonDeals = filteredOpportunities.filter(o => o.stage === 'Won').length;

  // Dynamically constructed report rows
  const dynamicReportRows = [
    {
      id: 'REP-001',
      report: 'Lead conversion',
      metric: 'Qualified / total',
      value: `${conversionRate}% (${qualifiedLeads}/${totalLeads})`,
      action: 'Export',
      type: 'Lead funnel',
      onClick: () => {
        excelService.exportLeadsToExcel(filteredLeads);
        setNotice('Exported qualified leads dataset to Excel!');
        setTimeout(() => setNotice(''), 3000);
      }
    },
    {
      id: 'REP-002',
      report: 'Sales pipeline',
      metric: 'Open value',
      value: formattedPipeline,
      action: 'Export',
      type: 'Pipeline',
      onClick: () => {
        excelService.exportCustomData(
          filteredOpportunities.map(o => ({
            ID: o.id,
            Unit: o.businessUnit,
            Title: o.title,
            Company: o.companyName,
            Service: o.service,
            Stage: o.stage,
            Value: o.estimatedValue,
            Owner: o.ownerName,
            Close: o.expectedClose
          })),
          'Pipeline_Opportunities'
        );
        setNotice('Exported pipeline opportunities to Excel!');
        setTimeout(() => setNotice(''), 3000);
      }
    },
    {
      id: 'REP-003',
      report: 'Follow-up aging',
      metric: 'Overdue / Planned',
      value: String(plannedFollowups),
      action: 'View',
      type: 'Follow-up SLA',
      onClick: () => setActiveNav('activities')
    },
    {
      id: 'REP-004',
      report: 'Campaign performance',
      metric: 'Replies & Inquiries',
      value: String(totalReplies),
      action: 'Export',
      type: 'Campaign performance',
      onClick: () => {
        excelService.exportCustomData(
          filteredCampaigns.map(c => ({
            Name: c.name,
            Unit: c.businessUnit,
            Channel: c.channel,
            Status: c.status,
            Sent: c.sent,
            Delivered: c.delivered,
            Replies: c.replies,
            LeadsCreated: c.leadsCreated
          })),
          'Campaign_Performance'
        );
        setNotice('Exported campaign performance to Excel!');
        setTimeout(() => setNotice(''), 3000);
      }
    },
    {
      id: 'REP-005',
      report: 'Client handoff',
      metric: 'Won deals',
      value: String(wonDeals),
      action: 'View',
      type: 'Client handoff',
      onClick: () => setActiveNav('opportunities')
    }
  ];

  const visibleRows = reportType === 'All Reports'
    ? dynamicReportRows
    : dynamicReportRows.filter(r => r.type === reportType);

  const handleRunReport = () => {
    setNotice(`Report refreshed! Filtered: Unit=${businessUnit}, Owner=${owner}, Source=${leadSource}.`);
    setTimeout(() => setNotice(''), 3000);
  };

  const handleExportCSV = () => {
    excelService.exportLeadsToExcel(filteredLeads);
    setNotice(`Exported ${filteredLeads.length} leads matching current filters!`);
    setTimeout(() => setNotice(''), 3500);
  };

  return (
    <div className="space-y-6">
      <SpecHeader
        title="Reports"
        subtitle="Export CSV/XLSX | Role-based access"
        actionButtons={[
          { label: 'Run Report', onClick: handleRunReport },
          { label: 'Export CSV', onClick: handleExportCSV }
        ]}
      />

      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice('')} className="text-emerald-700 hover:text-emerald-900 font-bold ml-2">
            &times;
          </button>
        </div>
      )}

      {/* Main Spec Card Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* DETAILS / FILTERS Section */}
        <div className="p-6 border-b border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold tracking-wider text-[#0d2238] uppercase">
              DETAILS / FILTERS
            </h2>
            <button
              onClick={() => {
                setReportType('All Reports');
                setBusinessUnit('Both');
                setOwner('All permitted users');
                setLeadSource('All');
                setStatus('All');
                setNotice('Filters reset to default.');
                setTimeout(() => setNotice(''), 2500);
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
            >
              Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Row 1 */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                REPORT TYPE*
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium cursor-pointer"
              >
                <option value="All Reports">All Reports</option>
                <option value="Lead funnel">Lead funnel</option>
                <option value="Pipeline">Pipeline</option>
                <option value="Follow-up SLA">Follow-up SLA</option>
                <option value="Campaign performance">Campaign performance</option>
                <option value="Client handoff">Client handoff</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                BUSINESS UNIT
              </label>
              <select
                value={businessUnit}
                onChange={(e) => setBusinessUnit(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium cursor-pointer"
              >
                <option value="Both">Both (Xunaris + HYRA Connect)</option>
                <option value="Xunaris">Xunaris (XUN)</option>
                <option value="HYRA Connect">HYRA Connect (HYRA)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                DATE RANGE
              </label>
              <input
                type="text"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                placeholder="01-31 Oct 2026"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>

            {/* Row 2 */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                OWNER
              </label>
              <select
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium cursor-pointer"
              >
                <option value="All permitted users">All permitted users</option>
                {users.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                LEAD SOURCE
              </label>
              <select
                value={leadSource}
                onChange={(e) => setLeadSource(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium cursor-pointer"
              >
                <option value="All">All</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Website">Website</option>
                <option value="Manual">Manual</option>
                <option value="Referral">Referral</option>
                <option value="AI Search (ChatGPT)">AI Search (ChatGPT)</option>
                <option value="Event">Event</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                STATUS
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium cursor-pointer"
              >
                <option value="All">All</option>
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
              </select>
            </div>
          </div>
        </div>

        {/* RECORDS / ACTIVITY Table Section */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-extrabold tracking-wider text-[#0d2238] uppercase">
                RECORDS / ACTIVITY
              </h2>
              <span className="text-xs text-slate-400">
                Aggregated KPI performance metrics &bull; Real-time recalculated values
              </span>
            </div>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
              Showing {visibleRows.length} report line{visibleRows.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="min-w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-[#f0f4f9] text-[#0d2238] font-bold">
                <tr>
                  <th className="px-4 py-3">Report</th>
                  <th className="px-4 py-3">Metric</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {visibleRows.map((rep) => (
                  <tr
                    key={rep.id}
                    className="hover:bg-blue-50/50 transition-colors"
                  >
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      <div>{rep.report}</div>
                      <span className="text-[10px] text-slate-400 font-normal">{rep.type}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 font-medium">
                      {rep.metric}
                    </td>
                    <td className="px-4 py-3.5 font-extrabold text-blue-700 text-sm">
                      {rep.value}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={rep.onClick}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          rep.action === 'Export'
                            ? 'text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-600 hover:text-white'
                            : 'text-slate-700 bg-slate-100 border border-slate-200 hover:bg-[#0d2238] hover:text-white'
                        }`}
                      >
                        {rep.action === 'Export' ? (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>Export</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>View</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
