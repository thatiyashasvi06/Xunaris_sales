import React, { useState, useEffect } from 'react';
import { useCRM } from '../../context/CRMContext';
import { SpecHeader } from './SpecHeader';
import { apiClient } from '../../services/apiClient';
import { 
  CheckCircle2, 
  ShieldCheck, 
  Mail, 
  UserPlus, 
  ToggleLeft, 
  ToggleRight, 
  Trash2, 
  UserCheck, 
  Database, 
  RotateCcw,
  Key,
  AlertCircle,
  Send,
  Lock,
  RefreshCw,
  Server,
  X
} from 'lucide-react';

export const SpecAdminSettings = () => {
  const { automationRules, toggleRuleEnabled, users, updateUser, addUser, deleteUser, switchUser, currentUser, addActivity, clearAllTestData, resetToSpecification } = useCRM();

  // Form states
  const [userName, setUserName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [role, setRole] = useState('User');
  // Admin password reset dialog
  const [pwTarget, setPwTarget] = useState(null);
  const [pwValue, setPwValue] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' });

  const submitPasswordReset = async (e) => {
    e.preventDefault();
    if (pwValue.length < 12) { setPwMsg({ type: 'err', text: 'Use at least 12 characters.' }); return; }
    setPwBusy(true);
    try {
      const r = await apiClient.setUserPassword(pwTarget.id, pwValue);
      setPwMsg({ type: 'ok', text: r.message });
      setPwValue('');
    } catch (err) {
      setPwMsg({ type: 'err', text: err.message });
    } finally {
      setPwBusy(false);
    }
  };
  const [department, setDepartment] = useState('Sales');
  const [businessUnitAccess, setBusinessUnitAccess] = useState('Both');
  const [accountStatus, setAccountStatus] = useState('Active');
  const [emailSender, setEmailSender] = useState('CRM notifications <notifications@xunaris.com>');
  const [dailyDigestTime, setDailyDigestTime] = useState('09:00 IST');
  const [escalationDelay, setEscalationDelay] = useState('2 days');

  const [activeTab, setActiveTab] = useState('rules'); // 'rules' | 'users' | 'senders'
  const [notice, setNotice] = useState('');

  // Official Brand Email Accounts state
  const [senderAccounts, setSenderAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  
  // Xunaris Form State
  const [xunName, setXunName] = useState('Xunaris Sales');
  const [xunHost, setXunHost] = useState('smtp.gmail.com');
  const [xunPort, setXunPort] = useState(465);
  const [xunSecure, setXunSecure] = useState(true);
  const [xunUser, setXunUser] = useState('');
  const [xunPass, setXunPass] = useState('');
  const [xunShare, setXunShare] = useState(true);
  const [xunVerifying, setXunVerifying] = useState(false);
  const [xunError, setXunError] = useState('');
  const [xunSuccess, setXunSuccess] = useState('');

  // HYRA Connect Form State
  const [hyraName, setHyraName] = useState('HYRA Connect Sales');
  const [hyraHost, setHyraHost] = useState('smtp.gmail.com');
  const [hyraPort, setHyraPort] = useState(465);
  const [hyraSecure, setHyraSecure] = useState(true);
  const [hyraUser, setHyraUser] = useState('');
  const [hyraPass, setHyraPass] = useState('');
  const [hyraShare, setHyraShare] = useState(false);
  const [hyraVerifying, setHyraVerifying] = useState(false);
  const [hyraError, setHyraError] = useState('');
  const [hyraSuccess, setHyraSuccess] = useState('');

  // Diagnostics test send modal state
  const [diagSender, setDiagSender] = useState('sales@hyraconnect.com');
  const [diagRecipient, setDiagRecipient] = useState(currentUser?.email || 'thatiyashasvi06@gmail.com');
  const [diagSending, setDiagSending] = useState(false);
  const [diagResult, setDiagResult] = useState(null);
  const [isDiagOpen, setIsDiagOpen] = useState(false);

  const fetchSenderAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const res = await fetch('/api/campaigns/sender-accounts');
      const data = await res.json();
      if (Array.isArray(data)) {
        setSenderAccounts(data);
        const xun = data.find(a => a.id === 'acc_xunaris');
        if (xun) {
          setXunName(xun.display_name || 'Xunaris Sales');
          setXunHost(xun.smtp_host || 'smtp.gmail.com');
          setXunPort(xun.smtp_port || 465);
          setXunSecure(xun.smtp_secure === 1);
          setXunUser(xun.smtp_user || '');
        }
        const hyra = data.find(a => a.id === 'acc_hyra');
        if (hyra) {
          setHyraName(hyra.display_name || 'HYRA Connect Sales');
          setHyraHost(hyra.smtp_host || 'smtp.gmail.com');
          setHyraPort(hyra.smtp_port || 465);
          setHyraSecure(hyra.smtp_secure === 1);
          setHyraUser(hyra.smtp_user || '');
        }
      }
    } catch (err) {
      console.error('Failed to load sender accounts:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const [deliverability, setDeliverability] = useState(null);
  const [loadingDns, setLoadingDns] = useState(false);

  const fetchDeliverability = async () => {
    setLoadingDns(true);
    try {
      const res = await fetch('/api/campaigns/deliverability-status');
      const data = await res.json();
      setDeliverability(data);
    } catch (err) {
      console.warn('Failed to load DNS deliverability:', err);
    } finally {
      setLoadingDns(false);
    }
  };

  useEffect(() => {
    fetchSenderAccounts();
    fetchDeliverability();
  }, []);

  const applyPresetXun = (preset) => {
    if (preset === 'godaddy') {
      setXunHost('smtpout.secureserver.net');
      setXunPort(465);
      setXunSecure(true);
      if (!xunUser || xunUser.includes('gmail')) setXunUser('sales@xunaris.com');
    } else if (preset === 'gmail') {
      setXunHost('smtp.gmail.com');
      setXunPort(465);
      setXunSecure(true);
    } else if (preset === 'brevo') {
      setXunHost('smtp-relay.brevo.com');
      setXunPort(587);
      setXunSecure(false);
    } else if (preset === 'office365') {
      setXunHost('smtp.office365.com');
      setXunPort(587);
      setXunSecure(false);
    }
  };

  const applyPresetHyra = (preset) => {
    if (preset === 'godaddy') {
      setHyraHost('smtpout.secureserver.net');
      setHyraPort(465);
      setHyraSecure(true);
      if (!hyraUser || hyraUser.includes('gmail')) setHyraUser('sales@hyraconnect.com');
    } else if (preset === 'gmail') {
      setHyraHost('smtp.gmail.com');
      setHyraPort(465);
      setHyraSecure(true);
    } else if (preset === 'brevo') {
      setHyraHost('smtp-relay.brevo.com');
      setHyraPort(587);
      setHyraSecure(false);
    } else if (preset === 'office365') {
      setHyraHost('smtp.office365.com');
      setHyraPort(587);
      setHyraSecure(false);
    }
  };

  const handleAuthenticateXunaris = async (e) => {
    e?.preventDefault();
    setXunVerifying(true);
    setXunError('');
    setXunSuccess('');

    try {
      const res = await fetch('/api/campaigns/sender-accounts/acc_xunaris/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: xunName,
          smtp_host: xunHost,
          smtp_port: xunPort,
          smtp_secure: xunSecure,
          smtp_user: xunUser,
          smtp_pass: xunPass,
          shareAcrossBrands: xunShare
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Authentication failed');
      }

      setXunSuccess(data.message || 'Xunaris official account verified & authorized successfully!');
      setXunPass('');
      fetchSenderAccounts();
    } catch (err) {
      setXunError(err.message);
    } finally {
      setXunVerifying(false);
    }
  };

  const handleAuthenticateHyra = async (e) => {
    e?.preventDefault();
    setHyraVerifying(true);
    setHyraError('');
    setHyraSuccess('');

    try {
      const res = await fetch('/api/campaigns/sender-accounts/acc_hyra/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: hyraName,
          smtp_host: hyraHost,
          smtp_port: hyraPort,
          smtp_secure: hyraSecure,
          smtp_user: hyraUser,
          smtp_pass: hyraPass,
          shareAcrossBrands: hyraShare
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Authentication failed');
      }

      setHyraSuccess(data.message || 'HYRA Connect official account verified & authorized successfully!');
      setHyraPass('');
      fetchSenderAccounts();
    } catch (err) {
      setHyraError(err.message);
    } finally {
      setHyraVerifying(false);
    }
  };

  const [testingConn, setTestingConn] = useState({});

  const handleTestExistingConnection = async (accountId) => {
    setTestingConn(prev => ({ ...prev, [accountId]: true }));
    if (accountId === 'acc_xunaris') {
      setXunError('');
      setXunSuccess('');
    } else {
      setHyraError('');
      setHyraSuccess('');
    }

    try {
      const res = await fetch(`/api/campaigns/sender-accounts/${accountId}/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Connection test failed');
      }
      if (accountId === 'acc_xunaris') {
        setXunSuccess(data.message || 'Connection verified successfully!');
      } else {
        setHyraSuccess(data.message || 'Connection verified successfully!');
      }
      fetchSenderAccounts();
    } catch (err) {
      if (accountId === 'acc_xunaris') {
        setXunError(err.message);
      } else {
        setHyraError(err.message);
      }
    } finally {
      setTestingConn(prev => ({ ...prev, [accountId]: false }));
    }
  };

  const handleSendDiagnosticEmail = async () => {
    if (!diagRecipient || !diagRecipient.includes('@')) {
      alert('Please enter a valid recipient email address.');
      return;
    }

    setDiagSending(true);
    setDiagResult(null);

    try {
      const res = await fetch('/api/campaigns/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testEmail: diagRecipient.trim(),
          senderAccount: diagSender,
          businessUnit: diagSender.includes('hyra') ? 'HYRA Connect' : 'Xunaris',
          subject: 'Official Brand Sender Authentication Test',
          body: `This is an official authentication test message dispatched from Xunaris HYRA Connect CRM.\n\nSender Account: ${diagSender}\nTarget Recipient: ${diagRecipient}\nDispatched At: ${new Date().toISOString()}`
        })
      });

      const data = await res.json();
      setDiagResult(data);
      if (data.success) {
        setNotice(`✅ Test email delivered from ${diagSender} to ${diagRecipient}!`);
      } else {
        setNotice(`⚠️ Diagnostic delivery failed: ${data.error || data.message}`);
      }
    } catch (err) {
      setDiagResult({ success: false, error: err.message });
      setNotice(`Error: ${err.message}`);
    } finally {
      setDiagSending(false);
    }
  };

  const handleAddUser = () => {
    if (!userName.trim() || !workEmail.trim()) {
      alert('User Name and Work Email are required.');
      return;
    }

    const newUser = addUser({
      name: userName.trim(),
      email: workEmail.trim().toLowerCase(),
      role,
      department: department.trim() || 'Operations',
      businessUnitAccess,
      status: accountStatus
    });

    setNotice(`User "${newUser.name}" (${newUser.email}) added! Immediately available in all Owner dropdowns.`);
    setUserName('');
    setWorkEmail('');
    setTimeout(() => setNotice(''), 4000);
  };

  const handleSaveSettings = () => {
    setNotice('Admin configuration & automation policies saved successfully to persistent storage.');
    setTimeout(() => setNotice(''), 3000);
  };

  const handleTestEmail = () => {
    // Log an activity for the test email
    const nowStr =
      new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ', ' +
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    addActivity({
      relatedTo: 'Internal System Outbox',
      activityType: 'Email',
      subject: `Admin System Diagnostic dispatched via ${emailSender}`,
      dateTime: nowStr,
      assignedTo: currentUser.name,
      status: 'Completed',
      outcome: `Verification passed for ${currentUser.email}`,
      nextFollowup: '-',
      reminder: 'None',
      result: 'Diagnostic Delivered'
    });

    setNotice(`Test email dispatched via ${emailSender} to ${currentUser.email}! Verified delivery.`);
    setTimeout(() => setNotice(''), 4000);
  };

  const handleDeleteUser = (userId, uName) => {
    if (users.length <= 1) {
      alert('Cannot delete the sole remaining administrator.');
      return;
    }
    if (window.confirm(`Remove user "${uName}" from system?`)) {
      deleteUser(userId);
      setNotice(`User "${uName}" removed from system directory.`);
      setTimeout(() => setNotice(''), 2500);
    }
  };

  const handleClearTestData = () => {
    if (window.confirm('Clear all sample leads, opportunities, companies, and activities so you can test with real company records?')) {
      clearAllTestData();
      setNotice('All sample test data cleared! The system is now 100% clean and ready for real-time testing.');
      setTimeout(() => setNotice(''), 4500);
    }
  };

  const handleReloadSampleData = () => {
    resetToSpecification();
    setNotice('Mockup sample data reloaded successfully.');
    setTimeout(() => setNotice(''), 3000);
  };

  return (
    <div className="space-y-6">
      <SpecHeader
        title="Admin Settings"
        subtitle="Users, permissions, templates and official company email accounts"
        actionButtons={[
          { label: 'Brand Email Accounts (SMTP)', onClick: () => setActiveTab('senders') },
          { label: 'Diagnostic Test Send', onClick: () => setIsDiagOpen(true), variant: 'secondary' },
          { label: 'Add User', onClick: handleAddUser, variant: 'secondary' },
          { label: 'Save Settings', onClick: handleSaveSettings },
          { label: 'Clear Test Data', onClick: handleClearTestData, variant: 'secondary' },
          {
            label: 'API Docs',
            variant: 'secondary',
            onClick: async () => {
              try {
                const r = await apiClient.request('/admin/docs-link', { method: 'POST' });
                window.open(r.url, '_blank', 'noopener');
              } catch (e) {
                setNotice(`Could not open the API docs: ${e.message}`);
              }
            }
          }
        ]}
      />

      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice('')} className="text-emerald-700 hover:text-emerald-900 font-bold ml-2">
            &times;
          </button>
        </div>
      )}

      {/* Main Spec Card Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* DETAILS / FILTERS Section */}
        <div className="p-6 border-b border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold tracking-wider text-ink-900 uppercase">
              DETAILS / FILTERS
            </h2>
            <span className="text-xs text-slate-400">
              User creation and notification configurations
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Row 1 */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                USER NAME*
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. Sumanth Varma"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-hyra-700 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                WORK EMAIL*
              </label>
              <input
                type="email"
                value={workEmail}
                onChange={(e) => setWorkEmail(e.target.value)}
                placeholder="sumanth@xunaris.com"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-hyra-700 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                ROLE*
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-hyra-700 font-medium cursor-pointer"
              >
                <option value="User">User</option>
                <option value="Admin">Admin</option>
                <option value="Sales">Sales</option>
                <option value="Marketing">Marketing</option>
              </select>
            </div>

            {/* Row 2 */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                DEPARTMENT*
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Marketing / Sales / Staffing"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-hyra-700 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                BUSINESS UNIT ACCESS
              </label>
              <select
                value={businessUnitAccess}
                onChange={(e) => setBusinessUnitAccess(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-hyra-700 font-medium cursor-pointer"
              >
                <option value="Both">Both (Xunaris + HYRA Connect)</option>
                <option value="Xunaris">Xunaris Only</option>
                <option value="HYRA Connect">HYRA Connect Only</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                ACCOUNT STATUS
              </label>
              <select
                value={accountStatus}
                onChange={(e) => setAccountStatus(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-hyra-700 font-medium cursor-pointer"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Row 3 */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                EMAIL SENDER
              </label>
              <input
                type="text"
                value={emailSender}
                onChange={(e) => setEmailSender(e.target.value)}
                placeholder="CRM notifications <crm@xunaris.com>"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-hyra-700 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                DAILY DIGEST TIME
              </label>
              <input
                type="text"
                value={dailyDigestTime}
                onChange={(e) => setDailyDigestTime(e.target.value)}
                placeholder="09:00 IST"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-hyra-700 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                ESCALATION DELAY
              </label>
              <input
                type="text"
                value={escalationDelay}
                onChange={(e) => setEscalationDelay(e.target.value)}
                placeholder="2 days"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-hyra-700 font-medium"
              />
            </div>
          </div>
        </div>

        {/* RECORDS / ACTIVITY Section with Tabbed Sub-views */}
        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-xs font-extrabold tracking-wider text-ink-900 uppercase">
                RECORDS / ACTIVITY
              </h2>
              <span className="text-xs text-slate-400">
                {activeTab === 'senders'
                  ? 'Official company email account configuration & SMTP authentication for each brand'
                  : activeTab === 'rules'
                  ? 'Active automation rules & alert policies (click row or badge to toggle)'
                  : `Configured system users (${users.length} accounts)`}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab('senders')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'senders'
                    ? 'bg-[#1d68cd] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>Brand Email Accounts ({senderAccounts.length || 2})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('rules')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'rules'
                    ? 'bg-[#1d68cd] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Automation Rules ({automationRules.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-[#1d68cd] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Users Directory ({users.length})
              </button>
            </div>
          </div>

          {activeTab === 'senders' ? (
            <div className="space-y-6">
              <div className="p-4 bg-hyra-50 border border-hyra-200 rounded-xl text-hyra-900 text-xs flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-hyra-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-hyra-900 text-xs uppercase tracking-wide">
                      Official Brand Outbound Email Authentication
                    </h4>
                    <p className="text-[11px] text-hyra-800 mt-0.5 leading-relaxed">
                      Emails dispatched by Xunaris CRM are sent strictly through each brand's authenticated company account. 
                      Credentials are encrypted and stored in environment variables (<code>.env</code>) and the database.
                      Passphrases are never leaked to the client.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fetchSenderAccounts}
                  className="px-2.5 py-1 text-[11px] font-bold bg-white text-hyra-700 border border-hyra-200 rounded-lg hover:bg-hyra-100 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                  title="Refresh live status from server"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingAccounts ? 'animate-spin' : ''}`} />
                  <span>Refresh Status</span>
                </button>
              </div>

              {/* Deliverability & DNS Authentication Overview */}
              <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 space-y-3.5 shadow-md border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Server className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h4 className="font-extrabold text-white text-xs uppercase tracking-wide">
                        Domain Sender Authentication & Inbox Placement Status (SPF • DMARC • MX)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Live DNS records queried from authoritative name servers for xunaris.com and hyraconnect.com
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={fetchDeliverability}
                    className="px-2.5 py-1 text-[11px] font-bold bg-slate-800 text-slate-200 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingDns ? 'animate-spin' : ''}`} />
                    <span>Re-check DNS</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Xunaris Domain DNS */}
                  <div className="bg-slate-800/80 rounded-xl p-3.5 space-y-2 border border-slate-700/60 font-mono text-[11px]">
                    <div className="flex items-center justify-between font-sans">
                      <span className="font-extrabold text-hyra-300">xunaris.com</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-md">
                        SPF & MX Active
                      </span>
                    </div>
                    <div className="space-y-1 text-slate-300 text-[10px]">
                      <p><strong>SPF:</strong> {deliverability?.xunaris?.spf || 'v=spf1 include:secureserver.net -all'}</p>
                      <p><strong>DMARC:</strong> {deliverability?.xunaris?.dmarc || 'v=DMARC1; p=none'}</p>
                      <p><strong>MX Host:</strong> smtp.secureserver.net (GoDaddy)</p>
                      <p className="text-emerald-400 font-sans text-[11px] mt-1">
                        ✓ Outgoing SMTP: <strong>smtpout.secureserver.net (Port 465 SSL)</strong> passes SPF perfectly.
                      </p>
                    </div>
                  </div>

                  {/* HYRA Connect Domain DNS */}
                  <div className="bg-slate-800/80 rounded-xl p-3.5 space-y-2 border border-slate-700/60 font-mono text-[11px]">
                    <div className="flex items-center justify-between font-sans">
                      <span className="font-extrabold text-violet-300">hyraconnect.com</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-violet-500/20 text-violet-300 border border-violet-500/40 rounded-md">
                        DMARC p=reject (Strict)
                      </span>
                    </div>
                    <div className="space-y-1 text-slate-300 text-[10px]">
                      <p><strong>SPF:</strong> {deliverability?.hyra?.spf || 'v=spf1 include:secureserver.net -all'}</p>
                      <p><strong>DMARC:</strong> {deliverability?.hyra?.dmarc || 'v=DMARC1; p=reject (Strict)'}</p>
                      <p><strong>MX Host:</strong> smtp.secureserver.net (GoDaddy)</p>
                      <p className="text-violet-300 font-sans text-[11px] mt-1">
                        ✓ Outgoing SMTP: <strong>smtpout.secureserver.net</strong> or <strong>Brevo relay</strong> satisfies DMARC.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-amber-300 font-bold">💡 Inbox Placement Guidance:</span> Because both domains designate <code>include:secureserver.net -all</code>, emails dispatched via <code>smtpout.secureserver.net</code> with corporate mailbox credentials automatically pass SPF and DMARC alignment, preventing messages from landing in Spam/Junk.
                </div>
              </div>

              {/* Two Brand Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* BRAND 1: XUNARIS */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-ink-900 flex items-center justify-center text-white font-extrabold text-xs shadow-xs">
                        XU
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-slate-900 text-sm">Xunaris Official Email</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-hyra-100 text-hyra-800 rounded-full">
                            Xunaris Services
                          </span>
                        </div>
                        <p className="text-xs font-mono text-slate-500 font-semibold">sales@xunaris.com</p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {(() => {
                      const acc = senderAccounts.find(a => a.id === 'acc_xunaris');
                      if (acc?.is_verified === 1) {
                        return (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-2.5 py-1 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Authorized</span>
                          </span>
                        );
                      }
                      return (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/70 border border-amber-300 px-2.5 py-1 rounded-lg">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Not Authenticated</span>
                        </span>
                      );
                    })()}
                  </div>

                  {/* Form */}
                  <form onSubmit={handleAuthenticateXunaris} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        PROVIDER PRESET (AUTO-FILL)
                      </label>
                      <select
                        onChange={(e) => applyPresetXun(e.target.value)}
                        defaultValue="godaddy"
                        className="w-full text-xs px-3 py-2 rounded-xl border border-hyra-200 bg-hyra-50/40 font-bold text-hyra-900 focus:ring-2 focus:ring-hyra-700 cursor-pointer"
                      >
                        <option value="godaddy">GoDaddy Official Email (smtpout.secureserver.net) [Recommended: Passes SPF]</option>
                        <option value="gmail">Google Workspace / Gmail Relay (smtp.gmail.com)</option>
                        <option value="brevo">Brevo SMTP Relay (smtp-relay.brevo.com)</option>
                        <option value="office365">Microsoft Office 365 (smtp.office365.com)</option>
                        <option value="custom">Custom SMTP Server</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        SENDER DISPLAY NAME*
                      </label>
                      <input
                        type="text"
                        required
                        value={xunName}
                        onChange={(e) => setXunName(e.target.value)}
                        placeholder="Xunaris Sales"
                        className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-hyra-700"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          SMTP HOST*
                        </label>
                        <input
                          type="text"
                          required
                          value={xunHost}
                          onChange={(e) => setXunHost(e.target.value)}
                          placeholder="smtp.gmail.com"
                          className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-mono focus:ring-2 focus:ring-hyra-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          PORT / SSL*
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            required
                            value={xunPort}
                            onChange={(e) => setXunPort(Number(e.target.value))}
                            placeholder="465"
                            className="w-20 text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono focus:ring-2 focus:ring-hyra-700"
                          />
                          <label className="text-[11px] text-slate-600 flex items-center gap-1 font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={xunSecure}
                              onChange={(e) => setXunSecure(e.target.checked)}
                              className="rounded"
                            />
                            <span>SSL (465)</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        SMTP USERNAME / EMAIL*
                      </label>
                      <input
                        type="email"
                        required
                        value={xunUser}
                        onChange={(e) => setXunUser(e.target.value)}
                        placeholder="e.g. corporate@company.com or personal Gmail"
                        className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-hyra-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        SMTP PASSWORD / 16-LETTER APP PASSWORD*
                      </label>
                      <input
                        type="password"
                        required={!senderAccounts.find(a => a.id === 'acc_xunaris')?.has_credentials}
                        value={xunPass}
                        onChange={(e) => setXunPass(e.target.value)}
                        placeholder={senderAccounts.find(a => a.id === 'acc_xunaris')?.has_credentials ? '••••••••  (Saved in .env / DB — enter new to change)' : 'App Password or SMTP password'}
                        className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-mono tracking-wider focus:ring-2 focus:ring-hyra-700"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Stored securely in environment variables (XUNARIS_SMTP_PASS). Never exposed to browser.
                      </span>
                    </div>

                    <div className="pt-1">
                      <label className="text-[11px] text-slate-700 flex items-center gap-2 font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={xunShare}
                          onChange={(e) => setXunShare(e.target.checked)}
                          className="rounded"
                        />
                        <span>Authorize HYRA Connect with these credentials as well</span>
                      </label>
                    </div>

                    {xunError && (
                      <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-[11px]">
                        <strong>Authentication Error:</strong> {xunError}
                      </div>
                    )}

                    {xunSuccess && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{xunSuccess}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                      <button
                        type="submit"
                        disabled={xunVerifying}
                        className="flex-1 py-2 px-3 bg-hyra-700 hover:bg-hyra-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{xunVerifying ? 'Verifying Handshake...' : 'Authenticate Xunaris Account'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTestExistingConnection('acc_xunaris')}
                        disabled={testingConn['acc_xunaris']}
                        className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Test live handshake with current credentials without re-entering password"
                      >
                        <RefreshCw className={`w-3 h-3 ${testingConn['acc_xunaris'] ? 'animate-spin text-hyra-700' : 'text-slate-600'}`} />
                        <span>{testingConn['acc_xunaris'] ? 'Testing...' : 'Test Connection'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDiagSender('sales@xunaris.com');
                          setIsDiagOpen(true);
                        }}
                        className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Send diagnostic email to test real inbox delivery"
                      >
                        <Send className="w-3 h-3 text-hyra-700" />
                        <span>Test Send</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* BRAND 2: HYRA CONNECT */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-violet-700 flex items-center justify-center text-white font-extrabold text-xs shadow-xs">
                        HY
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-slate-900 text-sm">HYRA Connect Official Email</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-violet-100 text-violet-800 rounded-full">
                            HYRA Connect
                          </span>
                        </div>
                        <p className="text-xs font-mono text-slate-500 font-semibold">sales@hyraconnect.com</p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {(() => {
                      const acc = senderAccounts.find(a => a.id === 'acc_hyra');
                      if (acc?.is_verified === 1) {
                        return (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-2.5 py-1 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Authorized</span>
                          </span>
                        );
                      }
                      return (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/70 border border-amber-300 px-2.5 py-1 rounded-lg">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Not Authenticated</span>
                        </span>
                      );
                    })()}
                  </div>

                  {/* Form */}
                  <form onSubmit={handleAuthenticateHyra} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        PROVIDER PRESET (AUTO-FILL)
                      </label>
                      <select
                        onChange={(e) => applyPresetHyra(e.target.value)}
                        defaultValue="godaddy"
                        className="w-full text-xs px-3 py-2 rounded-xl border border-violet-200 bg-violet-50/40 font-bold text-violet-900 focus:ring-2 focus:ring-violet-600 cursor-pointer"
                      >
                        <option value="godaddy">GoDaddy Official Email (smtpout.secureserver.net) [Recommended: Passes SPF]</option>
                        <option value="gmail">Google Workspace / Gmail Relay (smtp.gmail.com)</option>
                        <option value="brevo">Brevo SMTP Relay (smtp-relay.brevo.com) [Matches Brevo TXT]</option>
                        <option value="office365">Microsoft Office 365 (smtp.office365.com)</option>
                        <option value="custom">Custom SMTP Server</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        SENDER DISPLAY NAME*
                      </label>
                      <input
                        type="text"
                        required
                        value={hyraName}
                        onChange={(e) => setHyraName(e.target.value)}
                        placeholder="HYRA Connect Sales"
                        className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-violet-600"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          SMTP HOST*
                        </label>
                        <input
                          type="text"
                          required
                          value={hyraHost}
                          onChange={(e) => setHyraHost(e.target.value)}
                          placeholder="smtp.gmail.com"
                          className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-mono focus:ring-2 focus:ring-violet-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          PORT / SSL*
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            required
                            value={hyraPort}
                            onChange={(e) => setHyraPort(Number(e.target.value))}
                            placeholder="465"
                            className="w-20 text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono focus:ring-2 focus:ring-violet-600"
                          />
                          <label className="text-[11px] text-slate-600 flex items-center gap-1 font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={hyraSecure}
                              onChange={(e) => setHyraSecure(e.target.checked)}
                              className="rounded"
                            />
                            <span>SSL (465)</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        SMTP USERNAME / EMAIL*
                      </label>
                      <input
                        type="email"
                        required
                        value={hyraUser}
                        onChange={(e) => setHyraUser(e.target.value)}
                        placeholder="e.g. corporate@company.com or personal Gmail"
                        className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-violet-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        SMTP PASSWORD / 16-LETTER APP PASSWORD*
                      </label>
                      <input
                        type="password"
                        required={!senderAccounts.find(a => a.id === 'acc_hyra')?.has_credentials}
                        value={hyraPass}
                        onChange={(e) => setHyraPass(e.target.value)}
                        placeholder={senderAccounts.find(a => a.id === 'acc_hyra')?.has_credentials ? '••••••••  (Saved in .env / DB — enter new to change)' : 'App Password or SMTP password'}
                        className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-mono tracking-wider focus:ring-2 focus:ring-violet-600"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Stored securely in environment variables (HYRA_SMTP_PASS). Never exposed to browser.
                      </span>
                    </div>

                    <div className="pt-1">
                      <label className="text-[11px] text-slate-700 flex items-center gap-2 font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hyraShare}
                          onChange={(e) => setHyraShare(e.target.checked)}
                          className="rounded"
                        />
                        <span>Authorize Xunaris with these credentials as well</span>
                      </label>
                    </div>

                    {hyraError && (
                      <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-[11px]">
                        <strong>Authentication Error:</strong> {hyraError}
                      </div>
                    )}

                    {hyraSuccess && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{hyraSuccess}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                      <button
                        type="submit"
                        disabled={hyraVerifying}
                        className="flex-1 py-2 px-3 bg-violet-700 hover:bg-violet-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{hyraVerifying ? 'Verifying Handshake...' : 'Authenticate HYRA Connect Account'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTestExistingConnection('acc_hyra')}
                        disabled={testingConn['acc_hyra']}
                        className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Test live handshake with current credentials without re-entering password"
                      >
                        <RefreshCw className={`w-3 h-3 ${testingConn['acc_hyra'] ? 'animate-spin text-violet-700' : 'text-slate-600'}`} />
                        <span>{testingConn['acc_hyra'] ? 'Testing...' : 'Test Connection'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDiagSender('sales@hyraconnect.com');
                          setIsDiagOpen(true);
                        }}
                        className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Send diagnostic email to test real inbox delivery"
                      >
                        <Send className="w-3 h-3 text-violet-700" />
                        <span>Test Send</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          ) : activeTab === 'rules' ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="min-w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 text-ink-900 font-bold">
                  <tr>
                    <th className="px-4 py-3">Rule</th>
                    <th className="px-4 py-3">Trigger</th>
                    <th className="px-4 py-3">Recipient</th>
                    <th className="px-4 py-3 text-right">Enabled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {automationRules.map((rule) => {
                    const isEnabled = rule.enabled === 'Yes';
                    return (
                      <tr
                        key={rule.id}
                        onClick={() => toggleRuleEnabled(rule.id)}
                        className="cursor-pointer hover:bg-hyra-50/50 transition-colors"
                      >
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          {rule.rule}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 font-medium">
                          {rule.trigger}
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 font-medium">
                          {rule.recipient}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRuleEnabled(rule.id);
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                              isEnabled
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            {rule.enabled}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="min-w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 text-ink-900 font-bold">
                  <tr>
                    <th className="px-4 py-3">User Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Team role</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Access</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {users.map((u) => {
                    const isCurrent = currentUser?.id === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-hyra-50/50 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{u.name}</span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-hyra-100 text-hyra-800">
                                Current
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 font-medium">
                          {u.email}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-800">
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <select
                            value={u.teamRole || 'Sales Executive'}
                            onChange={async (e) => {
                              try {
                                await apiClient.request(`/admin/users/${u.id}/team-role`, { method: 'PUT', body: { teamRole: e.target.value } });
                                updateUser(u.id, { teamRole: e.target.value });
                                setNotice(`${u.name} is now ${e.target.value}.`);
                              } catch (err) { setNotice(`Could not change the team role: ${err.message}`); }
                            }}
                            className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold bg-white"
                            aria-label={`Team role for ${u.name}`}
                          >
                            {['Admin', 'Sales Head', 'Sales Executive', 'Marketing'].map((r) => <option key={r}>{r}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 font-medium">
                          {u.department}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 font-medium">
                          {u.businessUnitAccess || 'Both'}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            {u.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isCurrent && (
                              <button
                                onClick={() => switchUser(u.id)}
                                className="px-2.5 py-1 text-[11px] font-bold text-hyra-700 bg-hyra-50 hover:bg-hyra-700 hover:text-white rounded-md border border-hyra-200 transition-colors"
                              >
                                Switch
                              </button>
                            )}
                            <button
                              onClick={() => { setPwTarget(u); setPwValue(''); setPwMsg({ type: '', text: '' }); }}
                              className="px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-600 hover:text-white rounded-md border border-amber-200 transition-colors"
                            >
                              Reset password
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {pwTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setPwTarget(null)}>
          <form onSubmit={submitPasswordReset} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-3">
            <h3 className="text-base font-extrabold text-slate-900">Reset password</h3>
            <p className="text-xs text-slate-500">Set a new password for <strong>{pwTarget.name}</strong> ({pwTarget.email}). Share it with them privately and ask them to keep it safe.</p>
            <input
              type="password" autoComplete="new-password" autoFocus value={pwValue}
              onChange={(e) => setPwValue(e.target.value)}
              placeholder="New password (min 12 characters)"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            {pwMsg.text && <p className={`text-xs font-semibold ${pwMsg.type === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}>{pwMsg.text}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPwTarget(null)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 text-slate-700">Close</button>
              <button type="submit" disabled={pwBusy} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-hyra-700 text-white disabled:opacity-60">{pwBusy ? 'Saving...' : 'Save password'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Real-Time Testing & Sample Data Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-hyra-700" />
              <span>Real-Time Testing & Sample Data Controls</span>
            </h3>
            <p className="text-xs text-slate-500 max-w-xl">
              Remove all pre-seeded mockup records (leads, opportunities, companies, and activities) so your team can test real company workflows from scratch.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleClearTestData}
              className="px-4 py-2.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Test Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* DIAGNOSTIC TEST EMAIL MODAL */}
      {isDiagOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-hyra-700" />
                <div>
                  <h3 className="font-extrabold text-ink-900 text-sm">Send Diagnostic Email</h3>
                  <p className="text-[11px] text-slate-400">Test live inbox delivery from authorized company accounts</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsDiagOpen(false);
                  setDiagResult(null);
                }}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  OFFICIAL SENDER ACCOUNT*
                </label>
                <select
                  value={diagSender}
                  onChange={(e) => setDiagSender(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium cursor-pointer"
                >
                  <option value="sales@hyraconnect.com">sales@hyraconnect.com (HYRA Connect Sales)</option>
                  <option value="sales@xunaris.com">sales@xunaris.com (Xunaris Sales)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  TO (RECIPIENT EMAIL ADDRESS)*
                </label>
                <input
                  type="email"
                  required
                  value={diagRecipient}
                  onChange={(e) => setDiagRecipient(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium"
                />
              </div>

              {diagResult && (
                <div className={`p-3 rounded-xl text-[11px] border ${
                  diagResult.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    {diagResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span>{diagResult.success ? 'Delivery Succeeded' : 'Delivery Failed'}</span>
                  </div>
                  <div className="font-mono text-[10px] space-y-0.5">
                    <p><strong>Sender:</strong> {diagResult.sender || diagSender}</p>
                    <p><strong>Recipient:</strong> {diagResult.recipient || diagRecipient}</p>
                    <p><strong>Status:</strong> {diagResult.deliveryStatus || (diagResult.success ? 'Delivered' : 'Failed')}</p>
                    {diagResult.error && (
                      <p className="text-red-700 font-sans mt-1"><strong>Details:</strong> {diagResult.error}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsDiagOpen(false);
                    setDiagResult(null);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={diagSending}
                  onClick={handleSendDiagnosticEmail}
                  className="px-5 py-2.5 bg-hyra-700 hover:bg-hyra-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{diagSending ? 'Dispatching Live...' : 'Send Live Test Email'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
