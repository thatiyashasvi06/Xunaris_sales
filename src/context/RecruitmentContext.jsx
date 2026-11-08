import React, { createContext, useContext, useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { aiService } from '../services/aiService';

const RecruitmentContext = createContext(null);

export const RecruitmentProvider = ({ children }) => {
  const [partners, setPartners] = useState(() => storageService.getPartners());
  const [recruiters, setRecruiters] = useState(() => storageService.getRecruiters());
  const [jobs, setJobs] = useState(() => storageService.getJobs());
  const [candidates, setCandidates] = useState(() => storageService.getCandidates());

  const [activeTab, setActiveTab] = useState('jobs'); // 'jobs', 'partners', 'recruiters', 'candidates', 'portal'
  const [payrollFilter, setPayrollFilter] = useState('All'); // 'All', 'Xunaris Payroll', 'Partner Payroll'
  const [jobStatusFilter, setJobStatusFilter] = useState('All');
  const [candidateStageFilter, setCandidateStageFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Sync to local storage
  useEffect(() => {
    storageService.setPartners(partners);
  }, [partners]);

  useEffect(() => {
    storageService.setRecruiters(recruiters);
  }, [recruiters]);

  useEffect(() => {
    storageService.setJobs(jobs);
  }, [jobs]);

  useEffect(() => {
    storageService.setCandidates(candidates);
  }, [candidates]);

  // 1. Partner Actions
  const registerPartner = (partnerData) => {
    // Check duplicate partner email
    const exists = partners.some(p => p.email.toLowerCase() === partnerData.email.toLowerCase());
    if (exists) {
      throw new Error(`Partner with email "${partnerData.email}" already exists.`);
    }

    const newPartner = {
      ...partnerData,
      id: `ptn-${Date.now()}`,
      status: 'Pending',
      adminNotes: 'New registration awaiting administrative review.',
      appliedAt: new Date().toISOString().split('T')[0],
      approvedAt: null
    };
    setPartners(prev => [newPartner, ...prev]);
    return newPartner;
  };

  const approvePartner = (partnerId, adminNotes = '') => {
    setPartners(prev =>
      prev.map(p =>
        p.id === partnerId
          ? {
              ...p,
              status: 'Approved',
              approvedAt: new Date().toISOString().split('T')[0],
              adminNotes: adminNotes || 'Approved by Xunaris Admin for recruitment access.'
            }
          : p
      )
    );
  };

  const rejectPartner = (partnerId, reason = '') => {
    setPartners(prev =>
      prev.map(p =>
        p.id === partnerId
          ? {
              ...p,
              status: 'Rejected',
              adminNotes: reason || 'Application did not meet onboarding criteria.'
            }
          : p
      )
    );
  };

  // 2. Recruiter Actions (with duplicate email validation)
  const inviteRecruiter = (recruiterData) => {
    const emailToValidate = recruiterData.email.trim().toLowerCase();

    // Check duplicate email in recruiters list
    const isDuplicate = recruiters.some(r => r.email.toLowerCase() === emailToValidate);
    if (isDuplicate) {
      throw new Error(`Recruiter with email "${emailToValidate}" is already registered or invited.`);
    }

    const newRecruiter = {
      ...recruiterData,
      id: `rec-${Date.now()}`,
      email: emailToValidate,
      status: 'Active',
      joinedAt: new Date().toISOString().split('T')[0]
    };

    setRecruiters(prev => [newRecruiter, ...prev]);
    return newRecruiter;
  };

  const removeRecruiter = (recruiterId) => {
    setRecruiters(prev => prev.filter(r => r.id !== recruiterId));
  };

  // 3. Job Actions
  const createJob = (jobData) => {
    const newJob = {
      ...jobData,
      id: `job-${Date.now()}`,
      status: 'Pending Approval', // Enforce approval workflow
      adminFeedback: 'Submitted. Awaiting Admin review.',
      applicantsCount: 0,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setJobs(prev => [newJob, ...prev]);
    return newJob;
  };

  const bulkAddJobs = (newJobs) => {
    setJobs(prev => [...newJobs, ...prev]);
  };

  const approveJob = (jobId, feedback = 'Approved for publication.') => {
    setJobs(prev =>
      prev.map(j =>
        j.id === jobId ? { ...j, status: 'Approved', adminFeedback: feedback } : j
      )
    );
  };

  const rejectJob = (jobId, feedback = 'Job posting does not meet guidelines.') => {
    setJobs(prev =>
      prev.map(j =>
        j.id === jobId ? { ...j, status: 'Rejected', adminFeedback: feedback } : j
      )
    );
  };

  const requestCorrectionJob = (jobId, feedback) => {
    setJobs(prev =>
      prev.map(j =>
        j.id === jobId
          ? { ...j, status: 'Needs Correction', adminFeedback: feedback }
          : j
      )
    );
  };

  const deleteJob = (jobId) => {
    setJobs(prev => prev.filter(j => j.id !== jobId));
  };

  // 4. Candidate & Application Actions
  const applyCandidate = async (applicationData, resumeFile = null) => {
    let resumeText = applicationData.resumeText || '';
    let resumeFileName = resumeFile?.name || `${applicationData.fullName.replace(/\s+/g, '_')}_Resume.pdf`;

    if (resumeFile && !resumeText) {
      resumeText = `${applicationData.fullName} - ${applicationData.currentTitle}\nSkills: ${applicationData.skills}\nExperience: ${applicationData.experienceYears} years.\nFile uploaded: ${resumeFileName}`;
    }

    const targetJob = jobs.find(j => j.id === applicationData.jobId);

    // Initial candidate entry
    const newCandidate = {
      ...applicationData,
      id: `cand-${Date.now()}`,
      resumeFileName,
      resumeText,
      payrollType: targetJob?.payrollType || 'Xunaris Payroll',
      jobTitle: targetJob?.title || 'Open Position',
      status: 'Applied',
      appliedAt: new Date().toISOString().split('T')[0],
      resumeScore: 75,
      resumeMatchSummary: 'Evaluating candidate qualifications against job requirements...',
      aiInterviewScore: null,
      aiInterviewSummary: null
    };

    // Increment applicantsCount on targetJob
    setJobs(prev =>
      prev.map(j =>
        j.id === applicationData.jobId
          ? { ...j, applicantsCount: (j.applicantsCount || 0) + 1 }
          : j
      )
    );

    // Run AI scoring in background
    try {
      if (targetJob) {
        const scoreResult = await aiService.scoreCandidateResume(newCandidate, targetJob);
        newCandidate.resumeScore = scoreResult.score;
        newCandidate.resumeMatchSummary = scoreResult.summary;
        newCandidate.isAiDemo = scoreResult.isDemo;
      }
    } catch (e) {
      console.warn('AI Resume scoring error:', e);
    }

    setCandidates(prev => [newCandidate, ...prev]);
    return newCandidate;
  };

  const updateCandidateStatus = (candidateId, newStatus) => {
    setCandidates(prev =>
      prev.map(c => (c.id === candidateId ? { ...c, status: newStatus } : c))
    );
  };

  const shortlistCandidate = (candidateId) => {
    updateCandidateStatus(candidateId, 'Shortlisted');
  };

  // Trigger AI Resume Scoring for Candidate
  const scoreCandidate = async (candidateId) => {
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;
    const job = jobs.find(j => j.id === candidate.jobId);

    setIsAiLoading(true);
    try {
      const res = await aiService.scoreCandidateResume(candidate, job || { title: candidate.jobTitle, requirements: '' });
      setCandidates(prev =>
        prev.map(c =>
          c.id === candidateId
            ? {
                ...c,
                resumeScore: res.score,
                resumeMatchSummary: res.summary,
                isAiDemo: res.isDemo
              }
            : c
        )
      );
      setIsAiLoading(false);
      return res;
    } catch (err) {
      setIsAiLoading(false);
      throw err;
    }
  };

  // Trigger AI Interview Evaluation for Candidate
  const conductAIInterview = async (candidateId) => {
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;
    const job = jobs.find(j => j.id === candidate.jobId);

    setIsAiLoading(true);
    try {
      const res = await aiService.scoreAIInterview(candidate, job);
      setCandidates(prev =>
        prev.map(c =>
          c.id === candidateId
            ? {
                ...c,
                aiInterviewScore: res.interviewScore,
                aiInterviewSummary: res.interviewSummary,
                status: c.status === 'Applied' ? 'AI Interviewed' : c.status,
                isAiDemo: res.isDemo
              }
            : c
        )
      );
      setIsAiLoading(false);
      return res;
    } catch (err) {
      setIsAiLoading(false);
      throw err;
    }
  };

  // Download Resume
  const downloadCandidateResume = (candidate) => {
    const content = `=====================================================
XUNARIS + HYRA CONNECT - APPLICANT DOSSIER
=====================================================
Applicant Name:   ${candidate.fullName}
Email:            ${candidate.email}
Phone:            ${candidate.phone}
Target Position:  ${candidate.jobTitle}
Payroll Workflow: ${candidate.payrollType}
Experience:       ${candidate.experienceYears} Years
Application Date: ${candidate.appliedAt}
Current Status:   ${candidate.status}

-----------------------------------------------------
AI RESUME MATCH SCORE: ${candidate.resumeScore || 'N/A'}/100
-----------------------------------------------------
${candidate.resumeMatchSummary || 'No summary available.'}

-----------------------------------------------------
AI INTERVIEW EVALUATION: ${candidate.aiInterviewScore ? `${candidate.aiInterviewScore}/100` : 'Pending Interview'}
-----------------------------------------------------
${candidate.aiInterviewSummary || 'AI interview has not yet been conducted.'}

-----------------------------------------------------
VERIFIED SKILLS
-----------------------------------------------------
${candidate.skills}

-----------------------------------------------------
RESUME CONTENT & EXPERIENCE
-----------------------------------------------------
${candidate.resumeText || 'No plain text provided. Original filename: ' + candidate.resumeFileName}
=====================================================
Document generated securely from HYRA Connect Staffing Portal.`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${candidate.fullName.replace(/\s+/g, '_')}_Dossier.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Metrics
  const metrics = {
    totalPartners: partners.length,
    approvedPartners: partners.filter(p => p.status === 'Approved').length,
    pendingPartners: partners.filter(p => p.status === 'Pending').length,
    totalJobs: jobs.length,
    approvedJobs: jobs.filter(j => j.status === 'Approved').length,
    pendingJobs: jobs.filter(j => j.status === 'Pending Approval').length,
    correctionJobs: jobs.filter(j => j.status === 'Needs Correction').length,
    xunarisPayrollJobs: jobs.filter(j => j.payrollType === 'Xunaris Payroll').length,
    partnerPayrollJobs: jobs.filter(j => j.payrollType === 'Partner Payroll').length,
    totalCandidates: candidates.length,
    shortlistedCandidates: candidates.filter(c => c.status === 'Shortlisted').length,
    hiredCandidates: candidates.filter(c => c.status === 'Hired').length
  };

  return (
    <RecruitmentContext.Provider
      value={{
        partners,
        recruiters,
        jobs,
        candidates,
        metrics,
        activeTab,
        setActiveTab,
        payrollFilter,
        setPayrollFilter,
        jobStatusFilter,
        setJobStatusFilter,
        candidateStageFilter,
        setCandidateStageFilter,
        searchQuery,
        setSearchQuery,
        isAiLoading,
        // Actions
        registerPartner,
        approvePartner,
        rejectPartner,
        inviteRecruiter,
        removeRecruiter,
        createJob,
        bulkAddJobs,
        approveJob,
        rejectJob,
        requestCorrectionJob,
        deleteJob,
        applyCandidate,
        updateCandidateStatus,
        shortlistCandidate,
        scoreCandidate,
        conductAIInterview,
        downloadCandidateResume
      }}
    >
      {children}
    </RecruitmentContext.Provider>
  );
};

export const useRecruitment = () => {
  const context = useContext(RecruitmentContext);
  if (!context) throw new Error('useRecruitment must be used within a RecruitmentProvider');
  return context;
};
