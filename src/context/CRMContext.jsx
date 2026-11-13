import React, { createContext, useContext, useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { SERVICE_CATALOG } from '../data/crmSpecData';
import { apiClient } from '../services/apiClient';

const CRMContext = createContext(null);

export const CRMProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => storageService.getCurrentUser());
  const [activeNav, setActiveNav] = useState('dashboard');
  const [isLoggedIn, setIsLoggedInState] = useState(() => {
  return sessionStorage.getItem('xun_crm_logged_in') === 'true';
});

const setIsLoggedIn = (status) => {
  setIsLoggedInState(Boolean(status));
  if (status) {
    sessionStorage.setItem('xun_crm_logged_in', 'true');
  } else {
    sessionStorage.removeItem('xun_crm_logged_in');
  }
};

  // Dynamic Collections
  const [leads, setLeads] = useState(() => storageService.getLeads());
  const [companies, setCompanies] = useState(() => storageService.getCompanies());
  const [contacts, setContacts] = useState(() => storageService.getContacts());
  const [opportunities, setOpportunities] = useState(() => storageService.getOpportunities());
  const [activities, setActivities] = useState(() => storageService.getActivities());
  const [campaigns, setCampaigns] = useState(() => storageService.getCampaigns());
  const [reports, setReports] = useState(() => storageService.getReports());
  const [users, setUsers] = useState(() => storageService.getUsers());
  const [automationRules, setAutomationRules] = useState(() => storageService.getAutomationRules());
  const [serviceCatalog, setServiceCatalog] = useState(SERVICE_CATALOG);

  // Global Dashboard Filter States
  const [dashboardServiceFilter, setDashboardServiceFilter] = useState('All');
  const [dashboardPeriodFilter, setDashboardPeriodFilter] = useState('Month');

  // Initial Sync from Backend REST API
  useEffect(() => {
    const syncFromBackend = async () => {
      try {
        const [bLeads, bOpps, bComps, bContacts, bActs, bUsers, bRules] = await Promise.allSettled([
          apiClient.getLeads(),
          apiClient.getOpportunities(),
          apiClient.getCompanies(),
          apiClient.getContacts(),
          apiClient.getActivities(),
          apiClient.getUsers(),
          apiClient.getAdminRules()
        ]);

        if (bLeads.status === 'fulfilled' && Array.isArray(bLeads.value) && bLeads.value.length > 0) {
          setLeads(bLeads.value.map(l => ({
            ...l,
            serviceLine: l.business_vertical_name || (l.business_vertical_code === 'XUN' ? 'Xunaris Services' : 'HYRA Connect'),
            verticalCode: l.business_vertical_code,
            companyName: l.company_name,
            contactName: l.contact_name,
            workEmail: l.work_email,
            status: l.lead_status,
            priority: l.priority,
            nextFollowup: l.next_followup_date,
            ownerName: l.owner_name,
            ownerEmail: l.owner_email,
            aiScore: l.priority === 'High' ? 88 : l.priority === 'Urgent' ? 95 : 72
          })));
        }

        if (bOpps.status === 'fulfilled' && Array.isArray(bOpps.value) && bOpps.value.length > 0) {
          setOpportunities(bOpps.value.map(o => ({
            ...o,
            businessUnit: o.business_vertical_name,
            verticalCode: o.business_vertical_code,
            opportunityName: o.title,
            companyName: o.company_name,
            ownerName: o.owner_name,
            estimatedValue: `INR ${Number(o.expected_value || 0).toLocaleString('en-IN')}`,
            expectedValueNum: o.expected_value,
            expectedClose: o.expected_close_date,
            stage: o.stage,
            status: o.stage === 'Won' ? 'Won' : o.stage === 'Lost' ? 'Lost' : 'Open'
          })));
        }

        if (bComps.status === 'fulfilled' && Array.isArray(bComps.value) && bComps.value.length > 0) {
          setCompanies(bComps.value);
        }

        if (bContacts.status === 'fulfilled' && Array.isArray(bContacts.value) && bContacts.value.length > 0) {
          setContacts(bContacts.value.map(c => ({
            id: c.id,
            companyId: c.company_id,
            companyName: c.company_name || 'Example Technologies',
            name: c.full_name,
            role: c.title || 'Lead Contact',
            designation: c.title || 'Lead Contact',
            email: c.email || '',
            phone: c.phone || '',
            relationship: c.relationship || 'Decision maker',
            status: c.status || 'Active'
          })));
        }

        if (bActs.status === 'fulfilled' && Array.isArray(bActs.value) && bActs.value.length > 0) {
          setActivities(bActs.value.map(a => ({
            ...a,
            relatedTo: a.related_to,
            activityType: a.activity_type,
            dateTime: a.date_time,
            assignedTo: a.assigned_to,
            status: a.status,
            outcome: a.outcome,
            nextFollowup: a.next_followup
          })));
        }

        if (bUsers.status === 'fulfilled' && Array.isArray(bUsers.value) && bUsers.value.length > 0) {
          setUsers(bUsers.value);
        }

        if (bRules.status === 'fulfilled' && Array.isArray(bRules.value) && bRules.value.length > 0) {
          setAutomationRules(bRules.value.map(r => ({
            id: r.id,
            name: r.rule_name,
            trigger: r.trigger_event,
            recipient: r.recipient_type,
            enabled: r.enabled
          })));
        }
      } catch (e) {
        console.warn('[CRMContext] Initial sync note:', e.message);
      }
    };

    syncFromBackend();
  }, []);

  // Persistence Effects
  useEffect(() => {
    storageService.setCurrentUser(currentUser);
  }, [currentUser]);

  useEffect(() => {
    storageService.setLeads(leads);
  }, [leads]);

  useEffect(() => {
    storageService.setCompanies(companies);
  }, [companies]);

  useEffect(() => {
    storageService.setContacts(contacts);
  }, [contacts]);

  useEffect(() => {
    storageService.setOpportunities(opportunities);
  }, [opportunities]);

  useEffect(() => {
    storageService.setActivities(activities);
  }, [activities]);

  useEffect(() => {
    storageService.setCampaigns(campaigns);
  }, [campaigns]);

  useEffect(() => {
    storageService.setReports(reports);
  }, [reports]);

  useEffect(() => {
    storageService.setUsers(users);
  }, [users]);

  // Lead Operations with Server-style Sequential IDs (XUN-LD-000001, HYRA-LD-000001)
  const createLead = (leadData) => {
    const isXun = leadData.businessVertical === 'Xunaris' || leadData.verticalCode === 'XUN';
    const code = isXun ? 'XUN' : 'HYRA';
    const existingCount = leads.filter(l => l.verticalCode === code).length;
    const formattedId = `${code}-LD-${String(existingCount + 1).padStart(6, '0')}`;

    const newLead = {
      ...leadData,
      id: formattedId,
      verticalCode: code,
      serviceLine: isXun ? 'Xunaris Services' : 'HYRA Connect',
      status: leadData.status || 'New',
      priority: leadData.priority || 'Medium',
      aiScore: leadData.priority === 'High' ? 88 : leadData.priority === 'Urgent' ? 95 : 72,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setLeads(prev => [newLead, ...prev]);

    // Match or Add to Company directory
    const existingComp = companies.find(
      c => c.name.toLowerCase() === leadData.companyName.trim().toLowerCase()
    );

    if (!existingComp) {
      const newComp = {
        id: `CMP-${String(companies.length + 1).padStart(6, '0')}`,
        name: leadData.companyName.trim(),
        website: leadData.companyWebsite || `${leadData.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.example.com`,
        industry: leadData.industry || 'IT Services',
        city: leadData.city || 'Bengaluru',
        country: leadData.country || 'India',
        businessUnit: code === 'XUN' ? 'Xunaris' : 'HYRA Connect',
        accountOwner: leadData.ownerName || currentUser.name,
        status: 'Active',
        notes: `Created from lead ${formattedId}`
      };
      setCompanies(prev => [newComp, ...prev]);

      // Add Contact
      const newContact = {
        id: `CON-${String(contacts.length + 1).padStart(6, '0')}`,
        companyId: newComp.id,
        companyName: newComp.name,
        name: leadData.contactName.trim(),
        role: leadData.jobTitle || 'Lead Contact',
        designation: leadData.jobTitle || 'Lead Contact',
        email: leadData.workEmail || '',
        phone: leadData.phone || '',
        relationship: 'Decision maker',
        status: 'Active'
      };
      setContacts(prev => [newContact, ...prev]);
    } else {
      // Check if contact already exists for company
      const contactExists = contacts.some(
        c => c.companyName.toLowerCase() === leadData.companyName.trim().toLowerCase() &&
             (c.email.toLowerCase() === (leadData.workEmail || '').toLowerCase() || c.name.toLowerCase() === leadData.contactName.trim().toLowerCase())
      );
      if (!contactExists && leadData.contactName) {
        const newContact = {
          id: `CON-${String(contacts.length + 1).padStart(6, '0')}`,
          companyId: existingComp.id,
          companyName: existingComp.name,
          name: leadData.contactName.trim(),
          role: leadData.jobTitle || 'Contact',
          designation: leadData.jobTitle || 'Contact',
          email: leadData.workEmail || '',
          phone: leadData.phone || '',
          relationship: 'Influencer',
          status: 'Active'
        };
        setContacts(prev => [newContact, ...prev]);
      }
    }

    // Auto-create initial activity task for next action
    const newAct = {
      id: `ACT-${String(activities.length + 1).padStart(6, '0')}`,
      relatedTo: leadData.companyName,
      activityType: 'Task',
      subject: `Initial follow-up with ${leadData.contactName}`,
      dateTime: `${leadData.nextFollowup || 'Tomorrow'}, 10:00`,
      assignedTo: leadData.ownerName || currentUser.name,
      status: 'Planned',
      outcome: 'Awaiting response',
      nextFollowup: leadData.nextFollowup || '16 Oct 2026',
      reminder: '1 day before',
      result: '-'
    };
    setActivities(prev => [newAct, ...prev]);

    // Persist to backend REST API
    apiClient.createLead({
      businessVerticalCode: code,
      service: leadData.service,
      companyName: leadData.companyName,
      contactName: leadData.contactName,
      workEmail: leadData.workEmail,
      phone: leadData.phone,
      leadSource: leadData.leadSource || 'Manual',
      priority: leadData.priority || 'Medium',
      leadStatus: leadData.status || 'New',
      ownerName: leadData.ownerName || currentUser.name,
      ownerEmail: leadData.ownerEmail || currentUser.email,
      nextFollowupDate: leadData.nextFollowup,
      notes: leadData.notes
    }).catch(err => console.log('[API Sync] Lead sync note:', err.message));

    return newLead;
  };

  const bulkAddLeads = (leadRows) => {
    const createdLeads = [];
    leadRows.forEach(row => {
      const created = createLead(row);
      createdLeads.push(created);
    });
    return createdLeads;
  };

  const updateLead = (id, updatedFields) => {
    setLeads(prev => prev.map(l => (l.id === id ? { ...l, ...updatedFields } : l)));
    apiClient.updateLead(id, updatedFields).catch(() => {});
  };

  const deleteLead = (id) => {
    setLeads(prev => prev.filter(l => l.id !== id));
    apiClient.deleteLead(id).catch(() => {});
  };

  // Convert Lead to Opportunity
  const convertLeadToOpportunity = (leadId, customData = {}) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return null;

    const code = lead.verticalCode || (lead.businessVertical === 'Xunaris' ? 'XUN' : 'HYRA');
    const existingCount = opportunities.filter(o => o.verticalCode === code).length;
    const oppId = `${code}-OP-${String(existingCount + 1).padStart(6, '0')}`;

    const newOpp = {
      id: oppId,
      verticalCode: code,
      businessUnit: lead.businessVertical,
      title: customData.title || `${lead.service} - ${lead.companyName}`,
      opportunityName: customData.title || `${lead.service} - ${lead.companyName}`,
      companyName: lead.companyName,
      service: lead.service,
      stage: 'Proposal',
      estimatedValue: customData.estimatedValue || 'INR 12,00,000',
      expectedValueNum: customData.expectedValueNum || 1200000,
      expectedClose: customData.expectedClose || '30 Oct 2026',
      ownerName: lead.ownerName || currentUser.name,
      nextActionDate: lead.nextFollowup || '16 Oct 2026',
      linkedLeadId: lead.id,
      notes: `Converted from qualified lead ${lead.id}. ${lead.notes || ''}`,
      status: 'Open'
    };

    setOpportunities(prev => [newOpp, ...prev]);
    updateLead(leadId, { status: 'Qualified' });

    // Sync to backend atomically
    apiClient.qualifyLead(leadId, {
      requirementSummary: lead.requirement_summary || lead.notes || 'Verified requirement approved for proposal',
      expectedValue: customData.expectedValueNum || 1200000,
      expectedCloseDate: customData.expectedClose || '2026-10-30'
    }).catch(err => console.log('[API Sync] Opp qualify sync note:', err.message));

    return newOpp;
  };

  // Company and Contact Operations
  const addCompany = (compData) => {
    const newComp = {
      ...compData,
      id: `CMP-${String(companies.length + 1).padStart(6, '0')}`,
      status: 'Active'
    };
    setCompanies(prev => [newComp, ...prev]);
    return newComp;
  };

  const updateCompany = (id, fields) => {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c));
  };

  const addContact = (contactData) => {
    const newContact = {
      ...contactData,
      id: `CON-${String(contacts.length + 1).padStart(6, '0')}`,
      status: 'Active'
    };
    setContacts(prev => [newContact, ...prev]);
    return newContact;
  };

  const updateContact = (id, fields) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c));
  };

  // Opportunity Operations
  const addOpportunity = (oppData) => {
    const code = oppData.businessUnit === 'Xunaris' ? 'XUN' : 'HYRA';
    const existingCount = opportunities.filter(o => o.verticalCode === code).length;
    const oppId = `${code}-OP-${String(existingCount + 1).padStart(6, '0')}`;

    const newOpp = {
      ...oppData,
      id: oppId,
      verticalCode: code,
      status: 'Open'
    };
    setOpportunities(prev => [newOpp, ...prev]);
    return newOpp;
  };

  const updateOpportunity = (id, fields) => {
    setOpportunities(prev => prev.map(o => o.id === id ? { ...o, ...fields } : o));
  };

  const updateOpportunityStage = (oppId, newStage, lossReason = '', handoffData = null) => {
    setOpportunities(prev =>
      prev.map(o =>
        o.id === oppId
          ? {
              ...o,
              stage: newStage,
              lossReason: newStage === 'Lost' ? lossReason : o.lossReason,
              status: newStage === 'Won' ? 'Won' : newStage === 'Lost' ? 'Lost' : 'Open',
              handoffData: handoffData || o.handoffData
            }
          : o
      )
    );
  };

  // Activity Operations
  const addActivity = (actData) => {
    const newAct = {
      ...actData,
      id: `ACT-${String(activities.length + 1).padStart(6, '0')}`,
      result: actData.result || '-'
    };
    setActivities(prev => [newAct, ...prev]);

    apiClient.createActivity({
      relatedTo: actData.relatedTo,
      activityType: actData.activityType,
      subject: actData.subject,
      dateTime: actData.dateTime,
      assignedTo: actData.assignedTo,
      status: actData.status || 'Planned',
      outcome: actData.outcome,
      nextFollowup: actData.nextFollowup,
      result: actData.result
    }).catch(err => console.log('[API Sync] Activity sync note:', err.message));

    return newAct;
  };

  const updateActivity = (id, fields) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, ...fields } : a));
    apiClient.updateActivity(id, fields).catch(() => {});
  };

  const deleteActivity = (id) => {
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  // Campaign Operations
  const addCampaign = (campData) => {
    const newCamp = {
      ...campData,
      id: `CAM-${String(campaigns.length + 1).padStart(6, '0')}`,
      sent: Number(campData.sent) || 0,
      delivered: Number(campData.delivered) || 0,
      replies: Number(campData.replies) || 0,
      leadsCreated: Number(campData.leadsCreated) || 0
    };
    setCampaigns(prev => [newCamp, ...prev]);

    apiClient.createCampaign({
      campaignName: campData.campaignName || campData.name,
      businessVerticalCode: campData.businessUnit === 'Xunaris' ? 'XUN' : 'HYRA',
      service: campData.service || 'IT Services',
      channel: campData.channel || 'Email',
      audience: campData.audience,
      startDate: campData.startDate,
      ownerName: campData.ownerName || currentUser.name
    }).catch(err => console.log('[API Sync] Campaign sync note:', err.message));

    return newCamp;
  };

  const updateCampaign = (id, fields) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c));
  };

  const deleteCampaign = (id) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
  };

  // User Administration Operations
  const addUser = (userData) => {
    const newUser = {
      ...userData,
      id: `usr_${Date.now()}`,
      status: userData.status || 'Active'
    };
    setUsers(prev => [...prev, newUser]);

    apiClient.addAdminUser({
      name: userData.name,
      email: userData.email,
      role: userData.role || 'USER',
      department: userData.department,
      functionAccess: userData.functionAccess || 'Sales',
      scopeEnforcement: userData.scopeEnforcement || 'Owner / Team Scope Enforced'
    }).catch(err => console.log('[API Sync] User add note:', err.message));

    return newUser;
  };

  const updateUser = (id, fields) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...fields } : u));
  };

  const deleteUser = (id) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    apiClient.deleteAdminUser(id).catch(err => console.log('[API Sync] User delete note:', err.message));
  };

  const switchUser = (userId) => {
    const target = users.find(u => u.id === userId) || users[0];
    setCurrentUser(target);
  };

  // Automation Rules
  const toggleRuleEnabled = (ruleId) => {
    setAutomationRules(prev =>
      prev.map(r =>
        r.id === ruleId ? { ...r, enabled: r.enabled === 'Yes' ? 'No' : 'Yes' } : r
      )
    );
    apiClient.toggleAdminRule(ruleId).catch(err => console.log('[API Sync] Rule toggle note:', err.message));
  };

  // Clear all sample test data for clean live real-time testing
  const clearAllTestData = async () => {
    storageService.clearAllTestData();
    setLeads([]);
    setCompanies([]);
    setContacts([]);
    setOpportunities([]);
    setActivities([]);
    setCampaigns([]);
    try {
      await apiClient.request('/admin/clear-test-data', { method: 'POST' });
    } catch (e) {}
  };

  // Reset to Spec Baseline
  const resetToSpecification = () => {
    storageService.resetAllToSampleData();
    setLeads(storageService.getLeads());
    setCompanies(storageService.getCompanies());
    setContacts(storageService.getContacts());
    setOpportunities(storageService.getOpportunities());
    setActivities(storageService.getActivities());
    setCampaigns(storageService.getCampaigns());
    setReports(storageService.getReports());
    setUsers(storageService.getUsers());
  };

  // Dynamic Dashboard Stats Computed Directly from Live State
  const dynamicStats = {
    newLeads: leads.filter(l => l.status === 'New').length,
    qualifiedLeads: leads.filter(l => l.status === 'Qualified').length,
    openDeals: opportunities.filter(o => o.status === 'Open').length,
    followupsDue: activities.filter(a => a.status === 'Planned').length + leads.filter(l => l.nextFollowup).length,
    wonThisMonth: opportunities.filter(o => o.stage === 'Won').length,
    funnel: [
      { stage: 'Captured', count: leads.length, color: '#0d5cb6' },
      { stage: 'Contacted', count: leads.filter(l => l.status === 'Contacted' || l.status === 'Qualified' || l.status === 'Proposal Sent').length, color: '#1e88e5' },
      { stage: 'Qualified', count: leads.filter(l => l.status === 'Qualified').length, color: '#00acc1' },
      { stage: 'Proposal', count: opportunities.filter(o => o.stage === 'Proposal' || o.stage === 'Negotiation').length, color: '#26a69a' },
      { stage: 'Won', count: opportunities.filter(o => o.stage === 'Won').length, color: '#4caf50' }
    ],
    dealStages: [
      { stage: 'Discovery', count: opportunities.filter(o => o.stage === 'Discovery').length },
      { stage: 'Qualified', count: opportunities.filter(o => o.stage === 'Qualified').length },
      { stage: 'Proposal', count: opportunities.filter(o => o.stage === 'Proposal').length },
      { stage: 'Negotiation', count: opportunities.filter(o => o.stage === 'Negotiation').length }
    ]
  };

  return (
    <CRMContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        switchUser,
        users,
        addUser,
        updateUser,
        deleteUser,
        isLoggedIn,
        setIsLoggedIn,
        activeNav,
        setActiveNav,
        // Data collections
        leads,
        companies,
        contacts,
        opportunities,
        activities,
        campaigns,
        reports,
        automationRules,
        serviceCatalog,
        dynamicStats,
        // Operations
        createLead,
        bulkAddLeads,
        updateLead,
        deleteLead,
        convertLeadToOpportunity,
        addCompany,
        updateCompany,
        addContact,
        updateContact,
        addOpportunity,
        updateOpportunity,
        updateOpportunityStage,
        addActivity,
        updateActivity,
        deleteActivity,
        addCampaign,
        updateCampaign,
        deleteCampaign,
        toggleRuleEnabled,
        resetToSpecification,
        clearAllTestData,
        // Filters
        dashboardServiceFilter,
        setDashboardServiceFilter,
        dashboardPeriodFilter,
        setDashboardPeriodFilter
      }}
    >
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) throw new Error('useCRM must be used within a CRMProvider');
  return context;
};
