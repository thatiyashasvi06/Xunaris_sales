-- Xunaris + HYRA Connect Mini CRM Database Schema
-- Version 1.0 Specification Compliant

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- 1. Users Table (ADMIN and USER roles, function access: Sales, Marketing, Both)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('ADMIN', 'USER')),
    department TEXT NOT NULL,
    function_access TEXT NOT NULL CHECK(function_access IN ('Sales', 'Marketing', 'Both')),
    scope_enforcement TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Service Catalog (Vertical specific active services)
CREATE TABLE IF NOT EXISTS service_catalog (
    id TEXT PRIMARY KEY,
    vertical_code TEXT NOT NULL CHECK(vertical_code IN ('XUN', 'HYRA')),
    service_code TEXT NOT NULL,
    display_label TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vertical_code, service_code)
);

-- 3. Shared Companies Directory
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY, -- CMP-000001
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    website TEXT,
    normalized_domain TEXT,
    industry TEXT,
    city TEXT,
    country TEXT,
    business_unit TEXT DEFAULT 'Both',
    account_owner TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Archived')),
    notes TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Shared Contacts Directory
CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY, -- CON-000001
    company_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    title TEXT,
    email TEXT,
    normalized_email TEXT,
    phone TEXT,
    normalized_phone TEXT,
    relationship TEXT DEFAULT 'Decision maker',
    consent_status TEXT DEFAULT 'Verified contacts',
    status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Archived')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT
);

-- 5. Leads Table (Immutable vertical-prefixed IDs: XUN-LD-000001 / HYRA-LD-000001)
CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    business_vertical_code TEXT NOT NULL CHECK(business_vertical_code IN ('XUN', 'HYRA')),
    business_vertical_name TEXT NOT NULL,
    service TEXT NOT NULL,
    service_description TEXT, -- for 'Other'
    company_name TEXT NOT NULL,
    company_website TEXT,
    industry TEXT,
    city TEXT,
    country TEXT,
    contact_name TEXT NOT NULL,
    job_title TEXT,
    work_email TEXT,
    phone TEXT,
    lead_source TEXT NOT NULL,
    campaign_id TEXT,
    campaign_name TEXT,
    requirement_summary TEXT,
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK(priority IN ('Low', 'Medium', 'High')),
    lead_status TEXT NOT NULL DEFAULT 'New' CHECK(lead_status IN ('New', 'Contacted', 'Qualified', 'Nurture', 'Disqualified')),
    disqualification_reason TEXT,
    nurture_reason TEXT,
    owner_id TEXT,
    owner_name TEXT,
    owner_email TEXT,
    next_followup_date TEXT,
    notes TEXT,
    company_id TEXT,
    contact_id TEXT,
    opportunity_id TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
);

