import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useRecruitment } from '../../context/RecruitmentContext';
import { useAuth } from '../../context/AuthContext';
import { PAYROLL_TYPES } from '../../data/businessVerticals';

export const JobFormModal = ({ isOpen, onClose }) => {
  const { createJob, partners } = useRecruitment();
  const { currentUser } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    department: 'Software Engineering',
    location: 'Remote (US & Global)',
    employmentType: 'Full-time',
    payrollType: 'Xunaris Payroll',
    experienceLevel: '5+ years',
    salaryRange: '$120,000 - $150,000 USD',
    description: '',
    requirements: '',
    partnerId: partners[0]?.id || 'ptn_custom'
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.title.trim()) errs.title = 'Job Title is required';
    if (!formData.description.trim()) errs.description = 'Job Description is required';
    if (!formData.requirements.trim()) errs.requirements = 'Requirements are required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const targetPartner = partners.find(p => p.id === formData.partnerId);

    createJob({
      ...formData,
      partnerName: targetPartner?.companyName || 'Nexus IT Staffing Global',
      recruiterEmail: currentUser.email
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Job Opening"
      subtitle="Job posts will be submitted for Admin approval before appearing on candidate portal"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
        {/* Title & Department */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Senior Full Stack React / Node Engineer"
              className={`w-full px-3 py-2 rounded-lg border ${
                errors.title ? 'border-rose-500 bg-rose-50' : 'border-slate-300'
              } focus:ring-2 focus:ring-teal-500`}
            />
            {errors.title && <span className="text-[11px] text-rose-600">{errors.title}</span>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="e.g. Cloud & Infrastructure"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Location & Employment Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. Remote / Hybrid New York"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Type</label>
            <select
              name="employmentType"
              value={formData.employmentType}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500"
            >
              <option value="Full-time">Full-time</option>
              <option value="Contract">Contract</option>
              <option value="Contract-to-Hire">Contract-to-Hire</option>
              <option value="Part-time">Part-time</option>
            </select>
          </div>
        </div>

        {/* CRITICAL: Payroll Workflow Distinction */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <label className="block text-xs font-bold text-slate-900">
            Payroll Workflow Model *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label
              className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                formData.payrollType === 'Xunaris Payroll'
                  ? 'bg-blue-50/80 border-blue-500 text-blue-900 font-bold'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <input
                type="radio"
                name="payrollType"
                value="Xunaris Payroll"
                checked={formData.payrollType === 'Xunaris Payroll'}
                onChange={handleChange}
                className="text-blue-600"
              />
              <div>
                <span className="text-xs">Xunaris Payroll</span>
                <p className="text-[10px] text-slate-500 font-normal">
                  Candidate managed & paid via Xunaris corporate payroll
                </p>
              </div>
            </label>

            <label
              className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                formData.payrollType === 'Partner Payroll'
                  ? 'bg-teal-50/80 border-teal-500 text-teal-900 font-bold'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <input
                type="radio"
                name="payrollType"
                value="Partner Payroll"
                checked={formData.payrollType === 'Partner Payroll'}
                onChange={handleChange}
                className="text-teal-600"
              />
              <div>
                <span className="text-xs">Partner Payroll</span>
                <p className="text-[10px] text-slate-500 font-normal">
                  Staffing vendor handles candidate payroll & disbursement
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Experience & Salary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Experience Level</label>
            <input
              type="text"
              name="experienceLevel"
              value={formData.experienceLevel}
              onChange={handleChange}
              placeholder="e.g. 5+ years"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Salary / Hourly Range</label>
            <input
              type="text"
              name="salaryRange"
              value={formData.salaryRange}
              onChange={handleChange}
              placeholder="e.g. $130,000 - $160,000 USD or $85/hr"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Role Description *</label>
          <textarea
            rows={3}
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Key responsibilities and day-to-day impact..."
            className={`w-full px-3 py-2 rounded-lg border ${
              errors.description ? 'border-rose-500 bg-rose-50' : 'border-slate-300'
            } focus:ring-2 focus:ring-teal-500`}
          />
        </div>

        {/* Requirements */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Requirements & Tech Stack *
          </label>
          <textarea
            rows={2}
            name="requirements"
            value={formData.requirements}
            onChange={handleChange}
            placeholder="React 18, TypeScript, Node.js, Kubernetes, AWS, etc."
            className={`w-full px-3 py-2 rounded-lg border ${
              errors.requirements ? 'border-rose-500 bg-rose-50' : 'border-slate-300'
            } focus:ring-2 focus:ring-teal-500`}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm"
          >
            Submit for Admin Approval
          </button>
        </div>
      </form>
    </Modal>
  );
};
