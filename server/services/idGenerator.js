import db from '../db/database.js';

/**
 * Generates immutable sequential IDs according to Xunaris CRM Specification v1.0
 * Examples:
 * - Leads: XUN-LD-000001, HYRA-LD-000001
 * - Opportunities: XUN-OP-000001, HYRA-OP-000001
 * - Companies: CMP-000001
 * - Contacts: CON-000001
 * - Campaigns: CMPG-000001
 * - Activities: ACT-000001
 */

export const generateLeadId = (verticalCode) => {
  const code = (verticalCode || 'XUN').toUpperCase() === 'HYRA' ? 'HYRA' : 'XUN';
  const prefix = `${code}-LD-`;
  
  const row = db.prepare(`
    SELECT id FROM leads 
    WHERE id LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

  let nextNum = 1;
  if (row && row.id) {
    const numPart = parseInt(row.id.replace(prefix, ''), 10);
    if (!isNaN(numPart)) nextNum = numPart + 1;
  }
  return `${prefix}${String(nextNum).padStart(6, '0')}`;
};

export const generateOpportunityId = (verticalCode) => {
  const code = (verticalCode || 'XUN').toUpperCase() === 'HYRA' ? 'HYRA' : 'XUN';
  const prefix = `${code}-OP-`;
  
  const row = db.prepare(`
    SELECT id FROM opportunities 
    WHERE id LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

  let nextNum = 1;
  if (row && row.id) {
    const numPart = parseInt(row.id.replace(prefix, ''), 10);
    if (!isNaN(numPart)) nextNum = numPart + 1;
  }
  return `${prefix}${String(nextNum).padStart(6, '0')}`;
};

export const generateCompanyId = () => {
  const prefix = 'CMP-';
  const row = db.prepare(`
    SELECT id FROM companies 
    WHERE id LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

  let nextNum = 1;
  if (row && row.id) {
    const numPart = parseInt(row.id.replace(prefix, ''), 10);
    if (!isNaN(numPart)) nextNum = numPart + 1;
  }
  return `${prefix}${String(nextNum).padStart(6, '0')}`;
};

export const generateContactId = () => {
  const prefix = 'CON-';
  const row = db.prepare(`
    SELECT id FROM contacts 
    WHERE id LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

  let nextNum = 1;
  if (row && row.id) {
    const numPart = parseInt(row.id.replace(prefix, ''), 10);
    if (!isNaN(numPart)) nextNum = numPart + 1;
  }
  return `${prefix}${String(nextNum).padStart(6, '0')}`;
};

export const generateActivityId = () => {
  const prefix = 'ACT-';
  const row = db.prepare(`
    SELECT id FROM activities 
    WHERE id GLOB 'ACT-[0-9]*' 
    ORDER BY id DESC LIMIT 1
  `).get();

  let nextNum = 1;
  if (row && row.id) {
    const numPart = parseInt(row.id.replace(prefix, ''), 10);
    if (!isNaN(numPart)) nextNum = numPart + 1;
  }
  // Double check that nextNum doesn't collide
  while (db.prepare('SELECT 1 FROM activities WHERE id = ?').get(`${prefix}${String(nextNum).padStart(6, '0')}`)) {
    nextNum++;
  }
  return `${prefix}${String(nextNum).padStart(6, '0')}`;
};

export const generateCampaignId = () => {
  const prefix = 'CMPG-';
  const row = db.prepare(`
    SELECT id FROM campaigns 
    WHERE id LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

  let nextNum = 1;
  if (row && row.id) {
    const numPart = parseInt(row.id.replace(prefix, ''), 10);
    if (!isNaN(numPart)) nextNum = numPart + 1;
  }
  return `${prefix}${String(nextNum).padStart(6, '0')}`;
};
