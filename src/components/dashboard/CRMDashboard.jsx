import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { MetricCard } from '../common/MetricCard';
import { LeadTable } from '../crm/LeadTable';
import { LeadPipelineBoard } from '../crm/LeadPipelineBoard';
import { LeadFollowUpTracker } from '../crm/LeadFollowUpTracker';
import { LeadFormModal } from '../crm/LeadFormModal';
import { LeadDetailModal } from '../crm/LeadDetailModal';
import { BulkLeadUploadModal } from '../crm/BulkLeadUploadModal';
import {
  Users,
  UserCheck,
  Award,
  Zap,
  Building,
  MapPin,
  TrendingUp,
  Briefcase
} from 'lucide-react';

export const CRMDashboard = () => {
  const { metrics, addLead, updateLead, activeTab, setActiveTab } = useCRM();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [editingLead, setEditingLead] = useState(null);

  const handleSaveLead = (formData) => {
    if (editingLead) {
      updateLead(editingLead.id, formData);
      setEditingLead(null);
    } else {
      addLead(formData);
    }
  };

  const handleEditLead = (lead) => {
    setEditingLead(lead);
    setIsAddModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Official Xunaris Technologies Top Hero Banner */}
      <div className="bg-[#0f172a] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-br from-blue-600/20 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800/80 text-cyan-300 border border-cyan-500/30">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              Xunaris Technologies &bull; Enterprise Client CRM
            </div>

            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight font-display">
              SAP Consulting &bull; AI Automation &bull; Cloud Migration
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
              <span className="flex items-center gap-1.5 text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                Prestige Tech Park Platina 2, Kadubeesanahalli, Bengaluru
              </span>
              <span>&bull;</span>
              <span className="text-cyan-400 font-mono">+91-99642-08880</span>
              <span>&bull;</span>
              <span className="text-slate-400">info@xunaris.com</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingLead(null);
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all"
            >
              + Create Lead
            </button>
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold text-cyan-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all"
            >
              Bulk Excel/CSV
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <MetricCard
          title="Total Leads"
          value={metrics.totalLeads}
          subtitle="Enterprise pipeline"
          icon={Users}
          color="blue"
          trend="+14% this mo"
          onClick={() => setActiveTab('leads')}
        />

        <MetricCard
          title="New Inbound"
          value={metrics.newLeads}
          subtitle="Needs qualification"
          icon={Zap}
          color="teal"
          onClick={() => setActiveTab('leads')}
        />

        <MetricCard
          title="Qualified Deals"
          value={metrics.qualifiedLeads}
          subtitle="Scope & budget approved"
          icon={UserCheck}
          color="amber"
          onClick={() => setActiveTab('pipeline')}
        />

        <MetricCard
          title="Converted Clients"
          value={metrics.convertedLeads}
          subtitle="Closed-won contracts"
          icon={Award}
          color="emerald"
          trend="82% win rate"
          onClick={() => setActiveTab('pipeline')}
        />
      </div>

      {/* Main Tab Views */}
      {activeTab === 'leads' && (
        <LeadTable
          onOpenAdd={() => {
            setEditingLead(null);
            setIsAddModalOpen(true);
          }}
          onOpenBulk={() => setIsBulkModalOpen(true)}
          onSelectLead={(lead) => setSelectedLead(lead)}
          onEditLead={handleEditLead}
        />
      )}

      {activeTab === 'pipeline' && (
        <LeadPipelineBoard
          onSelectLead={(lead) => setSelectedLead(lead)}
        />
      )}

      {activeTab === 'followups' && (
        <LeadFollowUpTracker
          onSelectLead={(lead) => setSelectedLead(lead)}
        />
      )}

      {/* Modals */}
      <LeadFormModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingLead(null);
        }}
        onSave={handleSaveLead}
        leadToEdit={editingLead}
      />

      <LeadDetailModal
        isOpen={Boolean(selectedLead)}
        onClose={() => setSelectedLead(null)}
        lead={selectedLead}
        onEdit={handleEditLead}
      />

      <BulkLeadUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
      />
    </div>
  );
};
