export const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Xunaris + HYRA Connect Mini CRM REST API",
    version: "1.0.0",
    description: "Official REST API documentation for the Xunaris CRM and HYRA Connect Staffing platform according to Consolidated Specification v1.0.",
    contact: {
      name: "Xunaris Engineering",
      url: "https://xunaris.com",
      email: "support@xunaris.com"
    }
  },
  servers: [
    {
      url: "http://localhost:5000",
      description: "Local Express Development Server"
    }
  ],
  tags: [
    { name: "Authentication", description: "Login, rate-limiting, and single-use password reset tokens" },
    { name: "Service Catalog", description: "Vertical-dependent active services (XUN vs HYRA)" },
    { name: "Companies & Contacts", description: "Shared multi-vertical account and contact master" },
    { name: "Leads", description: "Lead capture, sequential IDs, validation, and opportunity qualification" },
    { name: "Opportunities", description: "Deal pipeline, stage progression, won handoffs, and loss tracking" },
    { name: "Activities", description: "Calls, meetings, tasks, follow-up SLA tracking" },
    { name: "Campaigns", description: "Marketing email outreach and lead attribution" },
    { name: "Dashboard", description: "Real-time KPI metrics, 5-stage conversion funnel, and action center" },
    { name: "Reports", description: "Business intelligence summaries and live data exports" },
    { name: "Admin Settings", description: "User management, automation rules, email diagnostics, and audit logs" },
    { name: "Notifications", description: "In-app alerts and task reminder feeds" },
    { name: "HYRA Connect Recruitment", description: "Partner agency vetting, duplicate recruiter checks, jobs, and AI scoring" }
  ],
  paths: {
    "/api/health": {
      get: {
        tags: ["System"],
        summary: "API Health Check",
        responses: {
          200: {
            description: "System online status",
            content: { "application/json": { example: { status: "online", version: "1.0.0", app: "Xunaris + HYRA Connect Mini CRM API" } } }
          }
        }
      }
    },
    "/api/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Sign In with work email and password",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              example: { email: "admin@xunaris.com", password: "<your-password>" }
            }
          }
        },
        responses: {
          200: { description: "Login successful, returns JWT and user profile" },
          401: { description: "Invalid credentials" },
          429: { description: "Rate limit lockout active (5 failed attempts)" }
        }
      }
    },
    "/api/auth/reset": {
      post: {
        tags: ["Authentication"],
        summary: "Request expiring single-use reset token",
        requestBody: {
          required: true,
          content: { "application/json": { example: { email: "sales@xunaris.com" } } }
        },
        responses: {
          200: { description: "Returns single-use token expiring in 15 minutes" }
        }
      }
    },
    "/api/auth/reset-confirm": {
      post: {
        tags: ["Authentication"],
        summary: "Redeem reset token and set new password",
        requestBody: {
          required: true,
          content: { "application/json": { example: { token: "XUN-RST-XXXXX", newPassword: "NewSecurePassword2026!" } } }
        },
        responses: {
          200: { description: "Password updated, token burned" }
        }
      }
    },
    "/api/auth/users": {
      get: {
        tags: ["Authentication"],
        summary: "List active users for identity switching and owner selection",
        responses: {
          200: { description: "List of active users" }
        }
      }
    },
    "/api/catalog/services": {
      get: {
        tags: ["Service Catalog"],
        summary: "Get dependent services for a business vertical",
        parameters: [
          { name: "vertical", in: "query", schema: { type: "string", enum: ["XUN", "HYRA"] }, description: "Vertical code" }
        ],
        responses: {
          200: { description: "List of active service catalog entries" }
        }
      }
    },
    "/api/companies": {
      get: {
        tags: ["Companies & Contacts"],
        summary: "List all shared enterprise companies",
        responses: { 200: { description: "List of companies" } }
      },
      post: {
        tags: ["Companies & Contacts"],
        summary: "Create new company with domain deduplication",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              example: {
                name: "Apex Global Solutions",
                website: "https://apexglobal.com",
                industry: "IT Services",
                city: "Hyderabad",
                country: "India",
                businessUnit: "Both"
              }
            }
          }
        },
        responses: { 201: { description: "Company created with CMP-XXXXXX ID" } }
      }
    },
    "/api/companies/contacts": {
      get: {
        tags: ["Companies & Contacts"],
        summary: "List contacts optionally filtered by company ID",
        parameters: [
          { name: "companyId", in: "query", schema: { type: "string" } }
        ],
        responses: { 200: { description: "List of contacts" } }
      },
      post: {
        tags: ["Companies & Contacts"],
        summary: "Add new contact under a company",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              example: {
                companyId: "CMP-000001",
                fullName: "Sunita Roy",
                title: "Head of Engineering",
                email: "sunita@example.com",
                phone: "+91 98765 00001"
              }
            }
          }
        },
        responses: { 201: { description: "Contact created with CON-XXXXXX ID" } }
      }
    },
    "/api/leads": {
      get: {
        tags: ["Leads"],
        summary: "List leads with filters (vertical, status, owner, search)",
        parameters: [
          { name: "vertical", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "owner", in: "query", schema: { type: "string" } },
          { name: "search", in: "query", schema: { type: "string" } }
        ],
        responses: { 200: { description: "List of leads" } }
      },
      post: {
        tags: ["Leads"],
        summary: "Create single lead with immutable sequence ID (XUN-LD / HYRA-LD)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              example: {
                businessVerticalCode: "XUN",
                service: "SAP Services",
                companyName: "Zenith Cloud Tech",
                contactName: "Arjun Verma",
                workEmail: "arjun@zenith.com",
                phone: "+91 99001 12233",
                leadSource: "LinkedIn",
                priority: "High",
                requirementSummary: "Migration of on-prem ERP to SAP S/4HANA Cloud"
              }
            }
          }
        },
        responses: {
          201: { description: "Lead created, initial follow-up task logged, and alert queued" },
          400: { description: "Validation errors according to specification" }
        }
      }
    },
    "/api/leads/{id}/qualify": {
      post: {
        tags: ["Leads"],
        summary: "Atomically qualify lead and generate linked Opportunity (XUN-OP / HYRA-OP)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              example: {
                requirementSummary: "Scope verified. Budget approved for proposal.",
                expectedValue: 1500000,
                expectedCloseDate: "2026-11-30"
              }
            }
          }
        },
        responses: {
          200: { description: "Lead marked Qualified and linked Opportunity created" },
          400: { description: "Missing requirement summary or already qualified" }
        }
      }
    },
    "/api/opportunities": {
      get: {
        tags: ["Opportunities"],
        summary: "List commercial deals and opportunities",
        responses: { 200: { description: "List of opportunities" } }
      },
      post: {
        tags: ["Opportunities"],
        summary: "Create new opportunity",
        responses: { 201: { description: "Opportunity created" } }
      }
    },
    "/api/opportunities/{id}/stage": {
      patch: {
        tags: ["Opportunities"],
        summary: "Advance deal stage (Discovery, Proposal, Negotiation, Won, Lost)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              example: {
                newStage: "Won",
                handoffOwner: "Operations Lead",
                handoffDueDate: "2026-11-10",
                handoffNotes: "Client signed enterprise agreement"
              }
            }
          }
        },
        responses: {
          200: { description: "Stage updated and handoff scheduled if Won" },
          400: { description: "Gating rules violation (e.g. Won without handoff)" }
        }
      }
    },
    "/api/opportunities/handoffs/{id}/accept": {
      patch: {
        tags: ["Opportunities"],
        summary: "Accept delivery handoff for Won deal and create first 30-day client task",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Handoff accepted" } }
      }
    },
    "/api/activities": {
      get: {
        tags: ["Activities"],
        summary: "List customer touchpoints (Calls, Meetings, Tasks, Emails)",
        responses: { 200: { description: "List of activities" } }
      },
      post: {
        tags: ["Activities"],
        summary: "Log a new activity or schedule a task",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              example: {
                relatedTo: "Example Technologies",
                activityType: "Call",
                subject: "Scope clarification call",
                dateTime: "2026-10-25 15:00",
                assignedTo: "Sales User",
                status: "Planned"
              }
            }
          }
        },
        responses: { 201: { description: "Activity created" } }
      }
    },
    "/api/campaigns": {
      get: {
        tags: ["Campaigns"],
        summary: "List marketing outreach campaigns",
        responses: { 200: { description: "List of campaigns" } }
      },
      post: {
        tags: ["Campaigns"],
        summary: "Create marketing campaign",
        responses: { 201: { description: "Campaign created" } }
      }
    },
    "/api/campaigns/{id}/schedule": {
      post: {
        tags: ["Campaigns"],
        summary: "Schedule & activate campaign outreach",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Campaign scheduled and attribution active" } }
      }
    },
    "/api/dashboard": {
      get: {
        tags: ["Dashboard"],
        summary: "Get live KPI tiles, 5-stage conversion funnel, and action center",
        parameters: [
          { name: "vertical", in: "query", schema: { type: "string" } },
          { name: "service", in: "query", schema: { type: "string" } }
        ],
        responses: {
          200: { description: "Dashboard calculations and funnel aggregates" }
        }
      }
    },
    "/api/reports": {
      get: {
        tags: ["Reports"],
        summary: "Get filtered analytics reports and KPI summaries",
        responses: { 200: { description: "Report summary metrics" } }
      }
    },
    "/api/admin/users": {
      get: {
        tags: ["Admin Settings"],
        summary: "Admin only: List all system accounts",
        responses: { 200: { description: "List of users" } }
      },
      post: {
        tags: ["Admin Settings"],
        summary: "Admin only: Create new team member",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              example: {
                name: "Karan Singhania",
                email: "karan@xunaris.com",
                role: "USER",
                department: "Sales",
                functionAccess: "Sales"
              }
            }
          }
        },
        responses: { 201: { description: "User created" } }
      }
    },
    "/api/admin/rules": {
      get: {
        tags: ["Admin Settings"],
        summary: "Admin only: List automation rules and triggers",
        responses: { 200: { description: "List of automation rules" } }
      }
    },
    "/api/admin/rules/{id}/toggle": {
      post: {
        tags: ["Admin Settings"],
        summary: "Admin only: Toggle automation rule on or off",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Rule status toggled" } }
      }
    },
    "/api/admin/test-email": {
      post: {
        tags: ["Admin Settings"],
        summary: "Admin only: Dispatch system diagnostic email through outbox worker",
        responses: { 200: { description: "Diagnostic dispatched" } }
      }
    },
    "/api/admin/audit": {
      get: {
        tags: ["Admin Settings"],
        summary: "Admin only: View immutable audit logs",
        responses: { 200: { description: "Audit history" } }
      }
    },
    "/api/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "Get in-app alerts and notifications",
        responses: { 200: { description: "List of notifications" } }
      }
    },
    "/api/recruitment/jobs": {
      get: {
        tags: ["HYRA Connect Recruitment"],
        summary: "List staffing job requisitions with payroll model",
        responses: { 200: { description: "List of jobs" } }
      }
    },
    "/api/recruitment/candidates": {
      get: {
        tags: ["HYRA Connect Recruitment"],
        summary: "List candidate pipeline with AI resume and interview scores",
        responses: { 200: { description: "List of candidates" } }
      }
    }
  }
};
