import {
  INITIAL_SPEC_USERS,
  INITIAL_COMPANIES,
  INITIAL_CONTACTS,
  INITIAL_SPEC_LEADS,
  INITIAL_OPPORTUNITIES,
  INITIAL_ACTIVITIES,
  INITIAL_CAMPAIGNS,
  INITIAL_REPORTS,
  INITIAL_AUTOMATION_RULES
} from '../data/crmSpecData';
import {
  INITIAL_PARTNERS,
  INITIAL_RECRUITERS,
  INITIAL_JOBS,
  INITIAL_CANDIDATES
} from '../data/mockData';

const SPEC_STORAGE_KEYS = {
  CURRENT_USER: 'xun_spec_current_user',
  USERS: 'xun_spec_users',
  LEADS: 'xun_spec_leads',
  COMPANIES: 'xun_spec_companies',
  CONTACTS: 'xun_spec_contacts',
  OPPORTUNITIES: 'xun_spec_opportunities',
  ACTIVITIES: 'xun_spec_activities',
  CAMPAIGNS: 'xun_spec_campaigns',
  REPORTS: 'xun_spec_reports',
  RULES: 'xun_spec_rules',
  AI_CONFIG: 'xun_spec_ai_config',
  ACTIVE_MODULE: 'xun_active_module',
  PARTNERS: 'xun_rec_partners',
  RECRUITERS: 'xun_rec_recruiters',
  JOBS: 'xun_rec_jobs',
  CANDIDATES: 'xun_rec_candidates'
};

