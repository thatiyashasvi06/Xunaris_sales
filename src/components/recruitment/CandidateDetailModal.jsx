import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { useRecruitment } from '../../context/RecruitmentContext';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Mail,
  Phone,
  FileText,
  Download,
  Sparkles,
  CheckCircle2,
  XCircle,
  Briefcase,
  Star,
  Award
} from 'lucide-react';
import { CANDIDATE_STAGES } from '../../data/businessVerticals';

export const CandidateDetailModal = ({ isOpen, onClose, candidate }) => {
  const {
    updateCandidateStatus,
    shortlistCandidate,
    scoreCandidate,
    conductAIInterview,
    downloadCandidateResume
  } = useRecruitment();
  const { permissions } = useAuth();

  const [scoring, setScoring] = useState(false);
  const [interviewing, setInterviewing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  if (!candidate) return null;

  const handleStatusChange = (newStatus) => {
    updateCandidateStatus(candidate.id, newStatus);
    setStatusMsg(`Status updated to ${newStatus}`);
    setTimeout(() => setStatusMsg(''), 2000);
  };

  const handleShortlist = () => {
    shortlistCandidate(candidate.id);
    setStatusMsg('Candidate shortlisted for hiring manager review!');
    setTimeout(() => setStatusMsg(''), 2000);
  };

  const handleRunResumeScore = async () => {
    setScoring(true);
    try {
      await scoreCandidate(candidate.id);
      setStatusMsg('AI Resume Match score refreshed!');
      setTimeout(() => setStatusMsg(''), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setScoring(false);
    }
  };

  const handleRunAIInterview = async () => {
    setInterviewing(true);
    try {
      await conductAIInterview(candidate.id);
      setStatusMsg('AI Technical Interview evaluation completed!');
      setTimeout(() => setStatusMsg(''), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setInterviewing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={candidate.fullName}
      subtitle={`Applicant for: ${candidate.jobTitle} • ${candidate.payrollType}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5 text-xs sm:text-sm">
        {/* Top Status & Shortlist Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Candidate Stage:</span>
            <select
              value={candidate.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="text-xs font-bold rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 focus:ring-2 focus:ring-teal-500"
            >
              {CANDIDATE_STAGES.map(stage => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
            <Badge variant={candidate.status === 'Hired' ? 'converted' : candidate.status === 'Shortlisted' ? 'approved' : 'default'}>
              {candidate.status}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {permissions.canDownloadResumes && (
              <button
                onClick={() => downloadCandidateResume(candidate)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors shadow-2xs"
                title="Download formatted candidate dossier"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Resume</span>
              </button>
            )}

            {permissions.canShortlistCandidates && candidate.status !== 'Shortlisted' && candidate.status !== 'Hired' && (
              <button
                onClick={handleShortlist}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-2xs"
              >
                <Star className="w-3.5 h-3.5" />
                <span>Shortlist</span>
              </button>
            )}
          </div>
        </div>

        {statusMsg && (
          <div className="text-xs font-semibold text-teal-800 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {statusMsg}
          </div>
        )}

        {/* AI Scores Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* AI Resume Match Score Card */}
          <div className="p-4 rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50/50 via-white to-teal-50/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-teal-600 text-white">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">AI Resume Match</h4>
                  <Badge variant={candidate.isAiDemo ? 'ai_demo' : 'ai_live'} size="sm">
                    {candidate.isAiDemo ? '[Demo AI Engine]' : '[Live Gemini AI]'}
                  </Badge>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xl font-extrabold text-teal-700">
                  {candidate.resumeScore || 'N/A'}/100
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-white/80 p-2.5 rounded-lg border border-teal-100">
              {candidate.resumeMatchSummary || 'No resume match generated yet.'}
            </p>

            <button
              onClick={handleRunResumeScore}
              disabled={scoring}
              className="text-[11px] font-bold text-teal-700 hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              {scoring ? 'Re-scoring...' : 'Recalculate Resume Match'}
            </button>
          </div>

          {/* AI Technical Interview Score Card */}
          <div className="p-4 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">AI Interview Assessment</h4>
                  <Badge variant={candidate.isAiDemo ? 'ai_demo' : 'ai_live'} size="sm">
                    {candidate.isAiDemo ? '[Demo AI Engine]' : '[Live Gemini AI]'}
                  </Badge>
                </div>
              </div>

              <div className="text-right">
                <span className={`text-xl font-extrabold ${candidate.aiInterviewScore ? 'text-indigo-700' : 'text-slate-400'}`}>
                  {candidate.aiInterviewScore ? `${candidate.aiInterviewScore}/100` : 'Pending'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-white/80 p-2.5 rounded-lg border border-indigo-100">
              {candidate.aiInterviewSummary || 'AI interview has not been evaluated yet.'}
            </p>

            <button
              onClick={handleRunAIInterview}
              disabled={interviewing}
              className="text-[11px] font-bold text-indigo-700 hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              {interviewing ? 'Conducting AI Evaluation...' : 'Simulate / Run AI Technical Interview'}
            </button>
          </div>
        </div>

        {/* Candidate Details & Resume Content */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs border-b border-slate-100 pb-3">
            <div>
              <span className="text-slate-400 block text-[11px]">Email</span>
              <a href={`mailto:${candidate.email}`} className="font-semibold text-teal-600 hover:underline">
                {candidate.email}
              </a>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Phone</span>
              <span className="font-semibold text-slate-800">{candidate.phone || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Experience</span>
              <span className="font-semibold text-slate-800">{candidate.experienceYears} Years</span>
            </div>
          </div>

          <div>
            <h5 className="font-bold text-slate-900 text-xs mb-1">Skills & Tools</h5>
            <div className="flex flex-wrap gap-1.5">
              {candidate.skills?.split(',').map((skill, i) => (
                <span key={i} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                  {skill.trim()}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h5 className="font-bold text-slate-900 text-xs mb-1">Resume Text Dossier</h5>
            <pre className="font-sans text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {candidate.resumeText || 'No text content available.'}
            </pre>
          </div>
        </div>
      </div>
    </Modal>
  );
};
