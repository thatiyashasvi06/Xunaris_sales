import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { Badge } from '../common/Badge';
import { LEAD_STATUSES } from '../../data/businessVerticals';
import { ChevronRight, ArrowRight, Building2, User, Sparkles } from 'lucide-react';

export const LeadPipelineBoard = ({ onSelectLead }) => {
  const { leads, updateLead } = useCRM();

  // Columns for the sales funnel
  const pipelineStages = ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Converted'];

  const advanceLead = (e, lead) => {
    e.stopPropagation();
    const currentIndex = pipelineStages.indexOf(lead.status);
    if (currentIndex >= 0 && currentIndex < pipelineStages.length - 1) {
      const nextStage = pipelineStages[currentIndex + 1];
      updateLead(lead.id, { status: nextStage });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Sales Pipeline Stages</h2>
          <p className="text-xs text-slate-500">Track and advance leads through the qualification lifecycle</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 items-start overflow-x-auto pb-4">
        {pipelineStages.map((stage) => {
          const stageLeads = leads.filter(l => l.status === stage);

          return (
            <div
              key={stage}
              className="bg-slate-100/70 border border-slate-200/80 rounded-2xl p-3 flex flex-col min-h-[450px]"
            >
              {/* Stage Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-slate-800">{stage}</span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white text-slate-700 shadow-2xs">
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="space-y-2.5 flex-1">
                {stageLeads.length === 0 ? (
                  <div className="h-28 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[11px] text-slate-400">
                    No leads in this stage
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => onSelectLead(lead)}
                      className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer space-y-2"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-bold text-xs text-slate-900 hover:text-blue-600 line-clamp-1">
                          {lead.companyName}
                        </span>
                        <Badge variant={lead.priority} size="sm">
                          {lead.priority}
                        </Badge>
                      </div>

                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {lead.service}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                        <span className="truncate max-w-[100px]">{lead.contactName}</span>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                            {lead.aiScore || 75}
                          </span>
                        </div>
                      </div>

                      {stage !== 'Converted' && (
                        <button
                          onClick={(e) => advanceLead(e, lead)}
                          className="w-full mt-1 py-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center justify-center gap-1 transition-colors"
                        >
                          <span>Advance</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
