/**
 * Xunaris + HYRA Connect Unified API Client
 * Connects the React frontend directly to the Express + SQLite backend.
 */

const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('xunaris_auth_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('xunaris_auth_token', token);
    } else {
      localStorage.removeItem('xunaris_auth_token');
    }
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Attach active user ID from storage for dev RBAC continuity
    try {
      const activeUser = JSON.parse(localStorage.getItem('xunaris_current_user') || '{}');
      if (activeUser && activeUser.id) {
        headers['x-user-id'] = activeUser.id;
      }
    } catch (e) {}

    const config = {
      ...options,
      headers
    };

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      config.body = JSON.stringify(options.body);
    }

    try {
      const res = await fetch(url, config);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || (data.errors && data.errors[0]?.message) || `HTTP Error ${res.status}`);
      }
      return data;
    } catch (err) {
      console.warn(`[API Client] Error on ${endpoint}:`, err.message);
      throw err;
    }
  }

  // Auth
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    if (data.token) this.setToken(data.token);
    return data;
  }

  async register(userData) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: userData
    });
    if (data.token) this.setToken(data.token);
    return data;
  }

  async resetToken(email) {
    return this.request('/auth/reset', {
      method: 'POST',
      body: { email }
    });
  }

  async resetConfirm(token, newPassword) {
    return this.request('/auth/reset-confirm', {
      method: 'POST',
      body: { token, newPassword }
    });
  }

  async getUsers() {
    return this.request('/auth/users');
  }

  // Service Catalog
  async getServices(vertical = null) {
    const query = vertical ? `?vertical=${vertical}` : '';
    return this.request(`/catalog/services${query}`);
  }

  // Companies & Contacts
  async getCompanies() {
    return this.request('/companies');
  }

  async createCompany(companyData) {
    return this.request('/companies', {
      method: 'POST',
      body: companyData
    });
  }

  async getContacts(companyId = null) {
    const query = companyId ? `?companyId=${companyId}` : '';
    return this.request(`/companies/contacts${query}`);
  }

  async createContact(contactData) {
    return this.request('/companies/contacts', {
      method: 'POST',
      body: contactData
    });
  }

  // Leads
  async getLeads(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return this.request(`/leads?${query}`);
  }

  async createLead(leadData) {
    return this.request('/leads', {
      method: 'POST',
      body: leadData
    });
  }

  async updateLead(id, updates) {
    return this.request(`/leads/${id}`, {
      method: 'PATCH',
      body: updates
    });
  }

  async deleteLead(id) {
    return this.request(`/leads/${id}`, {
      method: 'DELETE'
    });
  }

  async qualifyLead(id, data = {}) {
    return this.request(`/leads/${id}/qualify`, {
      method: 'POST',
      body: data
    });
  }

  // Opportunities
  async getOpportunities(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return this.request(`/opportunities?${query}`);
  }

  async createOpportunity(oppData) {
    return this.request('/opportunities', {
      method: 'POST',
      body: oppData
    });
  }

  async updateOpportunityStage(id, stageData) {
    return this.request(`/opportunities/${id}/stage`, {
      method: 'PATCH',
      body: stageData
    });
  }

  async acceptHandoff(oppId, notes) {
    return this.request(`/opportunities/handoffs/${oppId}/accept`, {
      method: 'PATCH',
      body: { notes }
    });
  }

  // Activities
  async getActivities(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return this.request(`/activities?${query}`);
  }

  async createActivity(activityData) {
    return this.request('/activities', {
      method: 'POST',
      body: activityData
    });
  }

  async updateActivity(id, updates) {
    return this.request(`/activities/${id}`, {
      method: 'PATCH',
      body: updates
    });
  }

  // Campaigns
  async getCampaigns() {
    return this.request('/campaigns');
  }

  async createCampaign(campaignData) {
    return this.request('/campaigns', {
      method: 'POST',
      body: campaignData
    });
  }

  async scheduleCampaign(id) {
    return this.request(`/campaigns/${id}/schedule`, {
      method: 'POST'
    });
  }

  // Dashboard & Reports
  async getDashboard(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/dashboard?${query}`);
  }

  async getReports(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/reports?${query}`);
  }

  // Admin
  async getAdminRules() {
    return this.request('/admin/rules');
  }

  async toggleAdminRule(id) {
    return this.request(`/admin/rules/${id}/toggle`, {
      method: 'POST'
    });
  }

  async testEmail(emailSender) {
    return this.request('/admin/test-email', {
      method: 'POST',
      body: { emailSender }
    });
  }

  async addAdminUser(userData) {
    return this.request('/admin/users', {
      method: 'POST',
      body: userData
    });
  }

  async setUserPassword(id, password) {
    return this.request(`/admin/users/${id}/password`, {
      method: 'PUT',
      body: { password }
    });
  }

  async deleteAdminUser(id) {
    return this.request(`/admin/users/${id}`, {
      method: 'DELETE'
    });
  }

  // Notifications
  async getNotifications() {
    return this.request('/notifications');
  }

  // Recruitment Module
  async getPartners() {
    return this.request('/recruitment/partners');
  }

  async createPartner(partnerData) {
    return this.request('/recruitment/partners', {
      method: 'POST',
      body: partnerData
    });
  }

  async updatePartnerStatus(id, status) {
    return this.request(`/recruitment/partners/${id}/status`, {
      method: 'PATCH',
      body: { status }
    });
  }

  async getRecruiters() {
    return this.request('/recruitment/recruiters');
  }

  async createRecruiter(recruiterData) {
    return this.request('/recruitment/recruiters', {
      method: 'POST',
      body: recruiterData
    });
  }

  async getJobs() {
    return this.request('/recruitment/jobs');
  }

  async createJob(jobData) {
    return this.request('/recruitment/jobs', {
      method: 'POST',
      body: jobData
    });
  }

  async getCandidates() {
    return this.request('/recruitment/candidates');
  }

  async createCandidate(candidateData) {
    return this.request('/recruitment/candidates', {
      method: 'POST',
      body: candidateData
    });
  }
}

export const apiClient = new ApiClient();
