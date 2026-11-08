import { storageService } from './storageService';

export const aiService = {
  // Check if live AI is configured
  isLiveConfigured: () => {
    const config = storageService.getAIConfig();
    return Boolean(config?.apiKey && !config?.useDemoMode);
  },

  getEngineLabel: () => {
    const config = storageService.getAIConfig();
    if (config?.apiKey && !config?.useDemoMode) {
      return {
        label: 'Live Gemini AI',
        isDemo: false,
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300'
      };
    }
    return {
      label: 'Demo AI Engine',
      isDemo: true,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300'
    };
  },

  // 1. Analyze and score Lead
  analyzeLead: async (lead) => {
    const config = storageService.getAIConfig();
    const isLive = Boolean(config?.apiKey && !config?.useDemoMode);

    if (isLive) {
      try {
        const prompt = `Analyze this sales lead and return JSON with { summary, suggestions, score (0-100), priorityRationale }:
Company: ${lead.companyName}
Vertical: ${lead.businessVertical}
Service: ${lead.service}
Contact: ${lead.contactName} (${lead.jobTitle})
Requirement: ${lead.requirement}
Status: ${lead.status}
Priority: ${lead.priority}
Notes: ${lead.notes || 'None'}`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
          return {
            isDemo: false,
            engine: 'Gemini 1.5 Flash',
            summary: parsed.summary,
            suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.join('\n') : parsed.suggestions,
            score: Math.min(100, Math.max(1, Number(parsed.score) || 80)),
            priorityRationale: parsed.priorityRationale
          };
        }
      } catch (err) {
        console.warn('Live AI fallback to demo mode:', err);
      }
    }

    // Transparent Demo Mode Heuristics
    const baseScore = lead.priority === 'Urgent' ? 92 : lead.priority === 'High' ? 82 : lead.priority === 'Medium' ? 68 : 50;
    const verticalBoost = lead.businessVertical.includes('AI') || lead.businessVertical.includes('Cloud') ? 6 : 2;
    const calculatedScore = Math.min(99, baseScore + verticalBoost);

    return {
      isDemo: true,
      engine: 'Demo AI Engine (Heuristic Simulator)',
      notice: 'Demo Mode: Configure a Google Gemini API Key in AI Settings for live LLM inference.',
      summary: `[Demo Analysis] ${lead.companyName} expresses interest in ${lead.service}. Target milestone is satisfying requirement: "${lead.requirement.slice(0, 75)}...". Decision-maker contact is ${lead.contactName} (${lead.jobTitle}).`,
      suggestions: `1. Schedule a 30-minute technical discovery session with Xunaris Solutions Architect.\n2. Prepare customized case study for ${lead.industry || 'Enterprise'} industry.\n3. Send tailored rate card and SLA documentation for ${lead.service}.`,
      score: calculatedScore,
      priorityRationale: `Lead scored ${calculatedScore}/100 based on ${lead.priority} declared priority, verified executive stakeholder, and high-demand ${lead.businessVertical} domain fit.`
    };
  },

  // 2. Score Candidate Resume against Job
  scoreCandidateResume: async (candidate, job) => {
    const config = storageService.getAIConfig();
    const isLive = Boolean(config?.apiKey && !config?.useDemoMode);

    if (isLive) {
      try {
        const prompt = `Analyze this candidate resume against the job description and return JSON with { score (0-100), summary, matchedSkills: [], missingSkills: [] }:
Job Title: ${job.title}
Requirements: ${job.requirements}
Candidate Name: ${candidate.fullName}
Candidate Skills: ${candidate.skills}
Candidate Experience: ${candidate.experienceYears} years
Resume Text: ${candidate.resumeText || ''}`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
          return {
            isDemo: false,
            engine: 'Gemini 1.5 Flash',
            score: Number(parsed.score) || 75,
            summary: parsed.summary,
            matchedSkills: parsed.matchedSkills || [],
            missingSkills: parsed.missingSkills || []
          };
        }
      } catch (err) {
        console.warn('Live AI fallback to demo mode:', err);
      }
    }

    // Transparent Demo Mode Heuristics
    const jobKeywords = (job?.requirements || job?.title || '').toLowerCase().split(/[\s,]+/);
    const candidateSkills = (candidate?.skills || '').toLowerCase().split(/[\s,]+/);
    const candidateResume = (candidate?.resumeText || '').toLowerCase();

    let matches = 0;
    const matchedList = [];
    candidateSkills.forEach(skill => {
      const trimmed = skill.trim();
      if (trimmed.length > 2 && (jobKeywords.some(k => k.includes(trimmed) || trimmed.includes(k)) || candidateResume.includes(trimmed))) {
        matches++;
        if (matchedList.length < 5) matchedList.push(trimmed);
      }
    });

    const expBonus = Math.min(20, (Number(candidate.experienceYears) || 3) * 3);
    const score = Math.min(96, Math.max(45, 55 + matches * 6 + expBonus));

    return {
      isDemo: true,
      engine: 'Demo AI Engine (Heuristic Simulator)',
      notice: 'Demo Mode: Configure a Google Gemini API Key in AI Settings for live LLM inference.',
      score,
      summary: `[Demo AI Match] Candidate has ${candidate.experienceYears || '3+'} years in field matching core qualifications for "${job.title}". Matched key proficiencies in ${matchedList.join(', ') || 'relevant frameworks'}.`,
      matchedSkills: matchedList.length > 0 ? matchedList : ['Core Domain Skills', 'System Design'],
      missingSkills: ['Domain specific certifications', 'Advanced tooling niche']
    };
  },

  // 3. AI Interview Scoring and Candidate Summary
  scoreAIInterview: async (candidate, job) => {
    const config = storageService.getAIConfig();
    const isLive = Boolean(config?.apiKey && !config?.useDemoMode);

    if (isLive) {
      try {
        const prompt = `Simulate an AI technical interview evaluation for candidate ${candidate.fullName} applying for ${job?.title || 'Engineer'}. Return JSON with { interviewScore (0-100), interviewSummary, communicationScore (0-10), technicalScore (0-10), keyStrengths: [], improvementAreas: [] }`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
          return {
            isDemo: false,
            engine: 'Gemini 1.5 Flash',
            interviewScore: Number(parsed.interviewScore) || 85,
            interviewSummary: parsed.interviewSummary,
            communicationScore: Number(parsed.communicationScore) || 8,
            technicalScore: Number(parsed.technicalScore) || 8,
            keyStrengths: parsed.keyStrengths || [],
            improvementAreas: parsed.improvementAreas || []
          };
        }
      } catch (err) {
        console.warn('Live AI fallback to demo mode:', err);
      }
    }

    // Transparent Demo Mode Heuristics
    const interviewScore = Math.min(95, Math.max(60, (candidate.resumeScore || 80) - 2 + Math.floor(Math.random() * 5)));

    return {
      isDemo: true,
      engine: 'Demo AI Engine (Heuristic Simulator)',
      notice: 'Demo Mode: Configure a Google Gemini API Key in AI Settings for live LLM inference.',
      interviewScore,
      interviewSummary: `[Demo AI Interview Assessment] Candidate demonstrated structured problem decomposition, precise terminology, and clear trade-off analysis for ${job?.title || 'the target role'}. Responses reflect solid real-world experience and professional poise.`,
      communicationScore: 8.8,
      technicalScore: 8.5,
      keyStrengths: [
        'Clear articulation of architectural decision trees',
        'Strong awareness of production failure recovery and observability',
        'Collaborative attitude and proactive clarifying questions'
      ],
      improvementAreas: [
        'Could elaborate further on distributed caching strategies under high load'
      ]
    };
  }
};