-- 6. Opportunities Table (XUN-OP-000001 / HYRA-OP-000001)
CREATE TABLE IF NOT EXISTS opportunities (
    id TEXT PRIMARY KEY,
    lead_id TEXT,
    business_vertical_code TEXT NOT NULL CHECK(business_vertical_code IN ('XUN', 'HYRA')),
    business_vertical_name TEXT NOT NULL,
    title TEXT NOT NULL,
    service TEXT NOT NULL,
    company_id TEXT,
    company_name TEXT NOT NULL,
    contact_id TEXT,
    contact_name TEXT,
    owner_id TEXT,
    owner_name TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'Discovery' CHECK(stage IN ('Discovery', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost')),
    stage_entered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expected_value REAL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'INR',
    expected_close_date TEXT,
    probability_percentage INTEGER DEFAULT 20,
    loss_reason TEXT CHECK(loss_reason IS NULL OR loss_reason IN ('Price', 'Timing', 'No Response', 'Competition', 'Scope', 'Other')),
    loss_notes TEXT,
    handoff_owner TEXT,
    handoff_due_date TEXT,
    handoff_status TEXT DEFAULT 'None' CHECK(handoff_status IN ('None', 'Pending', 'Accepted', 'Overdue')),
    handoff_accepted_at DATETIME,
    handoff_accepted_by TEXT,
    handoff_notes TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
);

-- 7. Proposals Table (Versioned PDF/DOCX metadata)
CREATE TABLE IF NOT EXISTS proposals (
    id TEXT PRIMARY KEY,
    opportunity_id TEXT NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    file_name TEXT NOT NULL,
    file_path TEXT,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    sent_date TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Sent' CHECK(status IN ('Draft', 'Sent', 'Accepted', 'Declined')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
);

-- 8. Activities Table (Calls, emails, meetings, tasks)
CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    related_type TEXT NOT NULL CHECK(related_type IN ('Lead', 'Opportunity', 'Company', 'Internal')),
    related_id TEXT,
    related_to TEXT NOT NULL,
    activity_type TEXT NOT NULL CHECK(activity_type IN ('Call', 'Email', 'Meeting', 'Task', 'Note')),
    subject TEXT NOT NULL,
    date_time TEXT NOT NULL,
    assigned_to TEXT NOT NULL,
    assigned_user_id TEXT,
    status TEXT NOT NULL DEFAULT 'Planned' CHECK(status IN ('Planned', 'Completed', 'Cancelled')),
    outcome TEXT,
    next_followup TEXT,
    reminder TEXT DEFAULT '1 day before',
    result TEXT,
    completed_at DATETIME,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. Marketing Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    campaign_name TEXT NOT NULL,
    business_vertical_code TEXT NOT NULL CHECK(business_vertical_code IN ('XUN', 'HYRA')),
    business_vertical_name TEXT NOT NULL,
    service TEXT NOT NULL,
    channel TEXT NOT NULL CHECK(channel IN ('Email', 'LinkedIn', 'Event', 'Referral', 'Website', 'Other')),
    audience TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT,
    owner_name TEXT NOT NULL,
    owner_id TEXT,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft', 'Active', 'Paused', 'Completed')),
    template TEXT,
    consent_policy TEXT DEFAULT 'Verified contacts',
    budget REAL DEFAULT 0,
    currency TEXT DEFAULT 'INR',
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    leads_created_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. Campaign Responses Table
CREATE TABLE IF NOT EXISTS campaign_responses (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_name TEXT,
    response_date TEXT NOT NULL,
    outcome TEXT NOT NULL,
    linked_lead_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (linked_lead_id) REFERENCES leads(id) ON DELETE SET NULL
);

-- 11. Handoffs Table (Won opportunity to delivery operation)
CREATE TABLE IF NOT EXISTS handoffs (
    id TEXT PRIMARY KEY,
    opportunity_id TEXT NOT NULL,
    handoff_owner TEXT NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Accepted', 'Overdue')),
    confirmed_scope TEXT,
    accepted_by TEXT,
    accepted_at DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
);

-- 12. Notifications Table (In-app alerts)
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_email TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK(type IN ('info', 'alert', 'success', 'warning')),
    link TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 13. Email Outbox Table (Outbox pattern with retry backoff)
CREATE TABLE IF NOT EXISTS email_outbox (
    id TEXT PRIMARY KEY,
    idempotency_key TEXT UNIQUE NOT NULL,
    sender TEXT NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_text TEXT NOT NULL,
    body_html TEXT,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Processing', 'Sent', 'Failed')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    last_error TEXT,
    next_retry_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 14. Import Jobs & Rows Table
CREATE TABLE IF NOT EXISTS import_jobs (
    id TEXT PRIMARY KEY,
    importer_email TEXT NOT NULL,
    file_name TEXT NOT NULL,
    total_rows INTEGER NOT NULL DEFAULT 0,
    valid_rows INTEGER NOT NULL DEFAULT 0,
    skipped_rows INTEGER NOT NULL DEFAULT 0,
    error_rows INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Previewed', 'Committed', 'Failed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS import_rows (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    row_number INTEGER NOT NULL,
    raw_data TEXT NOT NULL,
    validation_status TEXT NOT NULL CHECK(validation_status IN ('Valid', 'Warning', 'Error')),
    error_reason TEXT,
    committed_lead_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES import_jobs(id) ON DELETE CASCADE
);

-- 15. Audit Events Table (Immutable compliance events)
CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 16. Automation Rules Configuration
CREATE TABLE IF NOT EXISTS automation_rules (
    id TEXT PRIMARY KEY,
    rule_name TEXT NOT NULL,
    trigger_event TEXT NOT NULL,
    recipient_type TEXT NOT NULL,
    enabled TEXT NOT NULL DEFAULT 'Yes' CHECK(enabled IN ('Yes', 'No')),
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 17. HYRA Connect Staffing Module Tables
CREATE TABLE IF NOT EXISTS recruitment_partners (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    website TEXT,
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'Rejected')),
    payroll_model TEXT NOT NULL DEFAULT 'Partner Payroll' CHECK(payroll_model IN ('Partner Payroll', 'Xunaris Payroll')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recruitment_recruiters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    agency_id TEXT,
    agency_name TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Invited', 'Suspended')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recruitment_jobs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    department TEXT NOT NULL,
    location TEXT NOT NULL,
    type TEXT NOT NULL,
    payroll_type TEXT NOT NULL CHECK(payroll_type IN ('Xunaris Payroll', 'Partner Payroll')),
    partner_id TEXT,
    partner_name TEXT,
    recruiter_email TEXT,
    status TEXT NOT NULL DEFAULT 'Pending Approval' CHECK(status IN ('Pending Approval', 'Approved', 'Rejected', 'Closed')),
    description TEXT,
    requirements TEXT,
    openings INTEGER DEFAULT 1,
    ai_screening_enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recruitment_candidates (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    job_title TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    resume_score INTEGER DEFAULT 0,
    interview_score INTEGER DEFAULT 0,
    ai_summary TEXT,
    status TEXT NOT NULL DEFAULT 'Applied' CHECK(status IN ('Applied', 'Screened', 'Shortlisted', 'Interviewed', 'Hired', 'Rejected')),
    payroll_model TEXT NOT NULL DEFAULT 'Xunaris Payroll',
    resume_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES recruitment_jobs(id) ON DELETE CASCADE
);

-- 17. Authorized Sender Accounts (Multi-Identity Outbound Email Configuration)
CREATE TABLE IF NOT EXISTS sender_accounts (
    id TEXT PRIMARY KEY,
    business_vertical TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    provider TEXT DEFAULT 'SMTP',
    smtp_host TEXT,
    smtp_port INTEGER DEFAULT 587,
    smtp_secure INTEGER DEFAULT 0,
    smtp_user TEXT,
    smtp_pass TEXT,
    is_verified INTEGER DEFAULT 0,
    verification_status TEXT DEFAULT 'Not Configured',
    verification_error TEXT,
    last_verified_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 18. Campaign Delivery Logs (Per-recipient delivery status and provider tracing)
CREATE TABLE IF NOT EXISTS campaign_delivery_logs (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    campaign_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    recipient_company TEXT,
    recipient_source TEXT DEFAULT 'Manual',
    recipient_type TEXT DEFAULT 'TO' CHECK(recipient_type IN ('TO', 'CC', 'BCC')),
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Sent' CHECK(status IN ('Queued', 'Sent', 'Delivered', 'Failed', 'Bounced')),
    provider_message_id TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 19. Campaign Templates (Official and Custom Responsive Email Templates)
CREATE TABLE IF NOT EXISTS campaign_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    business_vertical TEXT NOT NULL DEFAULT 'Both',
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    category TEXT DEFAULT 'Executive Outreach',
    is_official INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_vertical ON leads(business_vertical_code);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_owner ON leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_owner ON opportunities(owner_id);
CREATE INDEX IF NOT EXISTS idx_activities_related ON activities(related_id);
CREATE INDEX IF NOT EXISTS idx_outbox_status ON email_outbox(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_email);
CREATE INDEX IF NOT EXISTS idx_camp_logs_cid ON campaign_delivery_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_camp_logs_status ON campaign_delivery_logs(status);
CREATE INDEX IF NOT EXISTS idx_camp_logs_recipient ON campaign_delivery_logs(recipient_email);

-- 20. AI Sales Agent (HYRA Connect): settings, scoring, outreach sequences, bookings, learning
CREATE TABLE IF NOT EXISTS agent_settings (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    enabled INTEGER NOT NULL DEFAULT 0,
    mode TEXT NOT NULL DEFAULT 'approval' CHECK(mode IN ('approval', 'auto')),
    daily_send_limit INTEGER NOT NULL DEFAULT 20,
    min_score INTEGER NOT NULL DEFAULT 60,
    target_industries TEXT NOT NULL DEFAULT '[]',
    target_titles TEXT NOT NULL DEFAULT '[]',
    sender_email TEXT NOT NULL DEFAULT 'sales@hyraconnect.com',
    last_run_at DATETIME,
    last_learned_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO agent_settings (id) VALUES (1);

CREATE TABLE IF NOT EXISTS agent_lead_scores (
    lead_id TEXT PRIMARY KEY,
    score INTEGER NOT NULL,
    tier TEXT NOT NULL,
    reasons TEXT NOT NULL DEFAULT '[]',
    features TEXT NOT NULL DEFAULT '[]',
    scored_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agent_outreach (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    step_no INTEGER NOT NULL,
    channel TEXT NOT NULL CHECK(channel IN ('Email', 'LinkedIn')),
    subject TEXT,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending Approval' CHECK(status IN ('Pending Approval', 'Approved', 'Sent', 'Task Created', 'Replied', 'Skipped', 'Failed')),
    scheduled_for DATETIME NOT NULL,
    sent_at DATETIME,
    replied_at DATETIME,
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agent_meetings (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'Link Sent' CHECK(status IN ('Link Sent', 'Booked', 'Cancelled')),
    slot_start DATETIME,
    slot_end DATETIME,
    booked_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agent_weights (
    feature TEXT PRIMARY KEY,
    adjustment INTEGER NOT NULL DEFAULT 0,
    samples INTEGER NOT NULL DEFAULT 0,
    success_rate REAL NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ran_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    scored INTEGER DEFAULT 0,
    drafted INTEGER DEFAULT 0,
    sent INTEGER DEFAULT 0,
    note TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_outreach_lead ON agent_outreach(lead_id);
CREATE INDEX IF NOT EXISTS idx_agent_outreach_status ON agent_outreach(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_agent_scores_score ON agent_lead_scores(score);

-- Sales Agent suppression list: these people / domains are never contacted
CREATE TABLE IF NOT EXISTS agent_suppressions (
    value TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK(kind IN ('email', 'domain')),
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
