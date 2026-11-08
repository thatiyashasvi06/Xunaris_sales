import React, { useState } from 'react';
import { useRecruitment } from '../../context/RecruitmentContext';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import {
  Building2,
  CheckCircle2,
  XCircle,
  Plus,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  AlertCircle
} from 'lucide-react';

export const PartnerManagement = () => {
  const { partners, registerPartner, approvePartner, rejectPartner } = useRecruitment();
  const { permissions } = useAuth();

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [rejectingPartnerId, setRejectingPartnerId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    companyName: '',
    website: '',
    businessType: 'Technology Staffing & Consulting',
    contactPerson: '',
    email: '',
    phone: '',
    address: ''
  });

  const handleRegister = (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      registerPartner(formData);
      setSuccessMsg(`Registration submitted for ${formData.companyName}. Awaiting Admin approval.`);
      setFormData({
        companyName: '',
        website: '',
        businessType: 'Technology Staffing & Consulting',
        contactPerson: '',
        email: '',
        phone: '',
        address: ''
      });
      setTimeout(() => {
        setSuccessMsg('');
        setIsRegisterModalOpen(false);
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleApprove = (partner) => {
    approvePartner(partner.id, 'Verified credentials. Approved for HYRA Connect.');
  };

  const handleConfirmReject = () => {
    if (!rejectingPartnerId) return;
    rejectPartner(rejectingPartnerId, rejectionReason || 'Application rejected.');
    setRejectingPartnerId(null);
    setRejectionReason('');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Partner Companies & Onboarding</h2>
          <p className="text-xs text-slate-500">
            Manage staffing agencies, vendor partners, and company compliance onboarding
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setSuccessMsg('');
            setIsRegisterModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all shadow-sm shadow-teal-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Partner</span>
        </button>
      </div>

      {/* Partners List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {partners.map((partner) => (
          <div
            key={partner.id}
            className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{partner.companyName}</h3>
                  <span className="text-xs text-slate-500 font-medium">{partner.businessType}</span>
                </div>
                <Badge variant={partner.status}>{partner.status}</Badge>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-1 border-t border-slate-100">
                <p className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-800">Contact:</span>
                  <span>{partner.contactPerson}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <a href={`mailto:${partner.email}`} className="text-teal-600 hover:underline truncate">
                    {partner.email}
                  </a>
                </p>
                {partner.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{partner.phone}</span>
                  </p>
                )}
                {partner.website && (
                  <p className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <a href={partner.website} target="_blank" rel="noreferrer" className="text-teal-600 hover:underline truncate">
                      {partner.website}
                    </a>
                  </p>
                )}
                {partner.address && (
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{partner.address}</span>
                  </p>
                )}
              </div>

              {partner.adminNotes && (
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] text-slate-600">
                  <strong className="text-slate-800 block mb-0.5">Admin Review Notes:</strong>
                  {partner.adminNotes}
                </div>
              )}
            </div>

            {/* Approval / Rejection Controls for Admin */}
            {permissions.canApprovePartners && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                {partner.status === 'Pending' ? (
                  <>
                    <button
                      onClick={() => setRejectingPartnerId(partner.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(partner)}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve
                    </button>
                  </>
                ) : (
                  <span className="text-[11px] text-slate-400 font-medium">
                    {partner.status === 'Approved' ? `Approved on ${partner.approvedAt || 'record'}` : 'Application closed'}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Registration Modal */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Register Partner Staffing Agency"
        subtitle="Onboard a staffing or talent partner for HYRA Connect"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleRegister} className="space-y-4 text-xs sm:text-sm">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name *</label>
            <input
              type="text"
              required
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="e.g. Apex Global Talent Ltd"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Business Type</label>
              <input
                type="text"
                value={formData.businessType}
                onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                placeholder="Staffing & Consulting"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://agency.example.com"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person *</label>
              <input
                type="text"
                required
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                placeholder="e.g. Marcus Vance"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="partner@agency.example.com"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 019-2834"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Office Location</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="City, Country"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm"
            >
              Submit Onboarding Application
            </button>
          </div>
        </form>
      </Modal>

      {/* Rejection Modal */}
      <Modal
        isOpen={Boolean(rejectingPartnerId)}
        onClose={() => setRejectingPartnerId(null)}
        title="Reject Partner Application"
        subtitle="Provide reason for rejecting this partner registration"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <textarea
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Explain reason for rejection (e.g. Incomplete business verification, outside geographic scope)..."
            className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500"
          />

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setRejectingPartnerId(null)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmReject}
              className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
