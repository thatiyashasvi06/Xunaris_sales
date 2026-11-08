import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { useCRM } from '../../context/CRMContext';
import {
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  User,
  Calendar,
  Sparkles,
  ExternalLink,
  Edit3,
  CheckCircle2,
  Clock,
  Briefcase
} from 'lucide-react';
import { LEAD_STATUSES } from '../../data/businessVerticals';

export const LeadDetailModal = ({ isOpen, onClose, lead, onEdit }) => {
  const { updateLead, runAILeadAnalysis } = useCRM();
  const [analyzing, setAnalyzing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  if (!lead) return null;

  const handleStatusChange = (newStatus) => {
    updateLead(lead.id, { status: newStatus });
    setStatusMessage(`Status updated to ${newStatus}`);
    setTimeout(() => setStatusMessage(''), 2000);
  };

  const handleRunAI = async () => {
    setAnalyzing(true);
    try {
      await runAILeadAnalysis(lead.id);
      setStatusMessage('AI Analysis updated successfully!');
      setTimeout(() => setStatusMessage(''), 2500);
    } catch (e) {
      console.error(e);
      setStatusMessage('Error running AI analysis.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lead.companyName}
      subtitle={`${lead.businessVertical} • ${lead.service}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Status banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Pipeline Status:</span>
            <select
              value={lead.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="text-xs font-bold rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500"
            >
              {LEAD_STATUSES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
            <Badge variant={lead.status}>{lead.status}</Badge>
            <Badge variant={lead.priority}>{lead.priority} Priority</Badge>
          </div>

          <div className="flex items-center gap-2">
            {lead.website && (
              <a
                href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-200/60 rounded-lg transition-colors"
                title="Visit Website"
              >
                <Globe className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={() => {
                onClose();
                onEdit(lead);
              }}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Lead
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {statusMessage}
          </div>
        )}

        {/* AI Insight Card */}
        <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/70 via-indigo-50/30 to-purple-50/30 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">AI Intelligence & Scoring</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant={lead.isAiDemo ? 'ai_demo' : 'ai_live'}>
                    {lead.isAiDemo ? '[Demo AI Engine]' : '[Live Gemini AI]'}
                  </Badge>
                  <span className="text-[11px] text-slate-500">
                    Lead Priority Score: <strong className="text-blue-700">{lead.aiScore || 75}/100</strong>
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleRunAI}
              disabled={analyzing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-60"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {analyzing ? 'Analyzing...' : 'Re-run AI Analysis'}
            </button>
          </div>

          <div className="space-y-2.5 text-xs text-slate-700">
            <div>
              <span className="font-bold text-slate-900">Executive Summary:</span>
              <p className="mt-0.5 text-slate-600 bg-white/70 p-2.5 rounded-lg border border-slate-200/60 leading-relaxed">
                {lead.aiSummary || 'AI analysis pending. Click "Re-run AI Analysis" to generate instant qualification.'}
              </p>
            </div>

            {lead.aiFollowupSuggestions && (
              <div>
                <span className="font-bold text-slate-900">Recommended Follow-up Actions:</span>
                <pre className="mt-0.5 font-sans whitespace-pre-wrap text-slate-600 bg-white/70 p-2.5 rounded-lg border border-slate-200/60 leading-relaxed">
                  {lead.aiFollowupSuggestions}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Lead Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Contact Box */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
            <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-blue-600" />
              Primary Contact & Org
            </h5>

            <div className="space-y-1.5 text-slate-600">
              <p><strong className="text-slate-800">Contact:</strong> {lead.contactName} ({lead.jobTitle})</p>
              <p className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <a href={`mailto:${lead.workEmail}`} className="text-blue-600 hover:underline">{lead.workEmail}</a>
              </p>
              {lead.phone && (
                <p className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{lead.phone}</span>
                </p>
              )}
              <p className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{lead.city}, {lead.country}</span>
              </p>
              <p><strong className="text-slate-800">Industry:</strong> {lead.industry || 'Technology'}</p>
            </div>
          </div>

          {/* Sales Pipeline & Campaign Box */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
            <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              Sales & Attribution
            </h5>

            <div className="space-y-1.5 text-slate-600">
              <p><strong className="text-slate-800">Lead Source:</strong> {lead.leadSource}</p>
              <p><strong className="text-slate-800">Campaign:</strong> {lead.campaign || 'Direct Sourcing'}</p>
              <p><strong className="text-slate-800">Account Owner:</strong> {lead.ownerEmail}</p>
              <p className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <strong className="text-slate-800">Next Follow-up:</strong> {lead.nextFollowup}
              </p>
              <p><strong className="text-slate-800">Created Date:</strong> {lead.createdAt}</p>
            </div>
          </div>
        </div>

        {/* Requirements & Notes */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 text-xs">
          <div>
            <h5 className="font-bold text-slate-900 mb-1">Requirement Scope</h5>
            <p className="text-slate-700 bg-slate-50 p-3 rounded-lg leading-relaxed">
              {lead.requirement}
            </p>
          </div>

          {lead.notes && (
            <div>
              <h5 className="font-bold text-slate-900 mb-1">Internal Notes</h5>
              <p className="text-slate-700 bg-slate-50 p-3 rounded-lg leading-relaxed">
                {lead.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
