import React, { useState } from 'react';
import { useRecruitment } from '../../context/RecruitmentContext';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { CandidateDetailModal } from './CandidateDetailModal';
import {
  User,
  Star,
  Download,
  Eye,
  Filter,
  Sparkles,
  FileText,
  Search
} from 'lucide-react';
import { CANDIDATE_STAGES } from '../../data/businessVerticals';

export const CandidatePipeline = () => {
  const {
    candidates,
    jobs,
    shortlistCandidate,
    downloadCandidateResume,
    candidateStageFilter,
    setCandidateStageFilter,
    payrollFilter,
    setPayrollFilter
  } = useRecruitment();
  const { permissions } = useAuth();

  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('All');

  const filteredCandidates = candidates.filter(cand => {
    const matchesSearch =
      !search ||
      cand.fullName.toLowerCase().includes(search.toLowerCase()) ||
      cand.email.toLowerCase().includes(search.toLowerCase()) ||
      cand.skills.toLowerCase().includes(search.toLowerCase());

    const matchesStage = candidateStageFilter === 'All' || cand.status === candidateStageFilter;
    const matchesPayroll = payrollFilter === 'All' || cand.payrollType === payrollFilter;
    const matchesJob = selectedJobId === 'All' || cand.jobId === selectedJobId;

    return matchesSearch && matchesStage && matchesPayroll && matchesJob;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate name, email, skill..."
              className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              Showing <strong>{filteredCandidates.length}</strong> candidates
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold">Filters:</span>
          </div>

          {/* Job Filter */}
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium max-w-[200px] truncate"
          >
            <option value="All">All Job Openings</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>

          {/* Stage Filter */}
          <select
            value={candidateStageFilter}
            onChange={(e) => setCandidateStageFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="All">All Stages</option>
            {CANDIDATE_STAGES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Payroll Workflow Filter */}
          <select
            value={payrollFilter}
            onChange={(e) => setPayrollFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="All">All Payroll Types</option>
            <option value="Xunaris Payroll">Xunaris Payroll</option>
            <option value="Partner Payroll">Partner Payroll</option>
          </select>

          {(search || selectedJobId !== 'All' || candidateStageFilter !== 'All' || payrollFilter !== 'All') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedJobId('All');
                setCandidateStageFilter('All');
                setPayrollFilter('All');
              }}
              className="text-teal-600 hover:underline font-semibold ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Candidate Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold tracking-wider uppercase text-[11px]">
              <tr>
                <th className="px-4 py-3">Candidate & Skills</th>
                <th className="px-4 py-3">Applied Position</th>
                <th className="px-4 py-3">Payroll Model</th>
                <th className="px-4 py-3">AI Resume Score</th>
                <th className="px-4 py-3">AI Interview Score</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCandidates.map((candidate) => (
                <tr
                  key={candidate.id}
                  onClick={() => setSelectedCandidate(candidate)}
                  className="hover:bg-teal-50/30 cursor-pointer transition-colors"
                >
                  {/* Candidate Name & Skills */}
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900 text-sm hover:text-teal-600">
                      {candidate.fullName}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {candidate.currentTitle} &bull; {candidate.experienceYears}y exp
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[220px]">
                      {candidate.skills}
                    </div>
                  </td>

                  {/* Position */}
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-800 line-clamp-1">{candidate.jobTitle}</span>
                    <span className="text-[11px] text-slate-400">Applied {candidate.appliedAt}</span>
                  </td>

                  {/* Payroll */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        candidate.payrollType === 'Xunaris Payroll'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-teal-100 text-teal-800'
                      }`}
                    >
                      {candidate.payrollType}
                    </span>
                  </td>

                  {/* AI Resume Score */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                        {candidate.resumeScore || 'N/A'}/100
                      </span>
                    </div>
                  </td>

                  {/* AI Interview Score */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`font-bold px-2 py-0.5 rounded ${
                        candidate.aiInterviewScore
                          ? 'text-indigo-800 bg-indigo-50 border border-indigo-200'
                          : 'text-slate-400 bg-slate-100'
                      }`}
                    >
                      {candidate.aiInterviewScore ? `${candidate.aiInterviewScore}/100` : 'Pending'}
                    </span>
                  </td>

                  {/* Stage */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge variant={candidate.status === 'Shortlisted' ? 'approved' : candidate.status === 'Hired' ? 'converted' : 'default'}>
                      {candidate.status}
                    </Badge>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {permissions.canShortlistCandidates && candidate.status !== 'Shortlisted' && candidate.status !== 'Hired' && (
                        <button
                          onClick={() => shortlistCandidate(candidate.id)}
                          className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Shortlist Candidate"
                        >
                          <Star className="w-4 h-4 text-amber-500" />
                        </button>
                      )}

                      {permissions.canDownloadResumes && (
                        <button
                          onClick={() => downloadCandidateResume(candidate)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Download Dossier"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedCandidate(candidate)}
                        className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="View Full Dossier"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate Dossier Modal */}
      <CandidateDetailModal
        isOpen={Boolean(selectedCandidate)}
        onClose={() => setSelectedCandidate(null)}
        candidate={selectedCandidate}
      />
    </div>
  );
};
