import React, { useState, useEffect } from 'react';
import { useCRM } from '../../context/CRMContext';
import { parseLinkedInPost } from '../../utils/parseLinkedInPost';
import { apiClient } from '../../services/apiClient';
import {
  SERVICE_CATALOG
} from '../../data/crmSpecData';
import {
  INDUSTRY_OPTIONS,
  COUNTRY_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  PRIORITY_OPTIONS,
  LEAD_STATUS_OPTIONS,
  validateLeadData,
  normalizeDomain,
  getNextBusinessDay
} from '../../services/leadValidationService';
import {
  Building2,
  User,
  Mail,
  Phone,
  Globe,
  MapPin,
  Briefcase,
  Layers,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Check,
  X,
  ExternalLink,
  PlusCircle,
  FileText,
  ShieldCheck
} from 'lucide-react';

export const SpecAddLeadModal = ({ isOpen, onClose, onLeadCreated }) => {
  const { createLead, currentUser, users, campaigns, companies, setActiveNav } = useCRM();

  // Form State
  const initialFormState = {
    businessVertical: 'Xunaris',
    service: SERVICE_CATALOG.XUN[0],
    companyName: '',
    companyWebsite: '',
    industry: 'IT Services',
    industryOther: '',
    city: 'Bengaluru',
    country: 'India',
    contactName: '',
    jobTitle: '',
    workEmail: '',
    phone: '',
    leadSource: 'Manual',
    campaignName: '',
    requirementSummary: '',
    priority: 'Medium',
    status: 'New',
    ownerEmail: 'auto',
    ownerName: 'Auto-assign',
    nextFollowup: '',
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [inlineErrors, setInlineErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successLink, setSuccessLink] = useState(null); // { id, name }
  const [notificationMsg, setNotificationMsg] = useState('');
  const [dupes, setDupes] = useState([]);

  // Look for the same email, phone or company already in the CRM (after a short pause in typing)
  useEffect(() => {
    if (!isOpen) return undefined;
    const email = formData.workEmail.includes('@') ? formData.workEmail.trim() : '';
    const phone = formData.phone.replace(/[^0-9]/g, '').length >= 8 ? formData.phone : '';
    const company = formData.companyName.trim().length >= 3 ? formData.companyName.trim() : '';
    if (!email && !phone && !company) { setDupes([]); return undefined; }
    const t = setTimeout(() => {
      const q = new URLSearchParams({ email, phone, company }).toString();
      apiClient.request(`/lead-ai/duplicates?${q}`).then(setDupes).catch(() => setDupes([]));
    }, 600);
    return () => clearTimeout(t);
  }, [isOpen, formData.workEmail, formData.phone, formData.companyName]);

  const openExisting = (id) => {
    try { sessionStorage.setItem('xun_open_lead', id); } catch {}
    setActiveNav('leads');
    onClose();
  };

  const [pasteText, setPasteText] = useState('');
  const [pasteResult, setPasteResult] = useState(null);

  const applyPastedPost = () => {
    const r = parseLinkedInPost(pasteText);
    if (!pasteText.trim()) return;
    const check = [...r.check];
    const fields = { ...r.fields };
    if (!fields.service) { fields.service = SERVICE_CATALOG.HYRA[0]; if (!check.includes('Service')) check.push('Service'); }
    setFormData((prev) => ({ ...prev, ...fields }));
    setInlineErrors({});
    setPasteResult({ found: r.found, check, hints: r.hints });
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...initialFormState,
        ownerEmail: 'auto',
        ownerName: 'Auto-assign'
      });
      setInlineErrors({});
      setSuccessLink(null);
      setNotificationMsg('');
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // Active vertical and dependent service catalog
  const isXun = formData.businessVertical === 'Xunaris';
  const currentVerticalCode = isXun ? 'XUN' : 'HYRA';
  const availableServices = SERVICE_CATALOG[currentVerticalCode] || [];

  // Active campaigns under the same vertical for campaign lookup
  const relevantCampaigns = campaigns.filter(c => {
    if (formData.businessVertical === 'Xunaris') {
      return c.businessUnit === 'Xunaris' || c.verticalCode === 'XUN';
    }
    return c.businessUnit === 'HYRA Connect' || c.verticalCode === 'HYRA';
  });

  // Check if company already exists in directory
  const existingCompanyMatch = companies.find(
    c => c.name.trim().toLowerCase() === formData.companyName.trim().toLowerCase() && c.name.trim().length > 1
  );

  // Handle Business Vertical change (Rule: Reject missing; service reset when changed)
  const handleVerticalChange = (vertical) => {
    const nextCode = vertical === 'Xunaris' ? 'XUN' : 'HYRA';
    const nextDefaultService = SERVICE_CATALOG[nextCode][0];

    setFormData(prev => ({
      ...prev,
      businessVertical: vertical,
      service: nextDefaultService, // Reset service when vertical changed
      campaignName: '' // Reset campaign if vertical changes
    }));

    // Clear vertical/service errors
    setInlineErrors(prev => {
      const copy = { ...prev };
      delete copy.businessVertical;
      delete copy.service;
      return copy;
    });
  };

  // Real-time field change handler
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear inline error on change
    if (inlineErrors[field]) {
      setInlineErrors(prev => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  // Normalize website on blur
  const handleWebsiteBlur = () => {
    if (formData.companyWebsite.trim()) {
      const normalized = normalizeDomain(formData.companyWebsite);
      setFormData(prev => ({ ...prev, companyWebsite: normalized }));
    }
  };

  // Execute Complete Creation Sequence:
  // (validate -> match -> create -> assign -> task -> notify)
  const executeSaveSequence = (keepOpenAfterSave = false) => {
    setNotificationMsg('');
    setSuccessLink(null);

    // 1. VALIDATE: Run shared backend validation engine
    const validation = validateLeadData(formData, {
      isCsvImport: false,
      existingCampaigns: campaigns,
      adminFallbackEmail: 'admin@xunaris.com'
    });

    if (!validation.isValid) {
      setInlineErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);

    try {
      // 2. MATCH & ASSIGN: Match owner and fallback
      const normalized = validation.normalized;
      const ownerUser = users.find(u => u.email.toLowerCase() === normalized.ownerEmail.toLowerCase());
      normalized.ownerName = ownerUser ? ownerUser.name : 'Sales User';

      // 3. CREATE: Generate sequential ID and store lead
      const createdLead = createLead(normalized);

      // 4. TASK & NOTIFY: Notification alert
      const taskDate = normalized.nextFollowup || getNextBusinessDay();
      const notificationText = `Validation passed & Lead ${createdLead.id} created! Matched to company "${createdLead.companyName}". Follow-up task scheduled for ${taskDate} assigned to ${normalized.ownerName}.`;

      setNotificationMsg(notificationText);
      setSuccessLink({ id: createdLead.id, name: createdLead.companyName });

      if (onLeadCreated) {
        onLeadCreated(createdLead);
      }

      if (keepOpenAfterSave) {
        // Reset form for next entry while preserving success message
        setTimeout(() => {
          setFormData({
            ...initialFormState,
            businessVertical: formData.businessVertical,
            service: SERVICE_CATALOG[formData.businessVertical === 'Xunaris' ? 'XUN' : 'HYRA'][0],
            ownerEmail: 'auto',
            ownerName: 'Auto-assign'
          });
          setInlineErrors({});
          setIsSubmitting(false);
        }, 500);
      } else {
        setTimeout(() => {
          setIsSubmitting(false);
          onClose();
        }, 1200);
      }
    } catch (err) {
      // On network failure: preserve entered values and show error
      setInlineErrors({ form: 'Network submission error. Entered values have been preserved. Please retry.' });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink-900/70 backdrop-blur-xs transition-opacity"
        onClick={() => !isSubmitting && onClose()}
      />

      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
        <div className="relative w-full max-w-4xl bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-ink-900 tracking-tight">
                  Add Lead &bull; Manual Entry
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-hyra-50 text-hyra-700 border border-hyra-200 px-2 py-0.5 rounded-full">
                  Unified Form
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Required vertical & service controls &bull; Required fields marked <span className="text-rose-500 font-bold">*</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Success Banner with Direct Link to Created Lead */}
          {successLink && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Success!</strong> Lead{' '}
                  <span className="font-mono font-bold">{successLink.id}</span> created for{' '}
                  <strong>{successLink.name}</strong>.
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="font-bold underline text-emerald-900 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
              >
                <span>View in Lead List</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Form-level Error Banner */}
          {inlineErrors.form && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{inlineErrors.form}</span>
            </div>
          )}

          {/* Paste a LinkedIn post: fills the form below, nothing is saved until you press Save */}
          <div className="p-4 rounded-2xl bg-hyra-50/60 border border-hyra-100 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-hyra-700">Optional: paste a LinkedIn post</span>
              {(pasteText || pasteResult) && (
                <button type="button" onClick={() => { setPasteText(''); setPasteResult(null); }} className="text-[11px] font-bold text-slate-500 hover:text-slate-800">Clear</button>
              )}
            </div>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={4}
              placeholder="Copy the text of a post that has a hiring need or contact details, and paste it here. We fill in the company, contact, email, phone and requirement for you to check."
              className="w-full text-xs px-3 py-2 rounded-xl border border-hyra-200 bg-white focus:ring-2 focus:ring-hyra-600 focus:outline-hidden"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={applyPastedPost} disabled={!pasteText.trim()}
                className="px-3.5 py-2 rounded-xl bg-hyra-700 text-white text-xs font-bold disabled:opacity-50">Fill the form</button>
              <span className="text-[11px] text-slate-500">Nothing is saved until you press Save Lead.</span>
            </div>
            {pasteResult && (
              <div className="text-xs space-y-1 pt-1">
                {pasteResult.found.length > 0 && <p className="text-emerald-700"><strong>Found in the post:</strong> {pasteResult.found.join(', ')}</p>}
                {pasteResult.check.length > 0 && <p className="text-amber-700"><strong>Please check (guessed):</strong> {pasteResult.check.join(', ')}</p>}
                {pasteResult.hints.map((h) => <p key={h} className="text-slate-600">{h}</p>)}
              </div>
            )}
          </div>

          {dupes.length > 0 && (
            <div className={`p-3.5 rounded-2xl border text-xs space-y-2 ${dupes.some((d) => d.strong) ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`} role="alert">
              <div className="font-bold text-ink-900">{dupes.some((d) => d.strong) ? 'This lead is probably already in your CRM' : 'This company is already in your CRM'}</div>
              <ul className="space-y-1.5">
                {dupes.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-slate-700"><strong>{d.company}</strong>, {d.contact} · {d.status} · owner {d.owner || 'none'} <span className="text-slate-500">({d.match})</span></span>
                    <button type="button" onClick={() => openExisting(d.id)} className="font-bold text-hyra-700 underline">Open it</button>
                  </li>
                ))}
              </ul>
              <p className="text-slate-500">You can still save this as a new lead if it is a different person.</p>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeSaveSequence(false);
            }}
            className="space-y-5"
          >
            {/* ========================================================= */}
            {/* SECTION 1: BUSINESS VERTICAL & SERVICE (REQUIRED)        */}
            {/* ========================================================= */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                1. Service Line & Vertical Classification
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Field: Business Vertical (Dropdown: Xunaris / HYRA Connect, Required) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 uppercase">
                      Business Vertical <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">service reset on change</span>
                  </div>
                  <select
                    value={formData.businessVertical}
                    onChange={(e) => handleVerticalChange(e.target.value)}
                    className={`w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border bg-white font-semibold transition-all ${
                      inlineErrors.businessVertical
                        ? 'border-rose-400 ring-2 ring-rose-500/10'
                        : 'border-slate-300 focus:ring-2 focus:ring-hyra-700'
                    }`}
                  >
                    <option value="Xunaris">Xunaris (IT & Cloud Services)</option>
                    <option value="HYRA Connect">HYRA Connect (Staffing & Recruitment)</option>
                  </select>
                  {inlineErrors.businessVertical && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{inlineErrors.businessVertical}</p>
                  )}
                </div>

                {/* Field: Service (Dependent Dropdown: Must match vertical, Required) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 uppercase">
                      Service Line Dependent <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-bold text-hyra-700 bg-hyra-50 px-1.5 py-0.2 rounded border border-hyra-200">
                      {currentVerticalCode} Active Catalog
                    </span>
                  </div>
                  <select
                    value={formData.service}
                    onChange={(e) => handleChange('service', e.target.value)}
                    className={`w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border bg-white font-medium transition-all ${
                      inlineErrors.service
                        ? 'border-rose-400 ring-2 ring-rose-500/10'
                        : 'border-slate-300 focus:ring-2 focus:ring-hyra-700'
                    }`}
                  >
                    {availableServices.map((svc) => (
                      <option key={svc} value={svc}>
                        {svc}
                      </option>
                    ))}
                  </select>
                  {inlineErrors.service && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{inlineErrors.service}</p>
                  )}
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* SECTION 2: COMPANY DETAILS                                */}
            {/* ========================================================= */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                2. Company Information
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Field: Company Name (Text: 2-150 chars, Required, Trim, Match existing) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 uppercase">
                      Company Name <span className="text-rose-500">*</span>
                    </label>
                    {existingCompanyMatch && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        Matches {existingCompanyMatch.id}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    placeholder="e.g. Apex Global Systems"
                    className={`w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border font-medium ${
                      inlineErrors.companyName
                        ? 'border-rose-400 ring-2 ring-rose-500/10'
                        : 'border-slate-300 focus:ring-2 focus:ring-hyra-700'
                    }`}
                  />
                  {inlineErrors.companyName && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{inlineErrors.companyName}</p>
                  )}
                </div>

                {/* Field: Company Website (URL: https://..., Normalize domain, Optional) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 uppercase">
                      Company Website
                    </label>
                    <span className="text-[10px] text-slate-400">normalize domain</span>
                  </div>
                  <input
                    type="text"
                    value={formData.companyWebsite}
                    onChange={(e) => handleChange('companyWebsite', e.target.value)}
                    onBlur={handleWebsiteBlur}
                    placeholder="https://company.example.com"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-hyra-700 font-medium"
                  />
                </div>
              </div>

              {/* Row: Industry, City, Country */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                {/* Industry */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Industry
                  </label>
                  <select
                    value={formData.industry}
                    onChange={(e) => handleChange('industry', e.target.value)}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-hyra-700"
                  >
                    {INDUSTRY_OPTIONS.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                  {formData.industry === 'Other' && (
                    <input
                      type="text"
                      value={formData.industryOther}
                      onChange={(e) => handleChange('industryOther', e.target.value)}
                      placeholder="Specify industry"
                      className="w-full text-xs mt-2 px-3 py-1.5 rounded-lg border border-slate-300"
                    />
                  )}
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    City <span className="text-[10px] text-slate-400 font-normal">(Max 80)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={80}
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="e.g. Bengaluru"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-hyra-700 font-medium"
                  />
                  {inlineErrors.city && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{inlineErrors.city}</p>
                  )}
                </div>

                {/* Country */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Country
                  </label>
                  <select
                    value={formData.country}
                    onChange={(e) => handleChange('country', e.target.value)}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-hyra-700"
                  >
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* SECTION 3: CONTACT PERSON & CONDITIONAL EMAIL/PHONE       */}
            {/* ========================================================= */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  3. Contact Person & Contact Channels
                </span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Conditional: Email OR Phone Required
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Contact Name (Required: Yes, 2-100 chars, trimmed) */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Contact Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contactName}
                    onChange={(e) => handleChange('contactName', e.target.value)}
                    placeholder="e.g. Robert Sterling"
                    className={`w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border font-medium ${
                      inlineErrors.contactName
                        ? 'border-rose-400 ring-2 ring-rose-500/10'
                        : 'border-slate-300 focus:ring-2 focus:ring-hyra-700'
                    }`}
                  />
                  {inlineErrors.contactName && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{inlineErrors.contactName}</p>
                  )}
                </div>

                {/* Job Title (Optional, max 100) */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Job Title <span className="text-[10px] text-slate-400 font-normal">(Max 100)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={formData.jobTitle}
                    onChange={(e) => handleChange('jobTitle', e.target.value)}
                    placeholder="e.g. VP of Engineering"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-hyra-700 font-medium"
                  />
                </div>
              </div>

              {/* Conditional Email OR Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Work Email */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 uppercase">
                      Work Email
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">name@domain</span>
                  </div>
                  <input
                    type="email"
                    value={formData.workEmail}
                    onChange={(e) => handleChange('workEmail', e.target.value.toLowerCase())}
                    placeholder="name@company.com"
                    className={`w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border font-medium ${
                      inlineErrors.workEmail
                        ? 'border-rose-400 ring-2 ring-rose-500/10'
                        : 'border-slate-300 focus:ring-2 focus:ring-hyra-700'
                    }`}
                  />
                  {inlineErrors.workEmail && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{inlineErrors.workEmail}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 uppercase">
                      Phone Number
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">intl format</span>
                  </div>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                    className={`w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border font-medium ${
                      inlineErrors.phone
                        ? 'border-rose-400 ring-2 ring-rose-500/10'
                        : 'border-slate-300 focus:ring-2 focus:ring-hyra-700'
                    }`}
                  />
                  {inlineErrors.phone && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{inlineErrors.phone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* SECTION 4: SOURCE, CAMPAIGN LOOKUP & STATUS               */}
            {/* ========================================================= */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                4. Lead Source & Campaign Context
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Lead Source (Required: Yes) */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Lead Source <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.leadSource}
                    onChange={(e) => handleChange('leadSource', e.target.value)}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-hyra-700"
                  >
                    {LEAD_SOURCE_OPTIONS.map((src) => (
                      <option key={src} value={src}>
                        {src}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Campaign Name (Conditional: Required if Source is Campaign) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 uppercase">
                      Campaign Name {formData.leadSource === 'Campaign' && <span className="text-rose-500">*</span>}
                    </label>
                    {formData.leadSource === 'Campaign' && (
                      <span className="text-[10px] text-rose-600 font-bold">Required</span>
                    )}
                  </div>
                  {relevantCampaigns.length > 0 ? (
                    <select
                      value={formData.campaignName}
                      onChange={(e) => handleChange('campaignName', e.target.value)}
                      className={`w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border bg-white font-medium ${
                        inlineErrors.campaignName
                          ? 'border-rose-400 ring-2 ring-rose-500/10'
                          : 'border-slate-300 focus:ring-2 focus:ring-hyra-700'
                      }`}
                    >
                      <option value="">-- Select Active Campaign --</option>
                      {relevantCampaigns.map((camp) => (
                        <option key={camp.id} value={camp.name}>
                          {camp.name} ({camp.channel})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.campaignName}
                      onChange={(e) => handleChange('campaignName', e.target.value)}
                      placeholder="Enter campaign title"
                      className={`w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border font-medium ${
                        inlineErrors.campaignName
                          ? 'border-rose-400 ring-2 ring-rose-500/10'
                          : 'border-slate-300 focus:ring-2 focus:ring-hyra-700'
                      }`}
                    />
                  )}
                  {inlineErrors.campaignName && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{inlineErrors.campaignName}</p>
                  )}
                </div>

                {/* Lead Status (Default New on creation) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 uppercase">
                      Lead Status
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">defaults to New</span>
                  </div>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-hyra-700"
                  >
                    {LEAD_STATUS_OPTIONS.map((stat) => (
                      <option key={stat} value={stat}>
                        {stat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Requirement Summary (Max 1000, Multiline, Required before qualification) */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800 uppercase">
                    Requirement Summary
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">
                      Required before qualification &bull; {formData.requirementSummary.length}/1000 chars
                    </span>
                  </div>
                </div>
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={formData.requirementSummary}
                  onChange={(e) => handleChange('requirementSummary', e.target.value)}
                  placeholder="Describe scope, technical requirements, headcount, or migration objectives..."
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-hyra-700 font-medium"
                />
              </div>
            </div>

            {/* ========================================================= */}
            {/* SECTION 5: ASSIGNMENT, PRIORITY & NEXT FOLLOW-UP TASK    */}
            {/* ========================================================= */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                5. Assignment & Operational Follow-Up
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Priority (Default: Medium) */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => handleChange('priority', e.target.value)}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-hyra-700"
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Owner Email (User lookup; fallback to Admin rule) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 uppercase">
                      Owner Email Lookup
                    </label>
                    <span className="text-[10px] text-slate-400">Recommended</span>
                  </div>
                  <select
                    value={formData.ownerEmail}
                    onChange={(e) => {
                      const sel = users.find(u => u.email === e.target.value);
                      if (e.target.value === 'auto') {
                        setFormData(prev => ({ ...prev, ownerEmail: 'auto', ownerName: 'Auto-assign' }));
                        return;
                      }
                      setFormData(prev => ({
                        ...prev,
                        ownerEmail: e.target.value,
                        ownerName: sel ? sel.name : 'Sales User'
                      }));
                    }}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-hyra-700"
                  >
                    <option value="auto">Auto-assign (best available person)</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.email}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Next Follow-up Date (If blank: create default next-business-day task) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 uppercase">
                      Next Follow-Up Date
                    </label>
                    <span className="text-[10px] text-emerald-600 font-mono">auto-task</span>
                  </div>
                  <input
                    type="date"
                    value={formData.nextFollowup}
                    onChange={(e) => handleChange('nextFollowup', e.target.value)}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-hyra-700 font-medium"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    If blank: auto-creates next-business-day task ({getNextBusinessDay()})
                  </p>
                </div>
              </div>

              {/* Notes (Max 2000 chars, plain text) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800 uppercase">
                    Internal Notes
                  </label>
                  <span className="text-[10px] text-slate-400">
                    safe storage &bull; {formData.notes.length}/2000 chars
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={2000}
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Add confidential deal notes, procurement contacts, or relationship context..."
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-hyra-700 font-medium"
                />
              </div>
            </div>

            {/* ========================================================= */}
            {/* MANUAL BUTTONS: Save Lead, Save & Add Another, Cancel     */}
            {/* ========================================================= */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">

              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
                {/* Cancel Button */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                {/* Save & Add Another Button */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => executeSaveSequence(true)}
                  className="px-4 py-2.5 text-xs font-bold text-hyra-700 bg-hyra-50 hover:bg-hyra-100 border border-hyra-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  title="Validate and save, then clear form for next lead"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Save & Add Another</span>
                </button>

                {/* Save Lead Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-hyra-700 hover:bg-hyra-700 rounded-xl shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  title="Validate, match company, create lead, assign, and schedule task"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Validating & Saving...' : 'Save Lead'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
