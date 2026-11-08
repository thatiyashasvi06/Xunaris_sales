import React, { useState } from 'react';
import { useRecruitment } from '../../context/RecruitmentContext';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { JobFormModal } from './JobFormModal';
import { BulkJobUploadModal } from './BulkJobUploadModal';
import {
  Briefcase,
  Plus,
  Upload,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  Clock,
  DollarSign,
  Building,
  Filter,
  Users
} from 'lucide-react';

export const JobPostings = () => {
  const {
    jobs,
    approveJob,
    rejectJob,
    requestCorrectionJob,
    payrollFilter,
    setPayrollFilter,
    jobStatusFilter,
    setJobStatusFilter,
    setActiveTab
  } = useRecruitment();
  const { permissions } = useAuth();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [correctionJobId, setCorrectionJobId] = useState(null);
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);

  const filteredJobs = jobs.filter(job => {
    const matchesPayroll = payrollFilter === 'All' || job.payrollType === payrollFilter;
    const matchesStatus = jobStatusFilter === 'All' || job.status === jobStatusFilter;
    return matchesPayroll && matchesStatus;
  });

  const handleApprove = (e, job) => {
    e.stopPropagation();
    approveJob(job.id, 'Posting verified and approved for candidate public portal.');
  };

  const handleReject = (e, job) => {
    e.stopPropagation();
    rejectJob(job.id, 'Role does not meet hiring criteria.');
  };

  const handleOpenCorrection = (e, job) => {
    e.stopPropagation();
    setCorrectionJobId(job.id);
    setCorrectionNotes(job.adminFeedback || '');
  };

  const handleConfirmCorrection = () => {
    if (!correctionJobId) return;
    requestCorrectionJob(correctionJobId, correctionNotes || 'Please clarify requirements.');
    setCorrectionJobId(null);
    setCorrectionNotes('');
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Actions */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Active Job Postings & Requisitions</h2>
            <p className="text-xs text-slate-500">
              Manage postings across Xunaris and Partner Payroll compliance workflows
            </p>
          </div>

          <div className="flex items-center gap-2">
            {permissions.canPostJobs && (
              <>
                <button
                  onClick={() => setIsBulkOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Bulk Upload</span>
                </button>

                <button
                  onClick={() => setIsAddOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all shadow-sm shadow-teal-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Post Job</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filter Bar with Payroll Distinction */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold">Filter Workflows:</span>
          </div>

          {/* Payroll Workflow Filter */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setPayrollFilter('All')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                payrollFilter === 'All' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              All Payrolls
            </button>
            <button
              onClick={() => setPayrollFilter('Xunaris Payroll')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                payrollFilter === 'Xunaris Payroll' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600'
              }`}
            >
              Xunaris Payroll
            </button>
            <button
              onClick={() => setPayrollFilter('Partner Payroll')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                payrollFilter === 'Partner Payroll' ? 'bg-teal-600 text-white shadow-2xs' : 'text-slate-600'
              }`}
            >
              Partner Payroll
            </button>
          </div>

          {/* Job Status Filter */}
          <select
            value={jobStatusFilter}
            onChange={(e) => setJobStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="All">All Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Needs Correction">Needs Correction</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Jobs Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredJobs.map((job) => (
          <div
            key={job.id}
            onClick={() => setSelectedJob(job)}
            className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-teal-300 transition-all cursor-pointer flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-base hover:text-teal-600 line-clamp-1">
                    {job.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{job.partnerName}</span>
                    <span>&bull;</span>
                    <span>{job.department}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <Badge variant={job.status}>{job.status}</Badge>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                      job.payrollType === 'Xunaris Payroll'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-teal-100 text-teal-800 border border-teal-200'
                    }`}
                  >
                    {job.payrollType}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                {job.description}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {job.location}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {job.employmentType} ({job.experienceLevel})
                </span>
                <span className="flex items-center gap-1 text-slate-700 font-semibold">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  {job.salaryRange}
                </span>
              </div>

              {job.adminFeedback && (
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] text-slate-600">
                  <strong className="text-slate-800 block mb-0.5">Admin Review Feedback:</strong>
                  {job.adminFeedback}
                </div>
              )}
            </div>

            {/* Bottom Bar: Applicants count & Admin Approval Controls */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-teal-700 font-semibold">
                <Users className="w-3.5 h-3.5" />
                <span>{job.applicantsCount || 0} Applicants</span>
              </div>

              {permissions.canApproveJobs && (
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {job.status !== 'Approved' && (
                    <button
                      onClick={(e) => handleApprove(e, job)}
                      className="px-2.5 py-1 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-2xs transition-colors"
                      title="Approve for Candidate Portal"
                    >
                      Approve
                    </button>
                  )}

                  {job.status === 'Pending Approval' && (
                    <button
                      onClick={(e) => handleOpenCorrection(e, job)}
                      className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                      title="Request edits or corrections"
                    >
                      Request Edits
                    </button>
                  )}

                  {job.status !== 'Rejected' && (
                    <button
                      onClick={(e) => handleReject(e, job)}
                      className="px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                    >
                      Reject
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      <JobFormModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <BulkJobUploadModal isOpen={isBulkOpen} onClose={() => setIsBulkOpen(false)} />

      {/* Request Correction Modal */}
      <Modal
        isOpen={Boolean(correctionJobId)}
        onClose={() => setCorrectionJobId(null)}
        title="Request Revisions for Job Post"
        subtitle="Specify what modifications are required before publication"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <textarea
            rows={3}
            value={correctionNotes}
            onChange={(e) => setCorrectionNotes(e.target.value)}
            placeholder="e.g. Please clarify remote work expectations and specify required cloud certifications..."
            className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500"
          />

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setCorrectionJobId(null)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmCorrection}
              className="px-4 py-1.5 font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm"
            >
              Send Revision Request
            </button>
          </div>
        </div>
      </Modal>

      {/* Full Job Detail Modal */}
      {selectedJob && (
        <Modal
          isOpen={Boolean(selectedJob)}
          onClose={() => setSelectedJob(null)}
          title={selectedJob.title}
          subtitle={`${selectedJob.partnerName} • ${selectedJob.department}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-2">
              <Badge variant={selectedJob.status}>{selectedJob.status}</Badge>
              <span className={`px-2 py-0.5 rounded font-bold ${
                selectedJob.payrollType === 'Xunaris Payroll'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-teal-100 text-teal-800'
              }`}>
                {selectedJob.payrollType}
              </span>
              <span className="text-slate-500">&bull; {selectedJob.location}</span>
              <span className="text-slate-500">&bull; {selectedJob.salaryRange}</span>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-1">Description</h4>
              <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                {selectedJob.description}
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-1">Requirements</h4>
              <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                {selectedJob.requirements}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-slate-500">Recruiter: {selectedJob.recruiterEmail}</span>
              <button
                onClick={() => {
                  setSelectedJob(null);
                  setActiveTab('candidates');
                }}
                className="px-4 py-2 font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
              >
                View Candidates for this Job
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
