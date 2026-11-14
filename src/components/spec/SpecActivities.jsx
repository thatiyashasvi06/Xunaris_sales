import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { SpecHeader } from './SpecHeader';
import { CheckCircle2, Plus, Trash2, Calendar, Mail, Phone, Users, CheckSquare, ExternalLink } from 'lucide-react';
import { launchEmailCompose } from '../../utils/emailCompose';

const tomorrowLabel = () => new Date(Date.now() + 86400000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export const SpecActivities = () => {
  const { activities, addActivity, updateActivity, deleteActivity, users, companies, leads, currentUser, setActiveNav } = useCRM();

  const [selectedActivityId, setSelectedActivityId] = useState(activities[0]?.id || null);

  // Form input states
  const [relatedTo, setRelatedTo] = useState(activities[0]?.relatedTo || '');
  const [activityType, setActivityType] = useState(activities[0]?.activityType || 'Meeting');
  const [subject, setSubject] = useState(activities[0]?.subject || 'Staffing requirements');
  const [dateTime, setDateTime] = useState(activities[0]?.dateTime || `${tomorrowLabel()}, 10:00`);
  const [assignedTo, setAssignedTo] = useState(activities[0]?.assignedTo || currentUser.name);
  const [status, setStatus] = useState(activities[0]?.status || 'Planned');
  const [outcome, setOutcome] = useState(activities[0]?.outcome || 'Awaiting response');
  const [nextFollowup, setNextFollowup] = useState(activities[0]?.nextFollowup || tomorrowLabel());
  const [reminder, setReminder] = useState(activities[0]?.reminder || '1 day before');

  // Filter state for records table
  const [filterType, setFilterType] = useState('All');
  const [notice, setNotice] = useState('');

  // Combined related-to list from companies and leads
  const relatedOptions = Array.from(
    new Set([
      ...companies.map(c => c.name),
      ...leads.map(l => l.companyName)
    ])
  );

  const handleClearForm = () => {
    setSelectedActivityId(null);
    setRelatedTo('');
    setActivityType('Meeting');
    setSubject('');
    setDateTime(
      new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', 10:00'
    );
    setAssignedTo(currentUser.name);
    setStatus('Planned');
    setOutcome('');
    setNextFollowup(
      new Date(Date.now() + 86400000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    );
    setReminder('1 day before');
    setNotice('Ready to log a new activity.');
    setTimeout(() => setNotice(''), 2500);
  };

  const handleSelectRow = (act) => {
    setSelectedActivityId(act.id);
    setRelatedTo(act.relatedTo || '');
    setActivityType(act.activityType || 'Meeting');
    setSubject(act.subject || '');
    setDateTime(act.dateTime || '');
    setAssignedTo(act.assignedTo || currentUser.name);
    setStatus(act.status || 'Planned');
    setOutcome(act.outcome || '');
    setNextFollowup(act.nextFollowup || '');
    setReminder(act.reminder || 'None');
  };

  const handleSaveActivity = () => {
    if (!relatedTo.trim() || !subject.trim()) {
      alert('Related To and Subject are required fields.');
      return;
    }

    const payload = {
      relatedTo: relatedTo.trim(),
      activityType,
      subject: subject.trim(),
      dateTime: dateTime.trim(),
      assignedTo,
      status,
      outcome: outcome.trim(),
      nextFollowup: nextFollowup.trim(),
      reminder,
      result: status === 'Completed' ? outcome.trim() || 'Completed' : '-'
    };

    if (selectedActivityId) {
      updateActivity(selectedActivityId, payload);
      setNotice(`Updated activity ${selectedActivityId} successfully!`);
    } else {
      const created = addActivity(payload);
      setSelectedActivityId(created.id);
      setNotice(`Logged new activity ${created.id}! Added to timeline.`);
    }
    setTimeout(() => setNotice(''), 3500);
  };

  const handleSendEmail = () => {
    if (!relatedTo.trim()) {
      alert('Specify who the email is Related To.');
      return;
    }

    // Lookup recipient email from leads or companies matching relatedTo
    const matchedLead = leads.find(l => (l.companyName || '').toLowerCase() === relatedTo.trim().toLowerCase() || (l.contactName || '').toLowerCase() === relatedTo.trim().toLowerCase());
    const matchedComp = companies.find(c => (c.name || '').toLowerCase() === relatedTo.trim().toLowerCase());

    const targetEmail = matchedLead?.workEmail || 
      (matchedComp?.website ? `contact@${matchedComp.website.replace(/^https?:\/\//, '').replace(/\/.*$/, '')}` : `contact@${relatedTo.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`);

    const isHyra = matchedLead?.businessVertical === 'HYRA Connect' || matchedComp?.businessUnit === 'HYRA Connect';
    const senderEmail = isHyra ? 'sales@hyraconnect.com' : 'sales@xunaris.com';

    const emailSubject = subject.trim() ? `Re: ${subject.trim()}` : `Briefing regarding enterprise solutions for ${relatedTo}`;
    const emailBody = `Hello,\n\nWe are following up regarding enterprise technology services for ${relatedTo}.\n\nOur team is available this week for a 15-minute briefing to review requirements and next steps.\n\nBest regards,\n${currentUser?.name || 'Sales Lead'}\n${isHyra ? 'HYRA Connect' : 'Xunaris Technology Services'}\n${senderEmail}`;

    const launchRes = launchEmailCompose({
      method: 'outlook',
      senderEmail,
      to: targetEmail,
      subject: emailSubject,
      body: emailBody
    });

    const nowStr =
      new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ', ' +
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newAct = addActivity({
      relatedTo: relatedTo.trim(),
      activityType: 'Email',
      subject: emailSubject,
      dateTime: nowStr,
      assignedTo: currentUser.name,
      status: 'Completed',
      outcome: `Compose window opened via ${launchRes.method} to ${targetEmail} from ${senderEmail}`,
      nextFollowup: nextFollowup || tomorrowLabel(),
      reminder: '1 day before',
      result: 'Draft Opened'
    });

    setSelectedActivityId(newAct.id);
    setSubject(emailSubject);
    setActivityType('Email');
    setStatus('Completed');
    setOutcome(`Compose window opened via ${launchRes.method} to ${targetEmail}`);
    setNotice(`🎉 Email compose window opened in ${launchRes.method} for ${relatedTo} (${targetEmail})! Review and click Send in Outlook.`);
    setTimeout(() => setNotice(''), 4500);
  };

  const handleDeleteActivity = (e, actId) => {
    e.stopPropagation();
    if (window.confirm(`Delete activity record ${actId}?`)) {
      deleteActivity(actId);
      if (selectedActivityId === actId) {
        handleClearForm();
      }
      setNotice(`Activity ${actId} removed.`);
      setTimeout(() => setNotice(''), 2500);
    }
  };

  const filteredActivities = filterType === 'All'
    ? activities
    : activities.filter(a => a.activityType === filterType || a.status === filterType);

  return (
    <div className="space-y-6">
      <SpecHeader
        title="Activities"
        subtitle="Calls, emails, meetings and tasks on one timeline"
        actionButtons={[
          {
            label: selectedActivityId ? 'Update Activity' : 'Save Activity',
            onClick: handleSaveActivity
          },
          {
            label: 'Send Email',
            onClick: handleSendEmail
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
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-extrabold tracking-wider text-ink-900 uppercase">
                DETAILS / FILTERS
              </h2>
              {selectedActivityId && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-hyra-100 text-hyra-800">
                  Editing: {selectedActivityId}
                </span>
              )}
            </div>
            <button
              onClick={handleClearForm}
              className="inline-flex items-center gap-1 text-xs font-bold text-hyra-700 hover:text-hyra-800 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log New Activity</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Row 1 */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                RELATED TO*
              </label>
              <input
                type="text"
                list="related-options"
                value={relatedTo}
                onChange={(e) => setRelatedTo(e.target.value)}
                placeholder="Example Technologies"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-hyra-700 font-medium"
              />
              <datalist id="related-options">
                {relatedOptions.map((opt, i) => (
                  <option key={i} value={opt} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                ACTIVITY TYPE*
              </label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-hyra-700 font-medium cursor-pointer"
              >
                <option value="Meeting">Meeting</option>
                <option value="Call">Call</option>
                <option value="Email">Email</option>
                <option value="Task">Task</option>
                <option value="Note">Note</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                SUBJECT*
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Staffing requirements"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-hyra-700 font-medium"
              />
            </div>

            {/* Row 2 */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                DATE / TIME*
              </label>
              <input
                type="text"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                placeholder="15 Oct 2026, 11:00"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-hyra-700 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                ASSIGNED TO*
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-hyra-700 font-medium cursor-pointer"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                STATUS*
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-hyra-700 font-medium cursor-pointer"
              >
                <option value="Planned">Planned</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Row 3 */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                OUTCOME
              </label>
              <input
                type="text"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="Awaiting response"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-hyra-700 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                NEXT FOLLOW-UP
              </label>
              <input
                type="text"
                value={nextFollowup}
                onChange={(e) => setNextFollowup(e.target.value)}
                placeholder="16 Oct 2026"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-hyra-700 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                REMINDER
              </label>
              <select
                value={reminder}
                onChange={(e) => setReminder(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-hyra-700 font-medium cursor-pointer"
              >
                <option value="None">None</option>
                <option value="15 minutes before">15 minutes before</option>
                <option value="1 hour before">1 hour before</option>
                <option value="1 day before">1 day before</option>
                <option value="2 days before">2 days before</option>
              </select>
            </div>
          </div>
        </div>

        {/* RECORDS / ACTIVITY Table Section */}
        <div className="p-6 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-extrabold tracking-wider text-ink-900 uppercase">
                RECORDS / ACTIVITY
              </h2>
              <span className="text-xs text-slate-400">
                Activity log and timeline ({filteredActivities.length} items) &bull; Click row to view/edit
              </span>
            </div>

            {/* Quick Filter Pill */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {['All', 'Meeting', 'Call', 'Email', 'Task', 'Planned', 'Completed'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterType(tab)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    filterType === tab
                      ? 'bg-[#1d68cd] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="min-w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-ink-900 font-bold">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Related To</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredActivities.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-10 text-center">
                      {activities.length === 0 ? (
                        <>
                          <div className="text-sm font-extrabold text-ink-900">No activities yet</div>
                          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">Calls, emails, meetings and tasks appear here. They are created automatically when you add a lead or when someone books a meeting, or you can log one with the form above.</p>
                          <button type="button" onClick={() => setActiveNav('leads')} className="mt-3 px-4 py-2 rounded-xl bg-hyra-700 text-white text-xs font-bold">Go to Leads</button>
                        </>
                      ) : (
                        <span className="text-slate-400">No activities match the current filter.</span>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredActivities.map((act) => {
                    const isSelected = selectedActivityId === act.id;
                    return (
                      <tr
                        key={act.id}
                        onClick={() => handleSelectRow(act)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-hyra-50/80 ring-1 ring-inset ring-hyra-300' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                          {act.dateTime?.split(',')[0] || act.dateTime}
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 font-medium">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            act.activityType === 'Meeting'
                              ? 'bg-purple-100 text-purple-800'
                              : act.activityType === 'Call'
                              ? 'bg-cyan-100 text-cyan-800'
                              : act.activityType === 'Email'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}>
                            {act.activityType}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          <div>{act.relatedTo}</div>
                          <div className="text-[10px] text-slate-400 font-normal truncate max-w-xs">{act.subject}</div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 font-medium whitespace-nowrap">
                          {act.assignedTo}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              act.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : act.status === 'Cancelled'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-hyra-100 text-hyra-800'
                            }`}
                          >
                            {act.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 font-medium max-w-xs truncate">
                          {act.result}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleDeleteActivity(e, act.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete activity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
