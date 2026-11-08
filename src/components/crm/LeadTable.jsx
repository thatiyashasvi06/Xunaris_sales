import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { Badge } from '../common/Badge';
import { excelService } from '../../services/excelService';
import {
  Search,
  Filter,
  Plus,
  Upload,
  Download,
  Eye,
  Edit,
  Trash2,
  Sparkles,
  Calendar,
  Building,
  Mail,
  ChevronRight
} from 'lucide-react';
import {
  BUSINESS_VERTICALS,
  LEAD_STATUSES,
  LEAD_PRIORITIES
} from '../../data/businessVerticals';

export const LeadTable = ({ onOpenAdd, onOpenBulk, onSelectLead, onEditLead }) => {
  const {
    filteredLeads,
    deleteLead,
    searchQuery,
    setSearchQuery,
    selectedVertical,
    setSelectedVertical,
    selectedStatus,
    setSelectedStatus,
    selectedPriority,
    setSelectedPriority,
    runAILeadAnalysis
  } = useCRM();

  const [aiLoadingId, setAiLoadingId] = useState(null);

  const handleQuickAI = async (e, lead) => {
    e.stopPropagation();
    setAiLoadingId(lead.id);
    try {
      await runAILeadAnalysis(lead.id);
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoadingId(null);
    }
  };

  const handleDelete = (e, id, name) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete lead "${name}"?`)) {
      deleteLead(id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search, Filters, and Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company, contact, email, city..."
              className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => excelService.exportLeadsToExcel(filteredLeads)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
              title="Export filtered leads to Excel"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">Export Excel</span>
            </button>

            <button
              onClick={onOpenBulk}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Bulk Upload</span>
            </button>

            <button
              onClick={onOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>New Lead</span>
            </button>
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold">Filters:</span>
          </div>

          {/* Vertical Filter */}
          <select
            value={selectedVertical}
            onChange={(e) => setSelectedVertical(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="All">All Verticals</option>
            {BUSINESS_VERTICALS.map(v => (
              <option key={v.id} value={v.name}>{v.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="All">All Statuses</option>
            {LEAD_STATUSES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="All">All Priorities</option>
            {LEAD_PRIORITIES.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {(selectedVertical !== 'All' || selectedStatus !== 'All' || selectedPriority !== 'All' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedVertical('All');
                setSelectedStatus('All');
                setSelectedPriority('All');
                setSearchQuery('');
              }}
              className="text-blue-600 hover:underline font-semibold ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {filteredLeads.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Building className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">No sales leads match your filters</p>
            <p className="text-xs text-slate-400">Try adjusting your search criteria or create a new lead.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold tracking-wider uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3">Company & Vertical</th>
                  <th className="px-4 py-3">Contact Person</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">AI Score</th>
                  <th className="px-4 py-3">Follow-up</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => onSelectLead(lead)}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                  >
                    {/* Company & Vertical */}
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-bold text-slate-900 text-sm hover:text-blue-600">
                          {lead.companyName}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5 text-slate-500">
                          <span className="font-medium text-slate-700">{lead.businessVertical}</span>
                          <span>&bull;</span>
                          <span className="text-[11px] truncate max-w-[160px]">{lead.service}</span>
                        </div>
                      </div>
                    </td>

                    {/* Contact Person */}
                    <td className="px-4 py-3">
                      <div className="text-slate-800 font-semibold">{lead.contactName}</div>
                      <div className="text-[11px] text-slate-500">{lead.jobTitle}</div>
                      <div className="text-[11px] text-blue-600 truncate max-w-[180px]">{lead.workEmail}</div>
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={lead.priority}>{lead.priority}</Badge>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={lead.status}>{lead.status}</Badge>
                    </td>

                    {/* AI Score */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 bg-blue-50 px-2 py-0.5 rounded text-blue-700 border border-blue-200">
                          {lead.aiScore || 75}
                        </span>
                        <button
                          onClick={(e) => handleQuickAI(e, lead)}
                          disabled={aiLoadingId === lead.id}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                          title="Generate AI Qualification & Next Steps"
                        >
                          <Sparkles className={`w-3.5 h-3.5 ${aiLoadingId === lead.id ? 'animate-spin text-blue-600' : ''}`} />
                        </button>
                      </div>
                    </td>

                    {/* Follow-up */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lead.nextFollowup}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelectLead(lead)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Lead Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditLead(lead)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Lead"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, lead.id, lead.companyName)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
