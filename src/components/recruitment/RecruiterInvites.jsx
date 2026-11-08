import React, { useState } from 'react';
import { useRecruitment } from '../../context/RecruitmentContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import {
  UserPlus,
  Mail,
  Building,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  ShieldCheck,
  Clock
} from 'lucide-react';

export const RecruiterInvites = () => {
  const { recruiters, inviteRecruiter, removeRecruiter, partners } = useRecruitment();
  const { currentUser, permissions } = useAuth();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [partnerId, setPartnerId] = useState(partners[0]?.id || '');
  const [department, setDepartment] = useState('Engineering Staffing');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const approvedPartners = partners.filter(p => p.status === 'Approved');

  const handleInvite = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const targetPartner = partners.find(p => p.id === partnerId);

    try {
      inviteRecruiter({
        name: name.trim(),
        email: email.trim(),
        partnerId,
        partnerName: targetPartner?.companyName || 'Staffing Partner',
        department,
        invitedBy: currentUser.email
      });

      setSuccessMsg(`Invitation sent to ${email.trim()}! Recruiter added to team.`);
      setName('');
      setEmail('');
      setTimeout(() => {
        setSuccessMsg('');
        setIsInviteModalOpen(false);
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleRemove = (recruiter) => {
    if (window.confirm(`Remove recruiter access for ${recruiter.name} (${recruiter.email})?`)) {
      removeRecruiter(recruiter.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Recruiter Team & Access Control</h2>
          <p className="text-xs text-slate-500">
            Invite talent sourcers and recruiters with duplicate email prevention
          </p>
        </div>

        {permissions.canInviteRecruiters && (
          <button
            onClick={() => {
              setErrorMsg('');
              setSuccessMsg('');
              setIsInviteModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all shadow-sm shadow-teal-500/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Recruiter</span>
          </button>
        )}
      </div>

      {/* Recruiter List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold tracking-wider uppercase text-[11px]">
              <tr>
                <th className="px-4 py-3">Recruiter Name</th>
                <th className="px-4 py-3">Work Email</th>
                <th className="px-4 py-3">Partner Agency</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recruiters.map((recruiter) => (
                <tr key={recruiter.id} className="hover:bg-teal-50/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
                        {recruiter.name.charAt(0)}
                      </div>
                      <span>{recruiter.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                    {recruiter.email}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {recruiter.partnerName}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {recruiter.department}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={recruiter.status === 'Active' ? 'approved' : 'pending'}>
                      {recruiter.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {permissions.isAdmin && (
                      <button
                        onClick={() => handleRemove(recruiter)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Revoke Recruiter Invitation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Recruiter"
        subtitle="Invited recruiters receive access to post jobs and review applicant pools"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleInvite} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. David Kim"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address * <span className="text-slate-400 font-normal">(validated against duplicates)</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="recruiter@partner.example.com"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Partner Organization</label>
            <select
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500"
            >
              {approvedPartners.map(p => (
                <option key={p.id} value={p.id}>{p.companyName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Hiring Vertical</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Engineering Staffing"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(false)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm"
            >
              Send Invitation
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
