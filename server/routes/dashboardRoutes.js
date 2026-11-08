import express from 'express';
import db from '../db/database.js';

const router = express.Router();

router.get('/', (req, res) => {
  const { service, vertical } = req.query;

  let leadWhere = 'WHERE 1=1';
  let oppWhere = 'WHERE 1=1';
  const leadParams = [];
  const oppParams = [];

  if (vertical && vertical !== 'All') {
    const code = (vertical === 'HYRA' || vertical === 'HYRA Connect') ? 'HYRA' : 'XUN';
    leadWhere += ' AND business_vertical_code = ?';
    oppWhere += ' AND business_vertical_code = ?';
    leadParams.push(code);
    oppParams.push(code);
  }

  if (service && service !== 'All') {
    leadWhere += ' AND service = ?';
    oppWhere += ' AND service = ?';
    leadParams.push(service);
    oppParams.push(service);
  }

  // KPIs
  const newLeads = db.prepare(`SELECT COUNT(*) as c FROM leads ${leadWhere} AND lead_status = 'New'`).get(...leadParams).c;
  const qualifiedLeads = db.prepare(`SELECT COUNT(*) as c FROM leads ${leadWhere} AND lead_status = 'Qualified'`).get(...leadParams).c;
  const openDeals = db.prepare(`SELECT COUNT(*) as c FROM opportunities ${oppWhere} AND stage NOT IN ('Won', 'Lost')`).get(...oppParams).c;
  const wonThisMonth = db.prepare(`SELECT COUNT(*) as c, COALESCE(SUM(expected_value), 0) as val FROM opportunities ${oppWhere} AND stage = 'Won'`).get(...oppParams);
  const followupsDue = db.prepare(`SELECT COUNT(*) as c FROM activities WHERE status = 'Planned'`).get().c;

  // Lead-to-Deal Funnel
  const captured = db.prepare(`SELECT COUNT(*) as c FROM leads ${leadWhere}`).get(...leadParams).c;
  const contacted = db.prepare(`SELECT COUNT(*) as c FROM leads ${leadWhere} AND lead_status IN ('Contacted', 'Qualified')`).get(...leadParams).c;
  const qualified = db.prepare(`SELECT COUNT(*) as c FROM leads ${leadWhere} AND lead_status = 'Qualified'`).get(...leadParams).c;
  const proposal = db.prepare(`SELECT COUNT(*) as c FROM opportunities ${oppWhere} AND stage IN ('Proposal', 'Negotiation', 'Won')`).get(...oppParams).c;
  const won = wonThisMonth.c;

  // Deal Stages
  const stages = ['Discovery', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];
  const dealStages = stages.map(st => {
    const count = db.prepare(`SELECT COUNT(*) as c FROM opportunities ${oppWhere} AND stage = ?`).get(...oppParams, st).c;
    return { stage: st, count };
  });

  // Action Center
  const overdueFollowups = db.prepare(`SELECT COUNT(*) as c FROM activities WHERE status = 'Planned' AND date_time < datetime('now')`).get().c;
  const proposalsAwaiting = db.prepare(`SELECT COUNT(*) as c FROM opportunities ${oppWhere} AND stage = 'Proposal'`).get(...oppParams).c;
  const handoffsPending = db.prepare(`SELECT COUNT(*) as c FROM handoffs WHERE status = 'Pending'`).get().c;

  res.json({
    kpis: {
      newLeads,
      qualifiedLeads,
      openDeals,
      wonThisMonth: wonThisMonth.c,
      wonValue: wonThisMonth.val,
      followupsDue
    },
    funnel: [
      { stage: 'Captured', count: captured, color: '#0d5cb6' },
      { stage: 'Contacted', count: contacted, color: '#1e88e5' },
      { stage: 'Qualified', count: qualified, color: '#00acc1' },
      { stage: 'Proposal', count: proposal, color: '#26a69a' },
      { stage: 'Won', count: won, color: '#4caf50' }
    ],
    dealStages,
    actionCenter: {
      overdueFollowups,
      proposalsAwaiting,
      handoffsPending
    }
  });
});

export default router;
