import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  BUSINESS_VERTICALS,
  LEAD_SOURCES,
  LEAD_STATUSES,
  LEAD_PRIORITIES
} from '../../data/businessVerticals';

export const LeadFormModal = ({ isOpen, onClose, onSave, leadToEdit = null }) => {
  const isEditing = Boolean(leadToEdit);

  const [formData, setFormData] = useState({
    businessVertical: BUSINESS_VERTICALS[0].name,
    service: BUSINESS_VERTICALS[0].services[0],
    companyName: '',
    website: '',
    industry: 'Technology',
    city: '',
    country: 'United States',
    contactName: '',
    jobTitle: '',
    workEmail: '',
    phone: '',
    leadSource: LEAD_SOURCES[0],
    campaign: '',
    requirement: '',
    priority: 'Medium',
    status: 'New',
    ownerEmail: 'sales@xunaris.com',
    nextFollowup: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    notes: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (leadToEdit) {
      setFormData(leadToEdit);
    } else {
      setFormData({
        businessVertical: BUSINESS_VERTICALS[0].name,
        service: BUSINESS_VERTICALS[0].services[0],
        companyName: '',
        website: '',
        industry: 'Technology',
        city: '',
        country: 'United States',
        contactName: '',
        jobTitle: '',
        workEmail: '',
        phone: '',
        leadSource: LEAD_SOURCES[0],
        campaign: '',
        requirement: '',
        priority: 'Medium',
        status: 'New',
        ownerEmail: 'sales@xunaris.com',
        nextFollowup: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        notes: ''
      });
    }
    setErrors({});
  }, [leadToEdit, isOpen]);

  // Update services options when vertical changes
  const activeVerticalObj = BUSINESS_VERTICALS.find(v => v.name === formData.businessVertical);
  const availableServices = activeVerticalObj ? activeVerticalObj.services : [];

  const handleVerticalChange = (e) => {
    const newVertical = e.target.value;
    const vObj = BUSINESS_VERTICALS.find(v => v.name === newVertical);
    setFormData(prev => ({
      ...prev,
      businessVertical: newVertical,
      service: vObj && vObj.services.length > 0 ? vObj.services[0] : ''
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.companyName.trim()) errs.companyName = 'Company Name is required';
    if (!formData.contactName.trim()) errs.contactName = 'Contact Name is required';
    if (!formData.workEmail.trim()) {
      errs.workEmail = 'Work Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.workEmail)) {
      errs.workEmail = 'Valid email is required';
    }
    if (!formData.requirement.trim()) errs.requirement = 'Requirement details are required';
    if (!formData.city.trim()) errs.city = 'City is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onSave(formData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Sales Lead' : 'Create New Xunaris Sales Lead'}
      subtitle="Complete all required lead attributes for sales pipeline tracking"
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Section 1: Business Classification */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Business Vertical *
            </label>
            <select
              name="businessVertical"
              value={formData.businessVertical}
              onChange={handleVerticalChange}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {BUSINESS_VERTICALS.map(v => (
                <option key={v.id} value={v.name}>{v.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Service Offering *
            </label>
            <select
              name="service"
              value={formData.service}
              onChange={handleChange}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {availableServices.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 2: Company Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              placeholder="e.g. Apex FinTech Solutions"
              className={`w-full text-xs sm:text-sm px-3 py-2 rounded-lg border ${
                errors.companyName ? 'border-rose-500 bg-rose-50' : 'border-slate-300'
              } focus:ring-2 focus:ring-blue-500`}
            />
            {errors.companyName && (
              <span className="text-[11px] text-rose-600">{errors.companyName}</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Website
            </label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://company.example.com"
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Section 3: Industry, City, Country */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Industry
            </label>
            <input
              type="text"
              name="industry"
              value={formData.industry}
              onChange={handleChange}
              placeholder="e.g. Financial Services"
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              City *
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="e.g. New York"
              className={`w-full text-xs sm:text-sm px-3 py-2 rounded-lg border ${
                errors.city ? 'border-rose-500 bg-rose-50' : 'border-slate-300'
              } focus:ring-2 focus:ring-blue-500`}
            />
            {errors.city && (
              <span className="text-[11px] text-rose-600">{errors.city}</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Country
            </label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder="e.g. United States"
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Section 4: Contact Details */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contact Name *
            </label>
            <input
              type="text"
              name="contactName"
              value={formData.contactName}
              onChange={handleChange}
              placeholder="e.g. Robert Sterling"
              className={`w-full text-xs sm:text-sm px-3 py-2 rounded-lg border ${
                errors.contactName ? 'border-rose-500 bg-rose-50' : 'border-slate-300'
              } focus:ring-2 focus:ring-blue-500`}
            />
            {errors.contactName && (
              <span className="text-[11px] text-rose-600">{errors.contactName}</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Job Title
            </label>
            <input
              type="text"
              name="jobTitle"
              value={formData.jobTitle}
              onChange={handleChange}
              placeholder="VP of Engineering"
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Work Email *
            </label>
            <input
              type="email"
              name="workEmail"
              value={formData.workEmail}
              onChange={handleChange}
              placeholder="r.sterling@example.com"
              className={`w-full text-xs sm:text-sm px-3 py-2 rounded-lg border ${
                errors.workEmail ? 'border-rose-500 bg-rose-50' : 'border-slate-300'
              } focus:ring-2 focus:ring-blue-500`}
            />
            {errors.workEmail && (
              <span className="text-[11px] text-rose-600">{errors.workEmail}</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 (555) 012-3456"
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Section 5: Lead Source, Campaign, Priority, Status */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lead Source
            </label>
            <select
              name="leadSource"
              value={formData.leadSource}
              onChange={handleChange}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
            >
              {LEAD_SOURCES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Campaign
            </label>
            <input
              type="text"
              name="campaign"
              value={formData.campaign}
              onChange={handleChange}
              placeholder="Q4 Modernization"
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Priority
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
            >
              {LEAD_PRIORITIES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lead Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
            >
              {LEAD_STATUSES.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 6: Requirement */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Requirement & Scope Details *
          </label>
          <textarea
            name="requirement"
            rows={2}
            value={formData.requirement}
            onChange={handleChange}
            placeholder="Describe client's architectural requirements, budget constraints, SLA, and timeline..."
            className={`w-full text-xs sm:text-sm px-3 py-2 rounded-lg border ${
              errors.requirement ? 'border-rose-500 bg-rose-50' : 'border-slate-300'
            } focus:ring-2 focus:ring-blue-500`}
          />
          {errors.requirement && (
            <span className="text-[11px] text-rose-600">{errors.requirement}</span>
          )}
        </div>

        {/* Section 7: Owner, Next Follow-up & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Owner Email
            </label>
            <input
              type="email"
              name="ownerEmail"
              value={formData.ownerEmail}
              onChange={handleChange}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Next Follow-up Date
            </label>
            <input
              type="date"
              name="nextFollowup"
              value={formData.nextFollowup}
              onChange={handleChange}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Internal Notes
            </label>
            <input
              type="text"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="e.g. Needs SOC2 compliance review"
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            {isEditing ? 'Save Changes' : 'Create Lead'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
