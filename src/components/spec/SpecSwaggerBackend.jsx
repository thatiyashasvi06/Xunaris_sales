import React, { useState, useEffect } from 'react';
import { SpecHeader } from './SpecHeader';
import { Server, Database, CheckCircle2, ExternalLink, Terminal, ShieldCheck, RefreshCw, Layers } from 'lucide-react';

export const SpecSwaggerBackend = () => {
  const [activeTab, setActiveTab] = useState('swagger'); // 'swagger' | 'endpoints' | 'schema'
  const [serverHealth, setServerHealth] = useState({ status: 'checking', timestamp: null });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setServerHealth({ status: 'online', timestamp: data.timestamp }))
      .catch(() => setServerHealth({ status: 'offline', timestamp: null }));
  }, [refreshKey]);

  const endpointsList = [
    { method: 'POST', path: '/api/auth/login', desc: 'User login with 5-attempt rate-limiting lockout', tag: 'Auth' },
    { method: 'POST', path: '/api/auth/reset', desc: 'Generate 15-minute expiring single-use reset token', tag: 'Auth' },
    { method: 'GET', path: '/api/catalog/services?vertical=XUN', desc: 'Dependent service catalog filtered by vertical', tag: 'Catalog' },
    { method: 'GET', path: '/api/companies', desc: 'Shared enterprise companies directory with domain matching', tag: 'Companies' },
    { method: 'POST', path: '/api/leads', desc: 'Create lead with server-generated ID sequence (XUN-LD / HYRA-LD)', tag: 'Leads' },
    { method: 'POST', path: '/api/leads/:id/qualify', desc: 'Atomic conversion: Qualifies lead & generates linked Opportunity', tag: 'Leads' },
    { method: 'GET', path: '/api/opportunities', desc: 'Commercial pipeline deals with stage and value tracking', tag: 'Opportunities' },
    { method: 'PATCH', path: '/api/opportunities/:id/stage', desc: 'Stage gating rules: Proposal requires value, Won requires handoff', tag: 'Opportunities' },
    { method: 'GET', path: '/api/activities', desc: 'Touchpoint logs with automated 2-day overdue SLA escalation', tag: 'Activities' },
    { method: 'POST', path: '/api/campaigns/:id/schedule', desc: 'Activates campaign outreach and calculates lead attribution', tag: 'Campaigns' },
    { method: 'GET', path: '/api/dashboard', desc: 'Real-time KPI tiles, 5-stage funnel counts, and action center', tag: 'Dashboard' },
    { method: 'GET', path: '/api/admin/users', desc: 'Admin-only: Add, edit, or delete CRM user accounts', tag: 'Admin' },
    { method: 'POST', path: '/api/admin/rules/:id/toggle', desc: 'Admin-only: Toggle enterprise automation policies on/off', tag: 'Admin' },
    { method: 'GET', path: '/api/recruitment/jobs', desc: 'Staffing requisitions with Xunaris vs Partner payroll split', tag: 'HYRA' }
  ];

  const schemaTables = [
    { name: 'users', rows: '3 seeded', desc: 'Admin & User accounts with role permissions and bcrypt passwords' },
    { name: 'service_catalog', rows: '11 entries', desc: 'Dependent active services for Xunaris and HYRA Connect' },
    { name: 'companies', rows: 'Shared Master', desc: 'Enterprise accounts directory with normalized domain matching' },
    { name: 'contacts', rows: 'Shared Master', desc: 'Client decision makers linked to companies across verticals' },
    { name: 'leads', rows: 'XUN-LD / HYRA-LD', desc: 'Immutable sequential lead records with qualification metadata' },
    { name: 'opportunities', rows: 'XUN-OP / HYRA-OP', desc: 'Commercial deal pipeline with stage transition history' },
    { name: 'proposals', rows: 'Versioned', desc: 'Proposal versions, file attachments, and delivery states' },
    { name: 'activities', rows: 'Timeline', desc: 'Calls, emails, meetings, and follow-ups with 2-day SLA escalation' },
    { name: 'campaigns', rows: 'Outreach', desc: 'Marketing campaigns with delivery, open, and lead attribution metrics' },
    { name: 'handoffs', rows: 'Operations', desc: 'Won deal delivery handoffs with owner assignment and due dates' },
    { name: 'email_outbox', rows: 'Queue', desc: 'Outbox table with 3-attempt exponential backoff retry worker' },
    { name: 'audit_events', rows: 'Immutable', desc: 'Audit compliance logging for logins, stage changes, and exports' },
    { name: 'recruitment_jobs', rows: 'Staffing', desc: 'Job requisitions distinguishing Xunaris vs Partner agency payroll' },
    { name: 'recruitment_candidates', rows: 'Talent Pool', desc: 'Applicants scored with automated AI match & interview signals' }
  ];

  return (
    <div className="space-y-5 font-sans">
      <SpecHeader
        title="Backend REST API & Swagger UI"
        subtitle="Live interactive OpenAPI specification & SQLite relational database embedded directly in your CRM"
        actionButtons={[
          {
            label: 'Open Fullscreen in New Tab',
            onClick: () => window.open('http://localhost:5000/api-docs', '_blank'),
            variant: 'primary'
          },
          {
            label: 'Ping Health Check',
            onClick: () => setRefreshKey(k => k + 1),
            variant: 'secondary'
          }
        ]}
      />

      {/* Backend Infrastructure Status Bar */}
      <div className="bg-[#0f172a] text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-hyra-700/20 border border-hyra-600/30 flex items-center justify-center text-hyra-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base text-white">Express.js REST API Server</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  serverHealth.status === 'online'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${serverHealth.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                  {serverHealth.status === 'online' ? 'Port 5000: ONLINE' : 'DISCONNECTED'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Proxy active: Frontend port 3000 routes <code className="text-cyan-300">/api/*</code> and <code className="text-cyan-300">/api-docs/*</code> automatically.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>SQLite WAL Mode &bull; <strong>20 Tables</strong></span>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 pt-3">
          <button
            onClick={() => setActiveTab('swagger')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'swagger'
                ? 'bg-hyra-700 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Interactive Swagger UI</span>
          </button>

          <button
            onClick={() => setActiveTab('endpoints')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'endpoints'
                ? 'bg-hyra-700 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Endpoint Quick Directory</span>
          </button>

          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'schema'
                ? 'bg-hyra-700 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Database Tables Schema</span>
          </button>
        </div>
      </div>

      {/* TAB 1: EMBEDDED SWAGGER UI */}
      {activeTab === 'swagger' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
          <div className="bg-slate-100 dark:bg-slate-950 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="ml-2 font-mono text-[11px] text-slate-400">http://localhost:5000/api-docs (OpenAPI 3.0)</span>
            </div>
            <a
              href="http://localhost:5000/api-docs"
              target="_blank"
              rel="noreferrer"
              className="text-hyra-700 hover:underline font-bold flex items-center gap-1"
            >
              <span>Launch Separate Window</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <iframe
            src="/api-docs/"
            title="Swagger UI Interactive Documentation"
            className="w-full h-[750px] border-none bg-white"
          />
        </div>
      )}

      {/* TAB 2: ENDPOINT DIRECTORY TABLE */}
      {activeTab === 'endpoints' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">REST API Endpoints Specification</span>
            <span className="text-xs text-slate-500">All 14 Core Endpoints</span>
          </div>

          <div className="divide-y divide-slate-100">
            {endpointsList.map((ep, idx) => (
              <div key={idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50/80 transition-colors gap-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] w-14 text-center ${
                    ep.method === 'GET' ? 'bg-hyra-100 text-hyra-700' :
                    ep.method === 'POST' ? 'bg-emerald-100 text-emerald-700' :
                    ep.method === 'PATCH' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {ep.method}
                  </span>
                  <code className="font-mono font-bold text-slate-900">{ep.path}</code>
                </div>
                <div className="flex items-center gap-3 justify-between sm:justify-end">
                  <span className="text-slate-600 text-right">{ep.desc}</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">{ep.tag}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DATABASE SCHEMA INSPECTOR */}
      {activeTab === 'schema' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">SQLite Relational Tables (data/xunaris_crm.sqlite)</span>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">ACID + WAL Mode</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <div className="divide-y divide-slate-100">
              {schemaTables.slice(0, 7).map((t, idx) => (
                <div key={idx} className="p-3.5 hover:bg-slate-50 transition-colors text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <code className="font-mono font-extrabold text-hyra-700">{t.name}</code>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">{t.rows}</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{t.desc}</p>
                </div>
              ))}
            </div>

            <div className="divide-y divide-slate-100">
              {schemaTables.slice(7).map((t, idx) => (
                <div key={idx} className="p-3.5 hover:bg-slate-50 transition-colors text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <code className="font-mono font-extrabold text-hyra-700">{t.name}</code>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">{t.rows}</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
