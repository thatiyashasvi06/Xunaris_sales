import db from './database.js';
import bcrypt from 'bcryptjs';

export const seedDatabase = () => {
  console.log('[Seed] Checking if database needs initial seeding...');

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) {
    console.log('[Seed] Database already seeded. Skipping.');
    return;
  }

  console.log('[Seed] Seeding specification initial data...');

  const passwordHash = bcrypt.hashSync('XunarisCRM2026!', 10);

  // 1. Seed Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, role, department, function_access, scope_enforcement, password_hash, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(
    'usr_admin',
    'Admin User',
    'admin@xunaris.com',
    'ADMIN',
    'Management',
    'Both',
    'Global Organization Scope',
    passwordHash,
    'Active'
  );

  insertUser.run(
    'usr_sales',
    'Sales User',
    'sales@xunaris.com',
    'USER',
    'Sales',
    'Sales',
    'Owner / Sales Team Scope Enforced',
    passwordHash,
    'Active'
  );

  insertUser.run(
    'usr_marketing',
    'Marketing User',
    'marketing@xunaris.com',
    'USER',
    'Marketing',
    'Marketing',
    'Owner / Marketing Scope Enforced',
    passwordHash,
    'Active'
  );

  // 2. Seed Service Catalog
  const insertService = db.prepare(`
    INSERT OR IGNORE INTO service_catalog (id, vertical_code, service_code, display_label, is_active)
    VALUES (?, ?, ?, ?, 1)
  `);

  const xunServices = [
    { code: 'SAP', label: 'SAP Services' },
    { code: 'IT_CONSULTING', label: 'IT Consulting' },
    { code: 'APP_DEV', label: 'Application Development' },
    { code: 'CLOUD', label: 'Digital / Cloud Services' },
    { code: 'OTHER', label: 'Other' }
  ];

  xunServices.forEach(s => insertService.run(`srv_xun_${s.code.toLowerCase()}`, 'XUN', s.code, s.label));

  const hyraServices = [
    { code: 'IT_STAFFING', label: 'IT Staffing' },
    { code: 'NON_IT_STAFFING', label: 'Non-IT Staffing' },
    { code: 'CONTRACT', label: 'Contract Staffing' },
    { code: 'PERMANENT', label: 'Permanent Staffing' },
    { code: 'RECRUITMENT', label: 'Recruitment Services' },
    { code: 'OTHER', label: 'Other' }
  ];

  hyraServices.forEach(s => insertService.run(`srv_hyra_${s.code.toLowerCase()}`, 'HYRA', s.code, s.label));

  // 3. Seed Companies & Contacts
  const insertCompany = db.prepare(`
    INSERT INTO companies (id, name, normalized_name, website, normalized_domain, industry, city, country, business_unit, account_owner, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?)
  `);

  insertCompany.run(
    'CMP-000001',
    'Example Technologies',
    'example technologies',
    'https://example.com',
    'example.com',
    'IT Services',
    'Bengaluru',
    'India',
    'Both',
    'Sales User',
    'Primary strategic enterprise customer.'
  );

  insertCompany.run(
    'CMP-000002',
    'Sample Systems',
    'sample systems',
    'https://samplesystems.com',
    'samplesystems.com',
    'Manufacturing',
    'Pune',
    'India',
    'Xunaris',
    'Sales User',
    'Enterprise Cloud migration candidate.'
  );

  const insertContact = db.prepare(`
    INSERT INTO contacts (id, company_id, full_name, title, email, normalized_email, phone, normalized_phone, relationship, consent_status, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
  `);

  insertContact.run(
    'CON-000001',
    'CMP-000001',
    'Priya Kumar',
    'VP of Technology',
    'priya@example.com',
    'priya@example.com',
    '+91 98765 43210',
    '919876543210',
    'Decision maker',
    'Verified contacts'
  );

  insertContact.run(
    'CON-000002',
    'CMP-000001',
    'Amit Rao',
    'Procurement Director',
    'amit@example.com',
    'amit@example.com',
    '+91 98765 43211',
    '919876543211',
    'Influencer',
    'Verified contacts'
  );

  insertContact.run(
    'CON-000003',
    'CMP-000002',
    'Rahul S',
    'Chief Information Officer',
    'rahul@samplesystems.com',
    'rahul@samplesystems.com',
    '+91 98765 43212',
    '919876543212',
    'Decision maker',
    'Verified contacts'
  );

  // 4. Seed Leads
  const insertLead = db.prepare(`
    INSERT INTO leads (
      id, business_vertical_code, business_vertical_name, service, company_name, company_website,
      industry, city, country, contact_name, job_title, work_email, phone, lead_source,
      requirement_summary, priority, lead_status, owner_id, owner_name, owner_email,
      next_followup_date, notes, company_id, contact_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertLead.run(
    'XUN-LD-000001',
    'XUN',
    'Xunaris Services',
    'SAP Services',
    'Example Technologies',
    'https://example.com',
    'IT Services',
    'Bengaluru',
    'India',
    'Priya Kumar',
    'VP of Technology',
    'priya@example.com',
    '+91 98765 43210',
    'LinkedIn',
    'Looking for SAP S/4HANA migration support and cloud architecture consulting.',
    'High',
    'Contacted',
    'usr_sales',
    'Sales User',
    'sales@xunaris.com',
    '2026-10-24',
    'Discovery demo completed. Awaiting client stakeholder review.',
    'CMP-000001',
    'CON-000001'
  );

  insertLead.run(
    'HYRA-LD-000001',
    'HYRA',
    'HYRA Connect',
    'IT Staffing',
    'Example Technologies',
    'https://example.com',
    'IT Services',
    'Bengaluru',
    'India',
    'Priya Kumar',
    'VP of Technology',
    'priya@example.com',
    '+91 98765 43210',
    'Referral',
    'Need 5 senior full-stack React and Node developers on contract staffing.',
    'High',
    'Qualified',
    'usr_sales',
    'Sales User',
    'sales@xunaris.com',
    '2026-10-22',
    'Positions approved by procurement. Creating deal requisition.',
    'CMP-000001',
    'CON-000001'
  );

  insertLead.run(
    'XUN-LD-000002',
    'XUN',
    'Xunaris Services',
    'Digital / Cloud Services',
    'Sample Systems',
    'https://samplesystems.com',
    'Manufacturing',
    'Pune',
    'India',
    'Rahul S',
    'CIO',
    'rahul@samplesystems.com',
    '+91 98765 43212',
    'Website',
    'Infrastructure optimization and Kubernetes containerization inquiry.',
    'Medium',
    'New',
    'usr_sales',
    'Sales User',
    'sales@xunaris.com',
    '2026-10-20',
    'Inbound web inquiry from landing page.',
    'CMP-000002',
    'CON-000003'
  );

  // 5. Seed Opportunities
  const insertOpp = db.prepare(`
    INSERT INTO opportunities (
      id, lead_id, business_vertical_code, business_vertical_name, title, service,
      company_id, company_name, contact_id, contact_name, owner_id, owner_name,
      stage, expected_value, currency, expected_close_date, probability_percentage
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertOpp.run(
    'HYRA-OP-000001',
    'HYRA-LD-000001',
    'HYRA',
    'HYRA Connect',
    'SAP Staffing - 3 Roles',
    'IT Staffing',
    'CMP-000001',
    'Example Technologies',
    'CON-000001',
    'Priya Kumar',
    'usr_sales',
    'Sales User',
    'Proposal',
    1200000,
    'INR',
    '2026-10-30',
    70
  );

  insertOpp.run(
    'XUN-OP-000001',
    'XUN-LD-000001',
    'XUN',
    'Xunaris Services',
    'Cloud Migration & S/4HANA',
    'SAP Services',
    'CMP-000001',
    'Example Technologies',
    'CON-000001',
    'Priya Kumar',
    'usr_sales',
    'Sales User',
    'Negotiation',
    3500000,
    'INR',
    '2026-11-15',
    80
  );

  // 6. Seed Activities
  const insertActivity = db.prepare(`
    INSERT INTO activities (
      id, related_type, related_id, related_to, activity_type, subject, date_time,
      assigned_to, assigned_user_id, status, outcome, next_followup, reminder, result
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertActivity.run(
    'ACT-000001',
    'Lead',
    'HYRA-LD-000001',
    'Example Technologies',
    'Meeting',
    'Staffing requirements & rate card discussion',
    '2026-10-21 11:00',
    'Sales User',
    'usr_sales',
    'Planned',
    'Awaiting client schedule confirmation',
    '2026-10-23',
    '1 day before',
    'Scheduled'
  );

  insertActivity.run(
    'ACT-000002',
    'Lead',
    'XUN-LD-000001',
    'Example Technologies',
    'Call',
    'Introductory discovery on SAP scope',
    '2026-10-18 15:30',
    'Sales User',
    'usr_sales',
    'Completed',
    'Connected with Priya Kumar. Scope confirmed.',
    '2026-10-24',
    'None',
    'Interested'
  );

  // 7. Seed Campaigns
  const insertCampaign = db.prepare(`
    INSERT INTO campaigns (
      id, campaign_name, business_vertical_code, business_vertical_name, service, channel,
      audience, start_date, end_date, owner_name, owner_id, status, template, budget,
      sent_count, delivered_count, replies_count, leads_created_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertCampaign.run(
    'CMPG-000001',
    'HYRA Q4 Staffing Blitz',
    'HYRA',
    'HYRA Connect',
    'IT Staffing',
    'Email',
    'CTOs & HR Heads across India',
    '2026-10-15',
    '2026-11-15',
    'Marketing User',
    'usr_marketing',
    'Active',
    'Introductory staffing pitch v2',
    50000,
    100,
    94,
    12,
    5
  );

  // 8. Seed Automation Rules
  const insertRule = db.prepare(`
    INSERT INTO automation_rules (id, rule_name, trigger_event, recipient_type, enabled, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertRule.run(
    'rule_1',
    'New Lead Assignment Notification',
    'On assignment',
    'Lead owner',
    'Yes',
    'Dispatches email alert & in-app notification when a lead is assigned.'
  );

  insertRule.run(
    'rule_2',
    'Overdue Follow-up SLA Escalation',
    'After due date (> 2 days)',
    'Owner + Admin',
    'Yes',
    'Escalates to Admin when an activity remains incomplete past SLA.'
  );

  insertRule.run(
    'rule_3',
    'Won Deal Delivery Handoff Alert',
    'On Opportunity Won',
    'Handoff Owner + Sales',
    'Yes',
    'Creates delivery handoff task when deal stage is transitioned to Won.'
  );

  // 9. Seed Recruitment Module
  db.prepare(`
    INSERT INTO recruitment_partners (id, name, website, contact_name, contact_email, phone, status, payroll_model, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'part_1',
    'Apex Talent Solutions',
    'https://apextalent.example.com',
    'Vikram Malhotra',
    'vikram@apextalent.example.com',
    '+91 98111 22334',
    'Approved',
    'Partner Payroll',
    'Approved for tier-1 IT staffing requisitions.'
  );

  db.prepare(`
    INSERT INTO recruitment_jobs (id, title, department, location, type, payroll_type, status, openings, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'job_1',
    'Senior SAP S/4HANA Consultant',
    'Enterprise Consulting',
    'Bengaluru (Hybrid)',
    'Full-Time',
    'Xunaris Payroll',
    'Approved',
    2,
    'Seeking seasoned consultant with 5+ years of SAP implementation experience.'
  );

  db.prepare(`
    INSERT INTO recruitment_candidates (id, job_id, job_title, name, email, phone, resume_score, interview_score, ai_summary, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'cand_1',
    'job_1',
    'Senior SAP S/4HANA Consultant',
    'Kavita Sharma',
    'kavita.sharma@example.com',
    '+91 99887 76655',
    92,
    88,
    'Strong SAP FICO and S/4HANA migration experience with 8+ years in global consulting firms.',
    'Shortlisted'
  );

  console.log('[Seed] Database initialization completed successfully!');
};
