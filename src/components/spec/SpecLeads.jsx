import React, { useState, useEffect } from 'react';
import { useCRM } from '../../context/CRMContext';
import { SpecHeader } from './SpecHeader';
import { SpecAddLeadModal } from './SpecAddLeadModal';
import { BulkLeadUploadModal } from '../crm/BulkLeadUploadModal';
import { SERVICE_CATALOG } from '../../data/crmSpecData';
import { CheckCircle2, AlertCircle, Plus, Trash2, Mail, Send, X, ShieldCheck, ExternalLink, Check, ChevronDown } from 'lucide-react';
import { launchEmailCompose, downloadOutlookEmlDraft, copyRichHtmlToClipboard } from '../../utils/emailCompose';

export const SpecLeads = () => {
  const { leads, createLead, updateLead, deleteLead, convertLeadToOpportunity, users, companies, currentUser, addActivity } = useCRM();

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(leads[0]?.id || null);

  // Authorized Outbound Email Dispatch for Lead Modal State
  const [senderAccounts, setSenderAccounts] = useState([
    { id: 'acc_hyra', email: 'sales@hyraconnect.com', display_name: 'HYRA Connect Sales', business_vertical: 'HYRA Connect', is_verified: 1, verification_status: 'Authorized' },
    { id: 'acc_xunaris', email: 'sales@xunaris.com', display_name: 'Xunaris Sales', business_vertical: 'Xunaris', is_verified: 1, verification_status: 'Authorized' }
  ]);
  const [isLeadEmailModalOpen, setIsLeadEmailModalOpen] = useState(false);
  const [leadEmailTarget, setLeadEmailTarget] = useState(null);
  const [leadSenderAccount, setLeadSenderAccount] = useState('sales@hyraconnect.com');
  const [leadRecipientEmail, setLeadRecipientEmail] = useState('');
  const [leadEmailSubject, setLeadEmailSubject] = useState('');
  const [leadEmailBody, setLeadEmailBody] = useState('');
  const [leadEmailSending, setLeadEmailSending] = useState(false);
  const [leadEmailResult, setLeadEmailResult] = useState(null);
  const [checkedLeadIds, setCheckedLeadIds] = useState([]);
  const [composeMethod, setComposeMethod] = useState('outlook'); // 'outlook' | 'outlook-web' | 'gmail' | 'direct'
  const [inlineSmtpPass, setInlineSmtpPass] = useState('');

  const handleSendDirectFromCRM = async () => {
    if (!leadRecipientEmail.trim()) {
      alert('Recipient email address is required.');
      return;
    }
    setLeadEmailSending(true);
    setLeadEmailResult(null);

    // If an inline password is provided for this account, configure it first
    if (inlineSmtpPass.trim()) {
      const accId = leadSenderAccount.includes('hyra') ? 'acc_hyra' : 'acc_xunaris';
      try {
        await fetch(`/api/campaigns/sender-accounts/${accId}/configure`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            smtp_user: leadSenderAccount,
            smtp_pass: inlineSmtpPass.trim(),
            display_name: leadSenderAccount.includes('hyra') ? 'HYRA Connect Sales' : 'Xunaris Sales'
          })
        });
      } catch (e) {
        console.warn('Failed inline config:', e);
      }
    }

    try {
      const res = await fetch('/api/campaigns/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testEmail: leadRecipientEmail.trim(),
          senderAccount: leadSenderAccount,
          businessUnit: leadSenderAccount.includes('hyra') ? 'HYRA Connect' : 'Xunaris',
          subject: leadEmailSubject,
          body: leadEmailBody,
          owner: currentUser?.name || 'Sales User'
        })
      });

      const data = await res.json();
      setLeadEmailSending(false);
      setLeadEmailResult({
        ...data,
        directBackend: true
      });

      if (data.success) {
        setNotice(`🎉 Email successfully dispatched directly from official sender ${data.sender} to ${data.recipient}!`);
        if (addActivity) {
          addActivity({
            relatedTo: leadEmailTarget?.isMultiple
              ? `${leadRecipientEmail.split(',').length} Selected Leads`
              : (leadEmailTarget?.companyName || 'Lead Direct'),
            activityType: 'Email',
            subject: `[Official Email Sent] ${leadEmailSubject}`,
            dateTime: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            assignedTo: currentUser?.name || 'Sales User',
            status: 'Completed',
            outcome: `Dispatched directly from official sender ${data.sender} to ${data.recipient}. Official From address guaranteed.`,
            nextFollowup: 'Next Week',
            reminder: '1 day before',
            result: 'Delivered'
          });
        }
      } else {
        setNotice(`⚠️ ${data.error || data.message}`);
      }
    } catch (err) {
      setLeadEmailSending(false);
      setLeadEmailResult({
        success: false,
        directBackend: true,
        sender: leadSenderAccount,
        recipient: leadRecipientEmail,
        deliveryStatus: 'Failed',
        error: `Network error: ${err.message}`
      });
      setNotice(`Error: ${err.message}`);
    }
  };

  useEffect(() => {
    fetch('/api/campaigns/sender-accounts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const sorted = [...data].sort((a, b) => a.email === 'sales@hyraconnect.com' ? -1 : 1);
          setSenderAccounts(sorted);
        }
      })
      .catch(err => console.warn('Could not fetch sender accounts in SpecLeads:', err));
  }, []);

  // Dynamic Form inputs
  const [leadName, setLeadName] = useState(leads[0]?.contactName || '');
  const [company, setCompany] = useState(leads[0]?.companyName || '');
  const [email, setEmail] = useState(leads[0]?.workEmail || '');
  const [phone, setPhone] = useState(leads[0]?.phone || '');
  const [businessUnit, setBusinessUnit] = useState(leads[0]?.businessVertical || 'HYRA Connect');
  const [source, setSource] = useState(leads[0]?.leadSource || 'LinkedIn');
  const [serviceInterest, setServiceInterest] = useState(leads[0]?.service || 'IT Staffing');
  const [status, setStatus] = useState(leads[0]?.status || 'New');
  const [owner, setOwner] = useState(leads[0]?.ownerName || currentUser.name);
  const [nextFollowup, setNextFollowup] = useState(leads[0]?.nextFollowup || '16 Oct 2026');
  const [priority, setPriority] = useState(leads[0]?.priority || 'High');
  const [notes, setNotes] = useState(leads[0]?.notes || '');

  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Synchronize when businessUnit changes to ensure service matches the vertical catalog
  const currentVerticalCode = businessUnit === 'Xunaris' ? 'XUN' : 'HYRA';
  const availableServices = SERVICE_CATALOG[currentVerticalCode] || [];

  const handleBusinessUnitChange = (unit) => {
    setBusinessUnit(unit);
    const code = unit === 'Xunaris' ? 'XUN' : 'HYRA';
    setServiceInterest(SERVICE_CATALOG[code][0]);
  };

  // Populate form when row is clicked
  const handleSelectLeadRow = (lead) => {
    setSelectedLeadId(lead.id);
    setLeadName(lead.contactName || '');
    setCompany(lead.companyName || '');
    setEmail(lead.workEmail || '');
    setPhone(lead.phone || '');
    setBusinessUnit(lead.businessVertical || 'HYRA Connect');
    setSource(lead.leadSource || 'LinkedIn');
    setServiceInterest(lead.service || 'IT Staffing');
    setStatus(lead.status || 'New');
    setOwner(lead.ownerName || currentUser.name);
    setNextFollowup(lead.nextFollowup || '16 Oct 2026');
    setPriority(lead.priority || 'Medium');
    setNotes(lead.notes || '');
    setErrorMsg('');
  };

  const handleClearForm = () => {
    setSelectedLeadId(null);
    setLeadName('');
    setCompany('');
    setEmail('');
    setPhone('');
    setBusinessUnit('Xunaris');
    setSource('LinkedIn');
    setServiceInterest(SERVICE_CATALOG['XUN'][0]);
    setStatus('New');
    setOwner(currentUser.name);
    setNextFollowup('16 Oct 2026');
    setPriority('Medium');
    setNotes('');
    setErrorMsg('');
    setNotice('Form cleared. Enter details to create a new lead.');
    setTimeout(() => setNotice(''), 2500);
  };

  const handleSaveLead = () => {
    setErrorMsg('');
    if (!company.trim() || !leadName.trim()) {
      setErrorMsg('Enter the company name and contact name.');
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setErrorMsg('Enter at least one contact method: work email or phone.');
      return;
    }

    if (selectedLeadId) {
      updateLead(selectedLeadId, {
        contactName: leadName.trim(),
        companyName: company.trim(),
        workEmail: email.trim(),
        phone: phone.trim(),
        businessVertical: businessUnit,
        leadSource: source,
        service: serviceInterest,
        status,
        ownerName: owner,
        nextFollowup,
        priority,
        notes
      });
      setNotice(`Updated lead ${selectedLeadId} successfully!`);
    } else {
      const created = createLead({
        contactName: leadName.trim(),
        companyName: company.trim(),
        workEmail: email.trim(),
        phone: phone.trim(),
        businessVertical: businessUnit,
        leadSource: source,
        service: serviceInterest,
        status,
        ownerName: owner,
        nextFollowup,
        priority,
        notes
      });
      setSelectedLeadId(created.id);
      setNotice(`Created new lead ${created.id}! Added to shared directory and activity timeline.`);
    }
    setTimeout(() => setNotice(''), 3500);
  };

  const handleConvert = () => {
    if (!selectedLeadId) {
      setErrorMsg('Select a lead from the records below before converting to an Opportunity.');
      return;
    }
    const opp = convertLeadToOpportunity(selectedLeadId, {
      title: `${serviceInterest} - ${company}`,
      estimatedValue: priority === 'High' ? 'INR 25,00,000' : 'INR 12,00,000'
    });
    setStatus('Qualified');
    setNotice(`Qualified! Opportunity ${opp.id} created under ${businessUnit} vertical.`);
    setTimeout(() => setNotice(''), 4000);
  };

  const handleDeleteLead = (e, id) => {
    e.stopPropagation();
    if (window.confirm(`Delete lead ${id}?`)) {
      deleteLead(id);
      if (selectedLeadId === id) handleClearForm();
      setNotice(`Lead ${id} removed.`);
      setTimeout(() => setNotice(''), 2500);
    }
  };

  const handleOpenEmailForLead = (lead) => {
    setLeadEmailTarget(lead);
    const defaultSender = 'sales@hyraconnect.com';
    setLeadSenderAccount(defaultSender);

    // Ensure To address is never empty
    const emailToUse = (lead.workEmail && lead.workEmail.trim()) || 
      `${(lead.contactName || 'lead').toLowerCase().replace(/\s+/g, '.')}@${(lead.companyName || 'example').toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
    setLeadRecipientEmail(emailToUse);

    const isHyra = lead.businessVertical === 'HYRA Connect' || lead.business_vertical_name === 'HYRA Connect';
    const sub = isHyra
      ? `Specialized Workforce & Staffing Solutions for ${lead.companyName || 'your business'}`
      : `Executive Briefing: Modernizing Enterprise Infrastructure for ${lead.companyName || 'your business'}`;

    const bdy = isHyra
      ? `Hello ${lead.contactName || 'there'},\n\nI hope this note finds you well. I lead enterprise talent solutions at HYRA Connect.\n\nWe specialize in high-velocity sourcing for senior technical and niche talent across Fortune 500 organizations, with a pre-vetted pool of senior engineers ready for deployment at ${lead.companyName || 'your organization'}.\n\nWould you have 15 minutes this week for a brief exploratory discussion?\n\nBest regards,\n${lead.ownerName || currentUser?.name || 'Sales Lead'}\nTalent Partnerships Director • HYRA Connect\n${defaultSender}`
      : `Hello ${lead.contactName || 'there'},\n\nWe are reaching out from Xunaris Technology Services regarding enterprise cloud transformation and digital architecture tailored for ${lead.companyName || 'your enterprise'}.\n\nOur specialized SAP and custom software engineering practices have recently enabled enterprise clients to accelerate digital delivery timelines by over 40%.\n\nWould you have 15 minutes this Thursday or next Tuesday for a high-level briefing?\n\nBest regards,\n${lead.ownerName || currentUser?.name || 'Sales Lead'}\nTechnology Practice Lead • Xunaris Technology Services\n${defaultSender}`;

    setLeadEmailSubject(sub);
    setLeadEmailBody(bdy);
    setLeadEmailResult(null);
    setIsLeadEmailModalOpen(true);
  };

  const handleOpenEmailForMultipleLeads = (leadIds) => {
    const targets = leads.filter(l => leadIds.includes(l.id));
    if (targets.length === 0) return;

    setLeadEmailTarget({
      isMultiple: true,
      count: targets.length,
      leads: targets,
      contactName: `${targets.length} Selected Leads`,
      companyName: `${new Set(targets.map(t => t.companyName)).size} Companies`
    });

    const emails = targets.map(l =>
      (l.workEmail && l.workEmail.trim()) || 
      `${(l.contactName || 'lead').toLowerCase().replace(/\s+/g, '.')}@${(l.companyName || 'example').toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
    ).filter(Boolean);

    setLeadRecipientEmail(emails.join(', '));

    const defaultSender = 'sales@hyraconnect.com';
    setLeadSenderAccount(defaultSender);

    const isHyra = defaultSender.includes('hyra');
    const sub = isHyra
      ? 'Executive Briefing: High-Velocity Technical Workforce & Staffing Solutions'
      : 'Executive Briefing: Modernizing Enterprise Cloud & Software Infrastructure';

    const bdy = isHyra
      ? `Hello,\n\nWe are contacting you from HYRA Connect regarding specialized enterprise workforce and high-velocity talent solutions.\n\nWe partner with top-tier technology leaders across India, the US, and EMEA to deploy senior software engineers, cloud architects, and niche specialists on accelerated timelines.\n\nWould your engineering and procurement teams have 15 minutes this week to connect for a high-level discussion?\n\nBest regards,\n${currentUser?.name || 'Sales Team'}\nEnterprise Talent Partnerships • HYRA Connect\n${defaultSender}`
      : `Hello,\n\nWe are reaching out from Xunaris Technology Services regarding enterprise software modernization, cloud engineering, and digital transformation.\n\nOur specialized consulting teams help enterprises modernize legacy systems, automate CI/CD pipelines, and scale mission-critical workloads.\n\nWould you have 15 minutes this week for a brief exploratory discussion?\n\nBest regards,\n${currentUser?.name || 'Sales Team'}\nClient Solutions • Xunaris Technology Services\n${defaultSender}`;

    setLeadEmailSubject(sub);
    setLeadEmailBody(bdy);
    setLeadEmailResult(null);
    setIsLeadEmailModalOpen(true);
  };

  const handleLaunchEmailCompose = (overrideMethod) => {
    const methodToUse = (typeof overrideMethod === 'string' ? overrideMethod : null) || composeMethod;
    if (!leadRecipientEmail.trim()) {
      alert('Valid recipient email address is required. Please enter or select at least one recipient.');
      return;
    }

    const recipientsList = leadRecipientEmail.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
    if (recipientsList.length === 0) {
      alert('Recipient email list cannot be empty.');
      return;
    }

    const isHyra = leadSenderAccount.includes('hyra');
    const primaryColor = isHyra ? '#7c3aed' : '#0063f2';
    const secondaryColor = isHyra ? '#1e1b4b' : '#0d2238';
    const brandTitle = isHyra ? 'HYRA CONNECT' : 'XUNARIS';
    const brandSubtitle = isHyra ? 'SPECIALIZED TECHNICAL WORKFORCE & TALENT' : 'TECHNOLOGY SERVICES & CLOUD ARCHITECTURE';
    const formattedParagraphs = leadEmailBody
      .split(/\n\s*\n/)
      .map(p => `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.65; color: #334155;">${p.replace(/\n/g, '<br/>')}</p>`)
      .join('');

    const fullLeadHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <tr>
      <td style="background-color: ${secondaryColor}; padding: 24px 32px; border-bottom: 4px solid ${primaryColor};">
        <span style="font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: 1px;">${brandTitle}</span>
        <div style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-top: 3px;">${brandSubtitle}</div>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px; background-color: #ffffff;">
        ${formattedParagraphs}
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
        Sent via ${isHyra ? 'HYRA Connect' : 'Xunaris Technology Services'} Official System
      </td>
    </tr>
  </table>
</body>
</html>`;

    if (methodToUse === 'eml' || methodToUse === 'outlook') {
      const res = downloadOutlookEmlDraft({
        to: recipientsList,
        subject: leadEmailSubject,
        htmlBody: fullLeadHtml,
        from: leadSenderAccount
      });

      fetch('/api/campaigns/open-desktop-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientsList.join('; '),
          subject: leadEmailSubject,
          html: fullLeadHtml,
          text: leadEmailBody,
          from: leadSenderAccount
        })
      }).catch(() => {});

      setNotice(`⭐ Outlook HTML Draft "${res.filename}" created! Click to open it in Outlook with the full graphical design.`);
      setTimeout(() => setNotice(''), 7000);
      return;
    }

    if (methodToUse === 'copy-html') {
      copyRichHtmlToClipboard(fullLeadHtml, leadEmailBody);
      setNotice(`📋 Formatted HTML copied to clipboard! Paste (Ctrl+V) directly into your Outlook compose window.`);
      setTimeout(() => setNotice(''), 7000);
      return;
    }

    if (methodToUse === 'outlook' || methodToUse === 'outlook-web') {
      copyRichHtmlToClipboard(fullLeadHtml, leadEmailBody);
    }

    const launchResult = launchEmailCompose({
      method: methodToUse,
      senderEmail: leadSenderAccount,
      to: recipientsList.join(', '),
      subject: leadEmailSubject,
      body: leadEmailBody
    });

    if (addActivity) {
      addActivity({
        relatedTo: leadEmailTarget?.isMultiple
          ? `${recipientsList.length} Selected Leads`
          : (leadEmailTarget?.companyName || 'Lead Direct'),
        activityType: 'Email',
        subject: `[Email Compose Launched] ${leadEmailSubject}`,
        dateTime: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        assignedTo: currentUser?.name || 'Sales User',
        status: 'Completed',
        outcome: `Compose window opened via ${launchResult.method} with sender ${leadSenderAccount} to ${recipientsList.length} recipient(s).`,
        nextFollowup: 'Next Week',
        reminder: '1 day before',
        result: 'Draft Opened'
      });
    }

    setLeadEmailResult({
      success: true,
      launched: true,
      method: launchResult.method,
      sender: leadSenderAccount,
      recipient: recipientsList.join(', '),
      recipientCount: recipientsList.length,
      subject: leadEmailSubject
    });

    if (methodToUse === 'outlook' || methodToUse === 'outlook-web') {
      setNotice(`⭐ Outlook opened & Full HTML Template copied! Press Ctrl+A then Ctrl+V in Outlook to paste the complete design.`);
    } else {
      setNotice(`🎉 Email compose window opened in ${launchResult.method}! Review the draft and click Send.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <SpecHeader
        title="Leads"
        subtitle="Manual Add Lead & CSV Ingestion share the same backend validation engine"
        actionButtons={[
          { label: '+ Add Lead (Manual Form)', onClick: () => setIsManualModalOpen(true) },
          { label: 'Import Leads (CSV / Excel)', onClick: () => setIsBulkModalOpen(true), variant: 'secondary' },
          { label: 'Convert to Opportunity', onClick: handleConvert, variant: 'secondary' },
          { label: selectedLeadId ? 'Update Selected Lead' : 'Save Inline Lead', onClick: handleSaveLead, variant: 'secondary' },
          { label: 'Clear Form', onClick: handleClearForm, variant: 'secondary' }
        ]}
      />

      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Spec Card Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* DETAILS / FILTERS Section */}
        <div className="p-6 border-b border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold tracking-wider text-[#0d2238] uppercase">
              DETAILS / FILTERS
            </h2>
            {selectedLeadId && (
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono">
                Editing: {selectedLeadId}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* LEAD NAME* */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                LEAD NAME*
              </label>
              <input
                type="text"
                required
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="Priya Kumar"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>

            {/* COMPANY* */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                COMPANY*
              </label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Example Technologies"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>

            {/* EMAIL */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="priya@example.com"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>

            {/* PHONE */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                PHONE
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 90000 00000"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>

            {/* BUSINESS UNIT* (Dynamic dependent trigger) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                BUSINESS UNIT*
              </label>
              <select
                value={businessUnit}
                onChange={(e) => handleBusinessUnitChange(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium cursor-pointer"
              >
                <option value="Xunaris">Xunaris (XUN)</option>
                <option value="HYRA Connect">HYRA Connect (HYRA)</option>
              </select>
            </div>

            {/* SOURCE* */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                SOURCE*
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium cursor-pointer"
              >
                <option value="LinkedIn">LinkedIn</option>
                <option value="Manual">Manual</option>
                <option value="Referral">Referral</option>
                <option value="AI Search (ChatGPT)">AI Search (ChatGPT)</option>
                <option value="Website">Website</option>
                <option value="Campaign">Campaign</option>
                <option value="Event">Event</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* SERVICE INTEREST (Dependent Dropdown from catalog!) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                SERVICE INTEREST*
              </label>
              <select
                value={serviceInterest}
                onChange={(e) => setServiceInterest(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium cursor-pointer"
              >
                {availableServices.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* STATUS* */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                STATUS*
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium cursor-pointer"
              >
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Nurture">Nurture</option>
                <option value="Disqualified">Disqualified</option>
              </select>
            </div>

            {/* OWNER* (Dynamic from users context) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                OWNER*
              </label>
              <select
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium cursor-pointer"
              >
                {users.map(u => (
                  <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>

            {/* NEXT FOLLOW-UP* */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                NEXT FOLLOW-UP*
              </label>
              <input
                type="text"
                value={nextFollowup}
                onChange={(e) => setNextFollowup(e.target.value)}
                placeholder="16 Oct 2026"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>

            {/* PRIORITY */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                PRIORITY
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium cursor-pointer"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* NOTES */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                NOTES
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Looking for SAP..."
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>
          </div>
        </div>

        {/* RECORDS / ACTIVITY Table Section */}
        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold tracking-wider text-[#0d2238] uppercase">
              RECORDS / ACTIVITY
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              {leads.length} total leads &bull; Click row to load in form
            </span>
          </div>

          {/* Multiple Leads Selected Action Toolbar */}
          {checkedLeadIds.length > 0 && (
            <div className="flex items-center justify-between bg-blue-50/90 border border-blue-200 px-4 py-2.5 rounded-xl shadow-2xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                <span className="text-xs font-extrabold text-blue-900">
                  {checkedLeadIds.length} lead{checkedLeadIds.length > 1 ? 's' : ''} selected
                </span>
                <span className="text-[11px] text-blue-700 font-medium hidden sm:inline">
                  • Ready for multi-recipient email dispatch
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEmailForMultipleLeads(checkedLeadIds)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Mail to Selected ({checkedLeadIds.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCheckedLeadIds([])}
                  className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer underline"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="min-w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-[#f0f4f9] text-[#0d2238] font-bold">
                <tr>
                  <th className="px-3 py-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={leads.length > 0 && checkedLeadIds.length === leads.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCheckedLeadIds(leads.map(l => l.id));
                        } else {
                          setCheckedLeadIds([]);
                        }
                      }}
                      className="rounded cursor-pointer"
                      title={checkedLeadIds.length === leads.length ? 'Deselect all' : 'Select all leads'}
                    />
                  </th>
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Next action</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {leads.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center">
                      <div className="text-sm font-extrabold text-[#0d2238]">No leads yet</div>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Add your first lead, or import a CSV or Excel file. Include email, job title and industry so the Sales Agent can score them.</p>
                      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                        <button type="button" onClick={() => setIsManualModalOpen(true)} className="px-4 py-2 rounded-xl bg-[#0063f2] text-white text-xs font-bold">+ Add your first lead</button>
                        <button type="button" onClick={() => setIsBulkModalOpen(true)} className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold">Import CSV / Excel</button>
                      </div>
                    </td>
                  </tr>
                )}
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => handleSelectLeadRow(lead)}
                    className={`cursor-pointer hover:bg-blue-50/50 transition-colors ${
                      selectedLeadId === lead.id ? 'bg-blue-50/80 font-semibold' : ''
                    } ${checkedLeadIds.includes(lead.id) ? 'bg-blue-50/40' : ''}`}
                  >
                    <td className="px-3 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={checkedLeadIds.includes(lead.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCheckedLeadIds(prev => [...prev, lead.id]);
                          } else {
                            setCheckedLeadIds(prev => prev.filter(id => id !== lead.id));
                          }
                        }}
                        className="rounded cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3.5 text-slate-900">
                      <div className="font-bold">{lead.contactName}</div>
                      <span className="text-[10px] text-blue-700 font-mono font-bold">{lead.id}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 font-medium">
                      <div>{lead.companyName}</div>
                      <span className="text-[10px] text-slate-400">{lead.businessVertical} &bull; {lead.service}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        lead.status === 'Qualified'
                          ? 'bg-emerald-100 text-emerald-800'
                          : lead.status === 'Contacted'
                          ? 'bg-blue-100 text-blue-800'
                          : lead.status === 'Nurture'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 font-medium">
                      {lead.ownerName || 'Sales User'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 font-medium">
                      {lead.nextFollowup}
                    </td>
                    <td className="px-4 py-3.5 text-right flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEmailForLead(lead);
                        }}
                        className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                        title={`Send Mail to ${lead.contactName} via Official Email Composer`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteLead(e, lead.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        title="Delete Lead"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Manual Entry Modal */}
      <SpecAddLeadModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onLeadCreated={(newLead) => handleSelectLeadRow(newLead)}
      />

      {/* Bulk CSV Ingestion Modal */}
      <BulkLeadUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
      />

      {/* Outbound Email Compose Modal */}
      {isLeadEmailModalOpen && leadEmailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[#0d2238] text-sm">Send Mail</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {leadEmailTarget.isMultiple
                      ? `${leadEmailTarget.count} Selected Leads • Multi-recipient Compose`
                      : `${leadEmailTarget.contactName} • ${leadEmailTarget.companyName}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsLeadEmailModalOpen(false);
                  setLeadEmailResult(null);
                }}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Compose Method Selector Tabs */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                DISPATCH METHOD
              </label>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-center">
                <button
                  type="button"
                  onClick={() => setComposeMethod('outlook')}
                  className={`py-2 px-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    composeMethod === 'outlook'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Outlook (App)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setComposeMethod('outlook-web')}
                  className={`py-2 px-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    composeMethod === 'outlook-web'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Outlook 365</span>
                </button>
                <button
                  type="button"
                  onClick={() => setComposeMethod('gmail')}
                  className={`py-2 px-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    composeMethod === 'gmail'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Gmail</span>
                </button>
                <button
                  type="button"
                  onClick={() => setComposeMethod('direct')}
                  className={`py-2 px-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    composeMethod === 'direct'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Direct SMTP</span>
                </button>
              </div>
            </div>

            {/* Method Explanation Banner */}
            {composeMethod === 'outlook' ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Microsoft Outlook (Desktop Application)</span>
                </div>
                <p className="text-[11px] text-blue-800">
                  Directly launches your installed Microsoft Outlook desktop client with recipient, subject, and pre-formatted body loaded.
                </p>
              </div>
            ) : composeMethod === 'outlook-web' ? (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <ExternalLink className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Microsoft 365 / Outlook on the Web</span>
                </div>
                <p className="text-[11px] text-indigo-800">
                  Opens your corporate Office 365 Outlook web compose window (outlook.office.com) in your browser tab.
                </p>
              </div>
            ) : composeMethod === 'direct' ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Direct CRM Server Delivery</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Sends directly through the official server. The recipient's email client will strictly display <strong>from: {leadSenderAccount}</strong> and never your personal address.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Gmail Browser Account Warning</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Gmail web will automatically send from your active browser login unless <strong>{leadSenderAccount}</strong> has been added in Gmail under <em>Settings &rarr; Accounts and Import &rarr; "Send mail as"</em>.
                </p>
              </div>
            )}

            {/* Gmail-Style Email Compose Box */}
            <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs bg-white">
              {/* FROM Line - Pixel-perfect match to user's screenshot */}
              <div className="flex items-center border-b border-slate-200 py-2.5 px-3.5 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                <span className="w-14 text-xs font-medium text-slate-500 select-none">From</span>
                <div className="flex-1 relative flex items-center">
                  <select
                    value={leadSenderAccount}
                    onChange={(e) => setLeadSenderAccount(e.target.value)}
                    className="appearance-none bg-transparent text-xs text-slate-900 font-semibold cursor-pointer pr-7 focus:outline-hidden w-full font-sans"
                  >
                    <option value="sales@hyraconnect.com">
                      HYRA Connect Sales &lt;sales@hyraconnect.com&gt;
                    </option>
                    <option value="sales@xunaris.com">
                      Xunaris Sales &lt;sales@xunaris.com&gt;
                    </option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-600 pointer-events-none absolute right-1" />
                </div>
              </div>

              {/* TO Line - Pixel-perfect match to user's screenshot */}
              <div className="flex items-start border-b border-slate-200 py-2 px-3.5 bg-white">
                <span className="w-14 text-xs font-medium text-slate-500 select-none pt-1">To</span>
                <div className="flex-1 space-y-1.5">
                  {leadRecipientEmail.trim() && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {leadRecipientEmail.split(/[,;]+/).map(s => s.trim()).filter(Boolean).map((addr, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 shadow-2xs transition-colors"
                        >
                          <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                            👤
                          </span>
                          <span className="font-mono text-[11px]">{addr}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  <input
                    type="text"
                    required
                    value={leadRecipientEmail}
                    onChange={(e) => setLeadRecipientEmail(e.target.value)}
                    placeholder="Recipients (comma separated)"
                    className="w-full text-xs py-1 focus:outline-hidden font-mono text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>

              {/* SUBJECT Line */}
              <div className="flex items-center border-b border-slate-200 py-2.5 px-3.5 bg-white">
                <input
                  type="text"
                  required
                  value={leadEmailSubject}
                  onChange={(e) => setLeadEmailSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full text-xs sm:text-sm font-medium focus:outline-hidden text-slate-900 placeholder-slate-400"
                />
              </div>

              {/* MESSAGE BODY Textarea */}
              <div className="p-3.5 bg-white">
                <textarea
                  rows={6}
                  required
                  value={leadEmailBody}
                  onChange={(e) => setLeadEmailBody(e.target.value)}
                  placeholder="Write your email message..."
                  className="w-full text-xs font-mono p-1 focus:outline-hidden leading-relaxed resize-y text-slate-800 placeholder-slate-400"
                />
              </div>
            </div>

            {/* Inline Password Field if Direct Dispatch and Account Not Authenticated */}
            {composeMethod === 'direct' && senderAccounts.find(a => a.email === leadSenderAccount)?.has_credentials !== 1 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                  SMTP PASSWORD / APP PASSWORD FOR {leadSenderAccount}
                </label>
                <input
                  type="password"
                  value={inlineSmtpPass}
                  onChange={(e) => setInlineSmtpPass(e.target.value)}
                  placeholder="Enter password to authenticate and send"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono focus:ring-2 focus:ring-blue-600"
                />
                <span className="text-[10px] text-slate-500 block">
                  Saved securely to backend environment for {leadSenderAccount}.
                </span>
              </div>
            )}

            {/* Launch Status Notification (Honest Review Notice) */}
            {leadEmailResult && leadEmailResult.launched && (
              <div className="rounded-xl p-3 text-xs bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-1 animate-in fade-in duration-150">
                <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Email Compose Window Opened!
                </p>
                <div className="text-[11px] text-emerald-800 space-y-0.5 font-mono pt-0.5">
                  <p><strong>Integration:</strong> {leadEmailResult.method}</p>
                  <p><strong>Sender:</strong> {leadEmailResult.sender}</p>
                  <p><strong>Recipients ({leadEmailResult.recipientCount}):</strong> {leadEmailResult.recipient}</p>
                </div>
                <p className="text-[11px] text-emerald-900 font-semibold pt-1">
                  👉 Your email has been prepared with all details filled in. Please review and click <strong>Send</strong> in your email window.
                </p>
              </div>
            )}

            {/* Direct Backend Result Notification */}
            {leadEmailResult && leadEmailResult.directBackend && (
              <div className={`rounded-xl p-3 text-xs ${
                leadEmailResult.success
                  ? 'bg-emerald-50 border border-emerald-300 text-emerald-950'
                  : 'bg-red-50 border border-red-300 text-red-950'
              } space-y-1 animate-in fade-in duration-150`}>
                <p className="font-bold flex items-center gap-1.5 text-sm">
                  {leadEmailResult.success ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-emerald-800">Email Dispatched Successfully!</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span className="text-red-800">Official Dispatch Requires Credentials</span>
                    </>
                  )}
                </p>
                <div className="text-[11px] font-mono space-y-0.5 pt-0.5">
                  <p><strong>Official From:</strong> {leadEmailResult.sender || leadSenderAccount}</p>
                  <p><strong>Recipient To:</strong> {leadEmailResult.recipient || leadRecipientEmail}</p>
                  <p><strong>Status:</strong> {leadEmailResult.deliveryStatus || (leadEmailResult.success ? 'Delivered' : 'Authentication Required')}</p>
                </div>
                {leadEmailResult.success ? (
                  <p className="text-[11px] text-emerald-800 font-semibold pt-1">
                    ✓ Dispatched with official header. The recipient will see <strong>{leadSenderAccount}</strong> in their From section.
                  </p>
                ) : (
                  <p className="text-[11px] text-red-700 font-sans pt-1">
                    {leadEmailResult.error || leadEmailResult.message}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsLeadEmailModalOpen(false);
                  setLeadEmailResult(null);
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleLaunchEmailCompose('eml')}
                className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Generates a full rich HTML .eml draft file that opens directly in Microsoft Outlook with complete graphics"
              >
                <Mail className="w-3.5 h-3.5 text-white" />
                <span>Open Outlook HTML Draft (.eml)</span>
              </button>

              <button
                type="button"
                onClick={() => handleLaunchEmailCompose('copy-html')}
                className="px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Copy rich HTML to clipboard to paste (Ctrl+V) into Outlook compose"
              >
                <Check className="w-3.5 h-3.5 text-indigo-700" />
                <span>Copy Rich HTML (Ctrl+V)</span>
              </button>

              {composeMethod === 'direct' ? (
                <button
                  type="button"
                  disabled={leadEmailSending}
                  onClick={handleSendDirectFromCRM}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{leadEmailSending ? 'Dispatching...' : `Send Officially via ${leadSenderAccount.split('@')[0]}`}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleLaunchEmailCompose}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {composeMethod === 'outlook'
                      ? 'Send Mail (Open in Outlook App)'
                      : composeMethod === 'outlook-web'
                      ? 'Send Mail (Open in Outlook 365)'
                      : composeMethod === 'gmail'
                      ? 'Send Mail (Open in Gmail)'
                      : 'Send Mail (Open in Mail App)'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
