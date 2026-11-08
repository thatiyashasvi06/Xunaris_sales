import React, { useState } from 'react';
import { useRecruitment } from '../../context/RecruitmentContext';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import {
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  Upload,
  CheckCircle2,
  Sparkles,
  FileText,
  Search,
  Shield,
  Layers,
  ArrowRight,
  TrendingUp,
  Award
} from 'lucide-react';

export const CandidatePortal = () => {
  const { jobs, applyCandidate } = useRecruitment();

  const [search, setSearch] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [viewMode, setViewMode] = useState('hiring'); // 'hiring' vs 'referring'

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    currentTitle: '',
    experienceYears: 4,
    skills: '',
    resumeText: ''
  });

  const approvedJobs = jobs.filter(
    j => j.status === 'Approved' &&
      (!search || j.title.toLowerCase().includes(search.toLowerCase()) || j.department.toLowerCase().includes(search.toLowerCase()) || j.location.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenApply = (job) => {
    setSelectedJob(job);
    setAppliedSuccess(false);
    setIsApplyModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setResumeFile(file);
      if (file.name.endsWith('.txt') || file.type.includes('text')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setFormData(prev => ({ ...prev, resumeText: event.target.result }));
        };
        reader.readAsText(file);
      }
    }
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    if (!selectedJob) return;

    setSubmitting(true);
    try {
      await applyCandidate({
        ...formData,
        jobId: selectedJob.id,
        jobTitle: selectedJob.title
      }, resumeFile);

      setSubmitting(false);
      setAppliedSuccess(true);
      setTimeout(() => {
        setIsApplyModalOpen(false);
        setAppliedSuccess(false);
        setFormData({
          fullName: '',
          email: '',
          phone: '',
          currentTitle: '',
          experienceYears: 4,
          skills: '',
          resumeText: ''
        });
        setResumeFile(null);
      }, 1600);
    } catch (err) {
      setSubmitting(false);
      alert('Application error: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Official HYRA Connect Hero Section */}
      <div className="bg-[#0f172a] text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800/80 text-amber-300 border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            Trusted Referrals · AI + Human Checks
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-display">
            Trusted Networks. AI Signals.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200">
              Build Elite Teams.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 font-medium">
            Get a shortlist of tested candidates. Not a pile of resumes.
          </p>

          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
            HYRA checks every profile with AI models + verified human specialists, so companies hire faster and candidates are matched to verified openings with zero black-box bias.
          </p>

          {/* Search Box */}
          <div className="pt-3 flex items-center gap-3">
            <div className="relative w-full max-w-lg">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search approved tech roles by title, stack, location..."
                className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Official 5-Stage Evaluation Pipeline Flow */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
            How a candidate reaches the shortlist (HYRA Engine Stages)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-[10px]">1</span>
              <div>
                <span className="font-bold text-slate-200 block text-[11px]">Trusted Sourcing</span>
                <span className="text-[10px] text-slate-400">Network Partners</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-600/30 text-cyan-400 flex items-center justify-center font-bold text-[10px]">2</span>
              <div>
                <span className="font-bold text-slate-200 block text-[11px]">Expert Vetting</span>
                <span className="text-[10px] text-slate-400">Human Check</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-400 flex items-center justify-center font-bold text-[10px]">3</span>
              <div>
                <span className="font-bold text-slate-200 block text-[11px]">Adaptive Quiz</span>
                <span className="text-[10px] text-slate-400">AI Scoring</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-600/30 text-amber-400 flex items-center justify-center font-bold text-[10px]">4</span>
              <div>
                <span className="font-bold text-slate-200 block text-[11px]">AI Interview</span>
                <span className="text-[10px] text-slate-400">Autonomous</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">5</span>
              <div>
                <span className="font-bold text-emerald-300 block text-[11px]">Shortlist</span>
                <span className="text-[10px] text-emerald-400 font-semibold">Ready to Hire</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Sides · One Platform Toggle */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 font-display">
            Verified Job Openings ({approvedJobs.length})
          </h2>
          <p className="text-xs text-slate-500">
            Apply with your resume to be evaluated by the HYRA talent engine
          </p>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setViewMode('hiring')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewMode === 'hiring' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600'
            }`}
          >
            I'm Applying (Candidate)
          </button>
          <button
            onClick={() => setViewMode('referring')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewMode === 'referring' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600'
            }`}
          >
            I'm Referring (Partner)
          </button>
        </div>
      </div>

      {/* Job Openings Grid */}
      {approvedJobs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
          <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-slate-700">No approved jobs match your search</p>
          <p className="text-xs text-slate-400">Try searching for other tech keywords or check back shortly.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {approvedJobs.map((job) => (
            <div
              key={job.id}
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base font-display">{job.title}</h3>
                    <p className="text-xs font-semibold text-amber-600 mt-0.5">
                      {job.partnerName} &bull; {job.department}
                    </p>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                      job.payrollType === 'Xunaris Payroll'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {job.payrollType}
                  </span>
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
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    {job.salaryRange}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified by HYRA Engine</span>
                </div>

                <button
                  onClick={() => handleOpenApply(job)}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-amber-600 rounded-lg shadow-sm transition-colors"
                >
                  {viewMode === 'referring' ? 'Refer Talent' : 'Apply with Resume'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Candidate Application Modal */}
      {selectedJob && (
        <Modal
          isOpen={isApplyModalOpen}
          onClose={() => setIsApplyModalOpen(false)}
          title={`Apply for: ${selectedJob.title}`}
          subtitle={`${selectedJob.partnerName} • ${selectedJob.payrollType}`}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleSubmitApplication} className="space-y-4 text-xs">
            {appliedSuccess ? (
              <div className="p-6 text-center space-y-2 bg-emerald-50 rounded-2xl border border-emerald-200">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="text-base font-bold text-emerald-900">Application Received!</h4>
                <p className="text-xs text-emerald-700 max-w-md mx-auto">
                  Your resume has been ingested into the HYRA talent network. Our AI matching model will score your skills and notify the hiring manager.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="e.g. Sarah Chen"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="sarah.chen@example.com"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 012-3456"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Current Job Title</label>
                    <input
                      type="text"
                      value={formData.currentTitle}
                      onChange={(e) => setFormData({ ...formData, currentTitle: e.target.value })}
                      placeholder="Senior Full Stack Engineer"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Years of Experience</label>
                    <input
                      type="number"
                      min={0}
                      max={40}
                      value={formData.experienceYears}
                      onChange={(e) => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Key Skills & Tech Stack *</label>
                  <input
                    type="text"
                    required
                    value={formData.skills}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                    placeholder="React, TypeScript, Node.js, AWS, Kubernetes"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Resume Upload / Text */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Resume Document (PDF, DOCX, TXT) *
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-800 hover:file:bg-amber-100"
                  />

                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Or paste resume summary/profile:</span>
                    <textarea
                      rows={3}
                      value={formData.resumeText}
                      onChange={(e) => setFormData({ ...formData, resumeText: e.target.value })}
                      placeholder="Paste key achievements, previous positions, and certifications for AI matching..."
                      className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsApplyModalOpen(false)}
                    className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 font-bold text-white bg-slate-900 hover:bg-amber-600 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'Analyzing & Submitting...' : 'Submit to HYRA Talent Network'}
                  </button>
                </div>
              </>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
};
