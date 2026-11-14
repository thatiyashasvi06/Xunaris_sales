import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { SpecHeader } from './SpecHeader';
import { SERVICE_CATALOG } from '../../data/crmSpecData';
import { CheckCircle2, AlertCircle, Plus, Trash2 } from 'lucide-react';

export const SpecOpportunities = () => {
  const { opportunities, addOpportunity, updateOpportunity, updateOpportunityStage, companies, users, currentUser, setActiveNav } = useCRM();

  const [selectedOppId, setSelectedOppId] = useState(opportunities[0]?.id || null);

  const [opportunityName, setOpportunityName] = useState(opportunities[0]?.title || 'SAP Staffing - 3 Roles');
  const [company, setCompany] = useState(opportunities[0]?.companyName || 'Example Technologies');
  const [businessUnit, setBusinessUnit] = useState(opportunities[0]?.businessUnit || 'HYRA Connect');
  const [service, setService] = useState(opportunities[0]?.service || 'Contract staffing');
  const [stage, setStage] = useState(opportunities[0]?.stage || 'Proposal');
  const [estimatedValue, setEstimatedValue] = useState(opportunities[0]?.estimatedValue || 'INR 12,00,000');
  const [expectedClose, setExpectedClose] = useState(opportunities[0]?.expectedClose || '30 Oct 2026');
  const [owner, setOwner] = useState(opportunities[0]?.ownerName || currentUser.name);
  const [nextActionDate, setNextActionDate] = useState(opportunities[0]?.nextActionDate || '16 Oct 2026');

  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Dependent service catalog
  const currentVerticalCode = businessUnit === 'Xunaris' ? 'XUN' : 'HYRA';
  const availableServices = SERVICE_CATALOG[currentVerticalCode] || [];

  const handleBusinessUnitChange = (unit) => {
    setBusinessUnit(unit);
    const code = unit === 'Xunaris' ? 'XUN' : 'HYRA';
    setService(SERVICE_CATALOG[code][0]);
  };

  const handleSelectRow = (opp) => {
    setSelectedOppId(opp.id);
    setOpportunityName(opp.title);
    setCompany(opp.companyName);
    setBusinessUnit(opp.businessUnit);
    setService(opp.service);
    setStage(opp.stage);
    setEstimatedValue(opp.estimatedValue);
    setExpectedClose(opp.expectedClose);
    setOwner(opp.ownerName || currentUser.name);
    setNextActionDate(opp.nextActionDate || '16 Oct 2026');
    setErrorMsg('');
  };

  const handleClearForm = () => {
    setSelectedOppId(null);
    setOpportunityName('');
    setCompany(companies[0]?.name || 'Example Technologies');
    setBusinessUnit('Xunaris');
    setService(SERVICE_CATALOG['XUN'][0]);
    setStage('Discovery');
    setEstimatedValue('INR 10,00,000');
    setExpectedClose('30 Nov 2026');
    setOwner(currentUser.name);
    setNextActionDate('20 Oct 2026');
    setNotice('Opportunity form cleared. Enter details to register a new deal.');
    setTimeout(() => setNotice(''), 2500);
  };

  const handleSaveOpportunity = () => {
    setErrorMsg('');
    if (!opportunityName.trim() || !company.trim()) {
      setErrorMsg('Opportunity Name and Company are required.');
      return;
    }

    if (selectedOppId) {
      updateOpportunity(selectedOppId, {
        title: opportunityName.trim(),
        opportunityName: opportunityName.trim(),
        companyName: company.trim(),
        businessUnit,
        service,
        stage,
        estimatedValue,
        expectedClose,
        ownerName: owner,
        nextActionDate
      });
      setNotice(`Updated opportunity ${selectedOppId}!`);
    } else {
      const newOpp = addOpportunity({
        title: opportunityName.trim(),
        opportunityName: opportunityName.trim(),
        companyName: company.trim(),
        businessUnit,
        service,
        stage,
        estimatedValue,
        expectedClose,
        ownerName: owner,
        nextActionDate
      });
      setSelectedOppId(newOpp.id);
      setNotice(`Created new opportunity ${newOpp.id}! Linked to ${company}.`);
    }
    setTimeout(() => setNotice(''), 3000);
  };

  const handleMarkWonLost = () => {
    if (!selectedOppId) {
      setErrorMsg('Select an opportunity from the records list below.');
      return;
    }

    const action = window.prompt('Type "WON" to mark deal as Won (creates client handoff), or "LOST" to close as Lost:');
    if (action && action.toUpperCase() === 'WON') {
      const handoffOwner = window.prompt('Enter client handoff owner:', 'Implementation Lead') || 'Implementation Lead';
      updateOpportunityStage(selectedOppId, 'Won', '', {
        handoffOwner,
        dueDate: '31 Oct 2026'
      });
      setStage('Won');
      setNotice(`Opportunity ${selectedOppId} marked WON! Assigned handoff to ${handoffOwner}.`);
    } else if (action && action.toUpperCase() === 'LOST') {
      const reason = window.prompt('Enter reason for loss (Price, Timing, No Response, Competition, Scope, Other):', 'Price') || 'Price';
      updateOpportunityStage(selectedOppId, 'Lost', reason);
      setStage('Lost');
      setNotice(`Opportunity ${selectedOppId} marked LOST. Reason: ${reason}.`);
    }
    setTimeout(() => setNotice(''), 4000);
  };

  return (
    <div className="space-y-6">
      <SpecHeader
        title="Opportunities"
        subtitle="Track staffing and service opportunities through closure"
        actionButtons={[
          { label: selectedOppId ? 'Update Opportunity' : 'Save Opportunity', onClick: handleSaveOpportunity },
          { label: 'Mark Won / Lost', onClick: handleMarkWonLost },
          { label: '+ New Deal', onClick: handleClearForm, variant: 'secondary' }
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
            {selectedOppId && (
              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono text-[11px]">
                Deal: {selectedOppId}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Row 1 */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                OPPORTUNITY*
              </label>
              <input
                type="text"
                required
                value={opportunityName}
                onChange={(e) => setOpportunityName(e.target.value)}
                placeholder="SAP Staffing - 3 Roles"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>

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

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                BUSINESS UNIT*
              </label>
              <select
                value={businessUnit}
                onChange={(e) => handleBusinessUnitChange(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium cursor-pointer"
              >
                <option value="HYRA Connect">HYRA Connect (HYRA)</option>
                <option value="Xunaris">Xunaris (XUN)</option>
              </select>
            </div>

            {/* Row 2 */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                SERVICE*
              </label>
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium cursor-pointer"
              >
                {availableServices.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                STAGE*
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium cursor-pointer"
              >
                <option value="Discovery">Discovery</option>
                <option value="Qualified">Qualified</option>
                <option value="Proposal">Proposal</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                ESTIMATED VALUE
              </label>
              <input
                type="text"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                placeholder="INR 12,00,000"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>

            {/* Row 3 */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                EXPECTED CLOSE
              </label>
              <input
                type="text"
                value={expectedClose}
                onChange={(e) => setExpectedClose(e.target.value)}
                placeholder="30 Oct 2026"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>

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

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                NEXT ACTION DATE*
              </label>
              <input
                type="text"
                value={nextActionDate}
                onChange={(e) => setNextActionDate(e.target.value)}
                placeholder="16 Oct 2026"
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
              {opportunities.length} active opportunities &bull; Click to load
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="min-w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-[#f0f4f9] text-[#0d2238] font-bold">
                <tr>
                  <th className="px-4 py-3">Opportunity</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Next action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {opportunities.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center">
                      <div className="text-sm font-extrabold text-[#0d2238]">No deals yet</div>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Deals come from qualified leads. Open a lead and press Convert to Opportunity, or add a deal here.</p>
                      <button type="button" onClick={() => setActiveNav('leads')} className="mt-3 px-4 py-2 rounded-xl bg-[#0063f2] text-white text-xs font-bold">Go to Leads</button>
                    </td>
                  </tr>
                )}
                {opportunities.map((opp) => (
                  <tr
                    key={opp.id}
                    onClick={() => handleSelectRow(opp)}
                    className={`cursor-pointer hover:bg-blue-50/50 transition-colors ${
                      selectedOppId === opp.id ? 'bg-blue-50/80 font-semibold' : ''
                    }`}
                  >
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      <div>{opp.title}</div>
                      <span className="text-[10px] text-blue-700 font-mono font-bold">{opp.id}</span>
                      <span className="text-[10px] text-slate-400"> &bull; {opp.companyName}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        opp.stage === 'Won'
                          ? 'bg-emerald-100 text-emerald-800'
                          : opp.stage === 'Lost'
                          ? 'bg-rose-100 text-rose-800'
                          : opp.stage === 'Proposal'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {opp.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-800">
                      {opp.estimatedValue}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 font-medium">
                      {opp.nextActionDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
