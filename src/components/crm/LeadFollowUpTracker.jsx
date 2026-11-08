import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { Badge } from '../common/Badge';
import {
  Calendar,
  Clock,
  Building,
  User,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const LeadFollowUpTracker = ({ onSelectLead }) => {
  const { leads, updateLead } = useCRM();

  const todayStr = new Date().toISOString().split('T')[0];

  // Sort leads by nextFollowup ascending
  const sortedLeads = [...leads].sort((a, b) => {
    return (a.nextFollowup || '9999').localeCompare(b.nextFollowup || '9999');
  });

  const handlePostpone = (e, lead, days) => {
    e.stopPropagation();
    const currentDate = new Date(lead.nextFollowup || Date.now());
    currentDate.setDate(currentDate.getDate() + days);
    const newFollowup = currentDate.toISOString().split('T')[0];
    updateLead(lead.id, { nextFollowup: newFollowup });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900">Follow-up Calendar & Schedule</h2>
        <p className="text-xs text-slate-500">
          Timely communications ensure leads progress smoothly through the sales funnel
        </p>
      </div>

      <div className="space-y-3">
        {sortedLeads.map((lead) => {
          const isOverdue = lead.nextFollowup && lead.nextFollowup < todayStr && lead.status !== 'Converted';
          const isToday = lead.nextFollowup === todayStr;

          return (
            <div
              key={lead.id}
              onClick={() => onSelectLead(lead)}
              className={`p-4 bg-white rounded-2xl border transition-all cursor-pointer hover:shadow-sm ${
                isOverdue
                  ? 'border-rose-300 bg-rose-50/20'
                  : isToday
                  ? 'border-amber-300 bg-amber-50/20'
                  : 'border-slate-200/90'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-blue-50 text-blue-600'
                  }`}>
                    <Calendar className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{lead.companyName}</span>
                      <Badge variant={lead.priority} size="sm">{lead.priority}</Badge>
                      <Badge variant={lead.status} size="sm">{lead.status}</Badge>
                    </div>

                    <p className="text-xs text-slate-600 mt-0.5">
                      Contact: <strong>{lead.contactName}</strong> ({lead.jobTitle}) &bull; {lead.workEmail}
                    </p>

                    <p className="text-xs text-slate-500 mt-1 italic line-clamp-1">
                      Notes: {lead.notes || 'No specific agenda logged.'}
                    </p>
                  </div>
                </div>

                {/* Followup date & action buttons */}
                <div className="flex items-center gap-3 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 font-semibold block">Scheduled Date</span>
                    <span className={`text-xs font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-800'}`}>
                      {lead.nextFollowup || 'Not set'}
                    </span>
                    {isOverdue && (
                      <span className="text-[10px] text-rose-500 font-bold block">Overdue</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => handlePostpone(e, lead, 3)}
                      className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      title="Postpone +3 days"
                    >
                      +3d
                    </button>
                    <button
                      onClick={(e) => handlePostpone(e, lead, 7)}
                      className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      title="Postpone +1 week"
                    >
                      +1w
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
