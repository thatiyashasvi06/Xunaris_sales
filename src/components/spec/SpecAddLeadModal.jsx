import React, { useState, useEffect } from 'react';
import { useCRM } from '../../context/CRMContext';
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
  const { createLead, currentUser, users, campaigns, companies } = useCRM();

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
    ownerEmail: currentUser?.email || 'sales@xunaris.com',
    ownerName: currentUser?.name || 'Sales User',
    nextFollowup: '',
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [inlineErrors, setInlineErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successLink, setSuccessLink] = useState(null); // { id, name }
  const [notificationMsg, setNotificationMsg] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...initialFormState,
        ownerEmail: currentUser?.email || 'sales@xunaris.com',
        ownerName: currentUser?.name || 'Sales User'
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
            ownerEmail: currentUser?.email || 'sales@xunaris.com',
            ownerName: currentUser?.name || 'Sales User'
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
        className="fixed inset-0 bg-[#0a1120]/70 backdrop-blur-xs transition-opacity"
        onClick={() => !isSubmitting && onClose()}
      />

      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
        <div className="relative w-full max-w-4xl bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#0a1120] tracking-tight">
                  Add Lead &bull; Manual Entry
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
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
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-600'
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
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                      {currentVerticalCode} Active Catalog
                    </span>
                  </div>
                  <select
                    value={formData.service}
                    onChange={(e) => handleChange('service', e.target.value)}
                    className={`w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border bg-white font-medium transition-all ${
                      inlineErrors.service
                        ? 'border-rose-400 ring-2 ring-rose-500/10'
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-600'
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
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-600'
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
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 font-medium"
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
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-600"
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
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 font-medium"
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
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-600"
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
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-600'
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
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 font-medium"
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
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-600'
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
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-600'
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
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-600"
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
                          : 'border-slate-300 focus:ring-2 focus:ring-blue-600'
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
                          : 'border-slate-300 focus:ring-2 focus:ring-blue-600'
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
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-600"
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
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 font-medium"
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
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-600"
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
                    <span className="text-[10px] text-slate-400 font-mono">Admin fallback</span>
                  </div>
                  <select
                    value={formData.ownerEmail}
                    onChange={(e) => {
                      const sel = users.find(u => u.email === e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        ownerEmail: e.target.value,
                        ownerName: sel ? sel.name : 'Sales User'
                      }));
                    }}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-600"
                  >
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
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 font-medium"
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
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 font-medium"
                />
              </div>
            </div>

            {/* ========================================================= */}
            {/* MANUAL BUTTONS: Save Lead, Save & Add Another, Cancel     */}
            {/* ========================================================= */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Backend pipeline: validate &rarr; match &rarr; create &rarr; assign &rarr; task &rarr; notify</span>
              </div>

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
                  className="px-4 py-2.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  title="Validate and save, then clear form for next lead"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Save & Add Another</span>
                </button>

                {/* Save Lead Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#0063f2] hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
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
