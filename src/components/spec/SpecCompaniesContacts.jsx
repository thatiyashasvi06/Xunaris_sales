import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { SpecHeader } from './SpecHeader';
import { CheckCircle2, AlertCircle, Building2, UserPlus, Trash2 } from 'lucide-react';

export const SpecCompaniesContacts = () => {
  const { companies, contacts, addCompany, updateCompany, addContact, updateContact, users, currentUser } = useCRM();

  const [selectedCompId, setSelectedCompId] = useState(companies[0]?.id || null);
  const [selectedContactId, setSelectedContactId] = useState(contacts[0]?.id || null);
  const [recordsTab, setRecordsTab] = useState('contacts'); // 'contacts' | 'companies'

  // Form inputs
  const [companyName, setCompanyName] = useState(companies[0]?.name || 'Example Technologies');
  const [industry, setIndustry] = useState(companies[0]?.industry || 'IT Services');
  const [website, setWebsite] = useState(companies[0]?.website || 'example.com');
  const [cityCountry, setCityCountry] = useState(`${companies[0]?.city || 'Bengaluru'}, ${companies[0]?.country || 'India'}`);
  const [businessUnit, setBusinessUnit] = useState(companies[0]?.businessUnit || 'Both');
  const [accountOwner, setAccountOwner] = useState(companies[0]?.accountOwner || currentUser.name);

  const [contactName, setContactName] = useState(contacts[0]?.name || 'Priya Kumar');
  const [designation, setDesignation] = useState(contacts[0]?.role || 'HR Director');
  const [email, setEmail] = useState(contacts[0]?.email || 'priya@example.com');
  const [phone, setPhone] = useState(contacts[0]?.phone || '+91 90000 00000');
  const [relationship, setRelationship] = useState(contacts[0]?.relationship || 'Decision maker');

  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Handle select company from list
  const handleSelectCompany = (comp) => {
    setSelectedCompId(comp.id);
    setCompanyName(comp.name);
    setIndustry(comp.industry);
    setWebsite(comp.website);
    setCityCountry(`${comp.city || 'Bengaluru'}, ${comp.country || 'India'}`);
    setBusinessUnit(comp.businessUnit || 'Both');
    setAccountOwner(comp.accountOwner || currentUser.name);

    // Auto-select first contact of this company if available
    const compContacts = contacts.filter(c => c.companyName.toLowerCase() === comp.name.toLowerCase());
    if (compContacts.length > 0) {
      handleSelectContact(compContacts[0]);
    }
  };

  const handleSelectContact = (cont) => {
    setSelectedContactId(cont.id);
    setContactName(cont.name);
    setDesignation(cont.role || cont.designation);
    setEmail(cont.email);
    setPhone(cont.phone || '');
    setRelationship(cont.relationship || 'Decision maker');
    if (cont.companyName) {
      setCompanyName(cont.companyName);
    }
  };

  const handleClearCompanyForm = () => {
    setSelectedCompId(null);
    setCompanyName('');
    setIndustry('IT Services');
    setWebsite('');
    setCityCountry('Bengaluru, India');
    setBusinessUnit('Both');
    setAccountOwner(currentUser.name);
    setNotice('Company form cleared. Enter details to register a new company.');
    setTimeout(() => setNotice(''), 2500);
  };

  const handleClearContactForm = () => {
    setSelectedContactId(null);
    setContactName('');
    setDesignation('');
    setEmail('');
    setPhone('');
    setRelationship('Decision maker');
    setNotice('Contact form cleared. Enter details to add a new contact.');
    setTimeout(() => setNotice(''), 2500);
  };

  const handleSaveCompany = () => {
    setErrorMsg('');
    if (!companyName.trim()) {
      setErrorMsg('Company Name is required.');
      return;
    }
    const [city, country] = cityCountry.split(',').map(s => s?.trim() || '');

    if (selectedCompId) {
      updateCompany(selectedCompId, {
        name: companyName.trim(),
        industry,
        website,
        city: city || 'Bengaluru',
        country: country || 'India',
        businessUnit,
        accountOwner
      });
      setNotice(`Updated company "${companyName}"!`);
    } else {
      const created = addCompany({
        name: companyName.trim(),
        industry,
        website,
        city: city || 'Bengaluru',
        country: country || 'India',
        businessUnit,
        accountOwner
      });
      setSelectedCompId(created.id);
      setNotice(`Registered new company "${created.name}" (${created.id})!`);
    }
    setTimeout(() => setNotice(''), 3000);
  };

  const handleAddOrUpdateContact = () => {
    setErrorMsg('');
    if (!contactName.trim() || !email.trim()) {
      setErrorMsg('Contact Name and Email are required.');
      return;
    }
    if (!companyName.trim()) {
      setErrorMsg('Specify a Company Name to link this contact.');
      return;
    }

    if (selectedContactId) {
      updateContact(selectedContactId, {
        name: contactName.trim(),
        role: designation.trim(),
        designation: designation.trim(),
        email: email.trim(),
        phone: phone.trim(),
        relationship,
        companyName: companyName.trim()
      });
      setNotice(`Updated contact "${contactName}"!`);
    } else {
      const created = addContact({
        companyName: companyName.trim(),
        name: contactName.trim(),
        role: designation.trim(),
        designation: designation.trim(),
        email: email.trim(),
        phone: phone.trim(),
        relationship,
        status: 'Active'
      });
      setSelectedContactId(created.id);
      setNotice(`Added contact "${created.name}" linked to "${companyName}"!`);
    }
    setTimeout(() => setNotice(''), 3000);
  };

  // If a company is selected and has contacts, filter by it; otherwise show all contacts so the table is never empty
  const companyContacts = selectedCompId
    ? contacts.filter(c => c.companyName?.toLowerCase() === companyName.toLowerCase())
    : [];
  const displayedContacts = companyContacts.length > 0 ? companyContacts : contacts;

  return (
    <div className="space-y-6">
      <SpecHeader
        title="Companies & Contacts"
        subtitle="Shared company master with multiple contacts"
        actionButtons={[
          { label: selectedCompId ? 'Update Company' : 'Save Company', onClick: handleSaveCompany },
          { label: selectedContactId ? 'Update Contact' : 'Add Contact', onClick: handleAddOrUpdateContact },
          { label: '+ New Company', onClick: handleClearCompanyForm, variant: 'secondary' },
          { label: '+ New Contact', onClick: handleClearContactForm, variant: 'secondary' }
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
            <div className="flex items-center gap-2 text-xs">
              {selectedCompId && (
                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono text-[11px]">
                  Company: {selectedCompId}
                </span>
              )}
              {selectedContactId && (
                <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-mono text-[11px]">
                  Contact: {selectedContactId}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Row 1 */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                COMPANY NAME*
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Example Technologies"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                INDUSTRY
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="IT Services"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                WEBSITE
              </label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="example.com"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>

            {/* Row 2 */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                CITY / COUNTRY
              </label>
              <input
                type="text"
                value={cityCountry}
                onChange={(e) => setCityCountry(e.target.value)}
                placeholder="Bengaluru, India"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                BUSINESS UNIT
              </label>
              <select
                value={businessUnit}
                onChange={(e) => setBusinessUnit(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium cursor-pointer"
              >
                <option value="Both">Both (Xunaris + HYRA Connect)</option>
                <option value="Xunaris">Xunaris (XUN)</option>
                <option value="HYRA Connect">HYRA Connect (HYRA)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                ACCOUNT OWNER
              </label>
              <select
                value={accountOwner}
                onChange={(e) => setAccountOwner(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium cursor-pointer"
              >
                {users.map(u => (
                  <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>

            {/* Row 3 */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                CONTACT NAME*
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Priya Kumar"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                DESIGNATION
              </label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="HR Director"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                EMAIL*
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="priya@example.com"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>
          </div>
        </div>

        {/* RECORDS / ACTIVITY Table Section */}
        <div className="p-6 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xs font-extrabold tracking-wider text-[#0d2238] uppercase">
                RECORDS / ACTIVITY
              </h2>
              {/* Tab Selector */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setRecordsTab('contacts')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                    recordsTab === 'contacts'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Contacts ({contacts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRecordsTab('companies')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                    recordsTab === 'companies'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Companies ({companies.length})
                </button>
              </div>
            </div>

            <span className="text-xs text-slate-500 font-medium">
              {recordsTab === 'contacts'
                ? `${displayedContacts.length} contact${displayedContacts.length !== 1 ? 's' : ''} • Click row to load in form`
                : `${companies.length} compan${companies.length !== 1 ? 'ies' : 'y'} • Click row to load in form`}
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            {recordsTab === 'contacts' ? (
              <table className="min-w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-[#f0f4f9] text-[#0d2238] font-bold">
                  <tr>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Relationship</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {displayedContacts.map((contact) => (
                    <tr
                      key={contact.id}
                      onClick={() => handleSelectContact(contact)}
                      className={`cursor-pointer hover:bg-blue-50/50 transition-colors ${
                        selectedContactId === contact.id ? 'bg-blue-50/80 font-semibold' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        <div>{contact.name}</div>
                        <span className="text-[10px] text-slate-400 font-mono">{contact.id}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 font-medium">
                        {contact.companyName}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-medium">
                        {contact.role || contact.designation}
                      </td>
                      <td className="px-4 py-3.5 text-blue-600 font-medium">
                        {contact.email}
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 font-medium">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full font-semibold">
                          {contact.relationship}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="min-w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-[#f0f4f9] text-[#0d2238] font-bold">
                  <tr>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Industry</th>
                    <th className="px-4 py-3">Website</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Business Unit</th>
                    <th className="px-4 py-3">Owner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {companies.map((comp) => (
                    <tr
                      key={comp.id}
                      onClick={() => handleSelectCompany(comp)}
                      className={`cursor-pointer hover:bg-blue-50/50 transition-colors ${
                        selectedCompId === comp.id ? 'bg-blue-50/80 font-semibold' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        <div>{comp.name}</div>
                        <span className="text-[10px] text-slate-400 font-mono">{comp.id}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 font-medium">
                        {comp.industry || 'IT Services'}
                      </td>
                      <td className="px-4 py-3.5 text-blue-600 font-medium">
                        {comp.website || '-'}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-medium">
                        {comp.city ? `${comp.city}, ${comp.country || 'India'}` : comp.country || 'India'}
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 font-medium">
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-semibold text-[10px]">
                          {comp.businessUnit || 'Both'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 font-medium">
                        {comp.accountOwner || 'Sales User'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