export const storageService = {
  // Current logged in user
  getCurrentUser: () => {
    const data = localStorage.getItem(SPEC_STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : INITIAL_SPEC_USERS[1]; // default to Sales User as shown in screenshots
  },
  setCurrentUser: (user) => {
    localStorage.setItem(SPEC_STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  },

  // Users list
  getUsers: () => {
    const data = localStorage.getItem(SPEC_STORAGE_KEYS.USERS);
    const parsed = data ? JSON.parse(data) : [];
    return parsed.length >= INITIAL_SPEC_USERS.length ? parsed : INITIAL_SPEC_USERS;
  },
  setUsers: (users) => {
    localStorage.setItem(SPEC_STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  // Leads
  getLeads: () => {
    const data = localStorage.getItem(SPEC_STORAGE_KEYS.LEADS);
    return data !== null ? JSON.parse(data) : [];
  },
  setLeads: (leads) => {
    localStorage.setItem(SPEC_STORAGE_KEYS.LEADS, JSON.stringify(leads));
  },

  // Companies
  getCompanies: () => {
    const data = localStorage.getItem(SPEC_STORAGE_KEYS.COMPANIES);
    return data !== null ? JSON.parse(data) : [];
  },
  setCompanies: (companies) => {
    localStorage.setItem(SPEC_STORAGE_KEYS.COMPANIES, JSON.stringify(companies));
  },

  // Contacts
  getContacts: () => {
    const data = localStorage.getItem(SPEC_STORAGE_KEYS.CONTACTS);
    return data !== null ? JSON.parse(data) : [];
  },
  setContacts: (contacts) => {
    localStorage.setItem(SPEC_STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
  },

  // Opportunities
  getOpportunities: () => {
    const data = localStorage.getItem(SPEC_STORAGE_KEYS.OPPORTUNITIES);
    return data !== null ? JSON.parse(data) : [];
  },
  setOpportunities: (opps) => {
    localStorage.setItem(SPEC_STORAGE_KEYS.OPPORTUNITIES, JSON.stringify(opps));
  },

  // Activities
  getActivities: () => {
    const data = localStorage.getItem(SPEC_STORAGE_KEYS.ACTIVITIES);
    return data !== null ? JSON.parse(data) : [];
  },
  setActivities: (acts) => {
    localStorage.setItem(SPEC_STORAGE_KEYS.ACTIVITIES, JSON.stringify(acts));
  },

  // Campaigns
  getCampaigns: () => {
    const data = localStorage.getItem(SPEC_STORAGE_KEYS.CAMPAIGNS);
    // Drop the two built-in demo campaigns that older versions cached in this browser (exact id + name only)
    const DEMO = { 'CAM-000001': 'HYRA Launch Outreach', 'CAM-000002': 'SAP Cloud Enterprise Modernization' };
    const list = data !== null ? JSON.parse(data) : [];
    return list.filter((c) => DEMO[c.id] !== c.name);
  },
  setCampaigns: (camps) => {
    localStorage.setItem(SPEC_STORAGE_KEYS.CAMPAIGNS, JSON.stringify(camps));
  },

  // Reports
  getReports: () => {
    const data = localStorage.getItem(SPEC_STORAGE_KEYS.REPORTS);
    return data ? JSON.parse(data) : [];
  },
  setReports: (reps) => {
    localStorage.setItem(SPEC_STORAGE_KEYS.REPORTS, JSON.stringify(reps));
  },

  // Rules
  getAutomationRules: () => {
    const data = localStorage.getItem(SPEC_STORAGE_KEYS.RULES);
    return data ? JSON.parse(data) : INITIAL_AUTOMATION_RULES;
  },
  setAutomationRules: (rules) => {
    localStorage.setItem(SPEC_STORAGE_KEYS.RULES, JSON.stringify(rules));
  },

  // AI Configuration
  getAIConfig: () => {
    const data = localStorage.getItem(SPEC_STORAGE_KEYS.AI_CONFIG);
    return data ? JSON.parse(data) : { apiKey: '', provider: 'gemini', useDemoMode: true };
  },
  setAIConfig: (cfg) => {
    localStorage.setItem(SPEC_STORAGE_KEYS.AI_CONFIG, JSON.stringify(cfg));
  },

  // Active module
  getActiveModule: () => {
    const data = localStorage.getItem(SPEC_STORAGE_KEYS.ACTIVE_MODULE);
    return data || 'crm';
  },
  setActiveModule: (mod) => {
    localStorage.setItem(SPEC_STORAGE_KEYS.ACTIVE_MODULE, mod);
  },

  // Recruitment: Partners
  getPartners: () => {
    const data = localStorage.getItem(SPEC_STORAGE_KEYS.PARTNERS);
    return data ? JSON.parse(data) : [];
  },
  setPartners: (partners) => {
    localStorage.setItem(SPEC_STORAGE_KEYS.PARTNERS, JSON.stringify(partners));
  },

  // Recruitment: Recruiters
  getRecruiters: () => {
    const data = localStorage.getItem(SPEC_STORAGE_KEYS.RECRUITERS);
    return data ? JSON.parse(data) : [];
  },
  setRecruiters: (recruiters) => {
    localStorage.setItem(SPEC_STORAGE_KEYS.RECRUITERS, JSON.stringify(recruiters));
  },

  // Recruitment: Jobs
  getJobs: () => {
    const data = localStorage.getItem(SPEC_STORAGE_KEYS.JOBS);
    return data ? JSON.parse(data) : [];
  },
  setJobs: (jobs) => {
    localStorage.setItem(SPEC_STORAGE_KEYS.JOBS, JSON.stringify(jobs));
  },

  // Recruitment: Candidates
  getCandidates: () => {
    const data = localStorage.getItem(SPEC_STORAGE_KEYS.CANDIDATES);
    return data ? JSON.parse(data) : [];
  },
  setCandidates: (candidates) => {
    localStorage.setItem(SPEC_STORAGE_KEYS.CANDIDATES, JSON.stringify(candidates));
  },

  // Clear all sample test data for clean live testing
  clearAllTestData: () => {
    localStorage.setItem(SPEC_STORAGE_KEYS.LEADS, JSON.stringify([]));
    localStorage.setItem(SPEC_STORAGE_KEYS.COMPANIES, JSON.stringify([]));
    localStorage.setItem(SPEC_STORAGE_KEYS.CONTACTS, JSON.stringify([]));
    localStorage.setItem(SPEC_STORAGE_KEYS.OPPORTUNITIES, JSON.stringify([]));
    localStorage.setItem(SPEC_STORAGE_KEYS.ACTIVITIES, JSON.stringify([]));
    localStorage.setItem(SPEC_STORAGE_KEYS.CAMPAIGNS, JSON.stringify([]));
  },

  // Reset to original spec mockups
  resetAllToSampleData: () => {
    localStorage.setItem(SPEC_STORAGE_KEYS.LEADS, JSON.stringify(INITIAL_SPEC_LEADS));
    localStorage.setItem(SPEC_STORAGE_KEYS.COMPANIES, JSON.stringify(INITIAL_COMPANIES));
    localStorage.setItem(SPEC_STORAGE_KEYS.CONTACTS, JSON.stringify(INITIAL_CONTACTS));
    localStorage.setItem(SPEC_STORAGE_KEYS.OPPORTUNITIES, JSON.stringify(INITIAL_OPPORTUNITIES));
    localStorage.setItem(SPEC_STORAGE_KEYS.ACTIVITIES, JSON.stringify(INITIAL_ACTIVITIES));
    localStorage.setItem(SPEC_STORAGE_KEYS.CAMPAIGNS, JSON.stringify(INITIAL_CAMPAIGNS));
    localStorage.setItem(SPEC_STORAGE_KEYS.REPORTS, JSON.stringify(INITIAL_REPORTS));
    localStorage.setItem(SPEC_STORAGE_KEYS.USERS, JSON.stringify(INITIAL_SPEC_USERS));
    localStorage.setItem(SPEC_STORAGE_KEYS.RULES, JSON.stringify(INITIAL_AUTOMATION_RULES));
    localStorage.setItem(SPEC_STORAGE_KEYS.PARTNERS, JSON.stringify(INITIAL_PARTNERS));
    localStorage.setItem(SPEC_STORAGE_KEYS.RECRUITERS, JSON.stringify(INITIAL_RECRUITERS));
    localStorage.setItem(SPEC_STORAGE_KEYS.JOBS, JSON.stringify(INITIAL_JOBS));
    localStorage.setItem(SPEC_STORAGE_KEYS.CANDIDATES, JSON.stringify(INITIAL_CANDIDATES));
  }
};
