import express from 'express';
import db from '../db/database.js';

const router = express.Router();

router.get('/', (req, res) => {
  const { businessUnit, dateRange, owner, leadSource, status } = req.query;

  let whereLead = 'WHERE 1=1';
  let whereOpp = 'WHERE 1=1';
  const leadParams = [];
  const oppParams = [];

  if (businessUnit && businessUnit !== 'Both' && businessUnit !== 'All') {
    const code = businessUnit === 'HYRA Connect' ? 'HYRA' : 'XUN';
    whereLead += ' AND business_vertical_code = ?';
    whereOpp += ' AND business_vertical_code = ?';
    leadParams.push(code);
    oppParams.push(code);
  }

  if (owner && owner !== 'All' && owner !== 'All permitted users') {
    whereLead += ' AND owner_name = ?';
    whereOpp += ' AND owner_name = ?';
    leadParams.push(owner);
    oppParams.push(owner);
  }

  if (leadSource && leadSource !== 'All') {
    whereLead += ' AND lead_source = ?';
    leadParams.push(leadSource);
  }

  // Calculate metrics
  const totalLeads = db.prepare(`SELECT COUNT(*) as c FROM leads ${whereLead}`).get(...leadParams).c;
  const qualifiedLeads = db.prepare(`SELECT COUNT(*) as c FROM leads ${whereLead} AND lead_status = 'Qualified'`).get(...leadParams).c;
  const conversionRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;

  const openOpp = db.prepare(`SELECT COUNT(*) as c, COALESCE(SUM(expected_value), 0) as val FROM opportunities ${whereOpp} AND stage NOT IN ('Won', 'Lost')`).get(...oppParams);
  const overdueFollowups = db.prepare(`SELECT COUNT(*) as c FROM activities WHERE status = 'Planned' AND date_time < datetime('now')`).get().c;
  const campaignReplies = db.prepare('SELECT COALESCE(SUM(replies_count), 0) as s FROM campaigns').get().s;
  const handoffsWon = db.prepare('SELECT COUNT(*) as c FROM handoffs WHERE status = \'Accepted\'').get().c;

  const rows = [
    { report: 'Lead conversion', metric: 'Qualified / total', value: `${conversionRate}%`, action: 'Export' },
    { report: 'Sales pipeline', metric: 'Open value', value: `INR ${Number(openOpp.val).toLocaleString('en-IN')}`, action: 'Export' },
    { report: 'Follow-up aging', metric: 'Overdue', value: String(overdueFollowups), action: 'View' },
    { report: 'Campaign performance', metric: 'Replies', value: String(campaignReplies), action: 'Export' },
    { report: 'Client handoff', metric: 'Accepted', value: String(handoffWon), action: 'Export' }
  ];

  res.json({
    summary: {
      totalLeads,
      qualifiedLeads,
      conversionRate,
      pipelineValue: openOpp.val,
      overdueTasks: overdueFollowups
    },
    rows
  });
});

export default router;
