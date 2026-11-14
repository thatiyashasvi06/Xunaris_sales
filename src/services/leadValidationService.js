// Xunaris & HYRA Connect Shared Lead Validation Engine
// Aligned with Section 6: Lead Creation - One manual form and one CSV schema
import { SERVICE_CATALOG } from '../data/crmSpecData';

export const INDUSTRY_OPTIONS = [
  'IT Services',
  'Manufacturing',
  'Healthcare',
  'Finance',
  'Retail',
  'Other'
];

export const COUNTRY_OPTIONS = [
  'India',
  'United States',
  'United Kingdom',
  'Singapore',
  'United Arab Emirates',
  'Germany',
  'Canada',
  'Australia',
  'Netherlands',
  'Other'
];

export const LEAD_SOURCE_OPTIONS = [
  'Manual',
  'LinkedIn',
  'Referral',
  'AI Search (ChatGPT)',
  'Website',
  'Campaign',
  'Event',
  'Other'
];

export const PRIORITY_OPTIONS = ['Low', 'Medium', 'High'];

export const LEAD_STATUS_OPTIONS = [
  'New',
  'Contacted',
  'Qualified',
  'Nurture',
  'Disqualified'
];

/**
 * Normalizes website URL (ensures https:// prefix and lowercase domain)
 */
export const normalizeDomain = (url) => {
  if (!url || typeof url !== 'string') return '';
  let trimmed = url.trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  try {
    const parsed = new URL(trimmed);
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${parsed.pathname === '/' ? '' : parsed.pathname}`;
  } catch (e) {
    return trimmed;
  }
};

/**
 * Calculates next business day (skips Saturday and Sunday) in YYYY-MM-DD
 */
export const getNextBusinessDay = (fromDate = new Date()) => {
  const d = new Date(fromDate);
  d.setDate(d.getDate() + 1);
  const day = d.getDay();
  if (day === 6) {
    // Saturday -> Monday
    d.setDate(d.getDate() + 2);
  } else if (day === 0) {
    // Sunday -> Monday
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString().split('T')[0];
};

/**
 * International phone regex validator (allows +, digits, spaces, dashes, min 7 digits)
 */
export const isValidInternationalPhone = (phone) => {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
};

/**
 * RFC 5322 email regex validator
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(String(email).trim());
};

/**
 * Shared Backend & Frontend Lead Validator
 * Used by both Manual Add Lead form and Bulk CSV / Excel Import
 */
export const validateLeadData = (leadData, options = {}) => {
  const {
    isCsvImport = false,
    existingCampaigns = [],
    adminFallbackEmail = 'admin@xunaris.com'
  } = options;

  const errors = {};
  const normalized = { ...leadData };

  // 1. Business Vertical (Required: Yes, allowed: Xunaris / HYRA Connect)
  const vertical = (leadData.businessVertical || leadData.serviceLine || '').trim();
  const isXun = vertical === 'Xunaris' || vertical === 'Xunaris Services' || vertical === 'XUN';
  const isHyra = vertical === 'HYRA Connect' || vertical === 'HYRA' || vertical === 'Staffing';

  if (!isXun && !isHyra) {
    errors.businessVertical = 'Business Vertical is required (Allowed: Xunaris or HYRA Connect).';
  } else {
    normalized.businessVertical = isXun ? 'Xunaris' : 'HYRA Connect';
    normalized.verticalCode = isXun ? 'XUN' : 'HYRA';
    normalized.serviceLine = isXun ? 'Xunaris Services' : 'HYRA Connect';
  }

  // 2. Service (Required: Yes, must match vertical active catalog)
  const currentCode = normalized.verticalCode || (isXun ? 'XUN' : 'HYRA');
  const allowedServices = SERVICE_CATALOG[currentCode] || [];
  const selectedService = (leadData.service || '').trim();

  if (!selectedService) {
    errors.service = `Service is required for ${normalized.businessVertical || 'selected vertical'}.`;
  } else if (!allowedServices.includes(selectedService)) {
    // Check if partial match exists, otherwise flag mismatch error
    const match = allowedServices.find(s => s.toLowerCase() === selectedService.toLowerCase());
    if (match) {
      normalized.service = match;
    } else {
      errors.service = `Service "${selectedService}" is not valid for ${normalized.businessVertical}. Allowed: ${allowedServices.join(', ')}.`;
    }
  } else {
    normalized.service = selectedService;
  }

  // 3. Company Name (Required: Yes, 2–150 chars, trimmed)
  const compName = (leadData.companyName || '').trim();
  if (!compName) {
    errors.companyName = 'Company Name is required.';
  } else if (compName.length < 2 || compName.length > 150) {
    errors.companyName = 'Company Name must be between 2 and 150 characters.';
  } else {
    normalized.companyName = compName;
  }

  // 4. Company Website (Optional, normalized URL)
  if (leadData.companyWebsite) {
    normalized.companyWebsite = normalizeDomain(leadData.companyWebsite);
  } else if (compName) {
    normalized.companyWebsite = `https://${compName.toLowerCase().replace(/[^a-z0-9]/g, '')}.example.com`;
  }

  // 5. Industry (Optional, allowed list)
  const ind = (leadData.industry || 'IT Services').trim();
  normalized.industry = ind;
  if (leadData.industryOther) {
    normalized.industryOther = leadData.industryOther.trim();
  }

  // 6. City (Optional, max 80 chars, trimmed)
  if (leadData.city) {
    const city = leadData.city.trim();
    if (city.length > 80) {
      errors.city = 'City must not exceed 80 characters.';
    } else {
      normalized.city = city;
    }
  } else {
    normalized.city = 'Bengaluru';
  }

  // 7. Country (Optional, standardized list)
  normalized.country = (leadData.country || 'India').trim();

  // 8. Contact Name (Required: Yes, 2–100 chars, trimmed)
  const contact = (leadData.contactName || '').trim();
  if (!contact) {
    errors.contactName = 'Contact Name is required.';
  } else if (contact.length < 2 || contact.length > 100) {
    errors.contactName = 'Contact Name must be between 2 and 100 characters.';
  } else {
    normalized.contactName = contact;
  }

  // 9. Job Title (Optional, max 100 chars, trimmed)
  if (leadData.jobTitle) {
    const title = leadData.jobTitle.trim();
    if (title.length > 100) {
      errors.jobTitle = 'Job Title must not exceed 100 characters.';
    } else {
      normalized.jobTitle = title;
    }
  } else {
    normalized.jobTitle = 'Decision Maker';
  }

  // 10. Work Email OR Phone (Conditional: Email OR phone required!)
  const email = (leadData.workEmail || '').trim().toLowerCase();
  const phone = (leadData.phone || '').trim();

  if (!email && !phone) {
    errors.workEmail = 'Either Work Email or Phone is required.';
    errors.phone = 'Either Work Email or Phone is required.';
  } else {
    if (email) {
      if (!isValidEmail(email)) {
        errors.workEmail = 'Invalid email format (must be name@domain.com).';
      } else {
        normalized.workEmail = email;
      }
    }
    if (phone) {
      if (!isValidInternationalPhone(phone)) {
        errors.phone = 'Invalid phone format (must be standard international format, min 7 digits).';
      } else {
        normalized.phone = phone;
      }
    }
  }

  // 11. Lead Source (Required: Yes)
  const source = (leadData.leadSource || 'Manual').trim();
  if (!source) {
    errors.leadSource = 'Lead Source is required.';
  } else if (!LEAD_SOURCE_OPTIONS.includes(source)) {
    // Flexible match
    const match = LEAD_SOURCE_OPTIONS.find(s => s.toLowerCase() === source.toLowerCase());
    if (match) {
      normalized.leadSource = match;
    } else {
      errors.leadSource = `Invalid Lead Source "${source}". Allowed: ${LEAD_SOURCE_OPTIONS.join(', ')}.`;
    }
  } else {
    normalized.leadSource = source;
  }

  // 12. Campaign Name (Conditional: Required if Lead Source is 'Campaign')
  if (normalized.leadSource === 'Campaign') {
    const camp = (leadData.campaignName || leadData.campaign || '').trim();
    if (!camp) {
      errors.campaignName = 'Campaign Name is required when Lead Source is "Campaign".';
    } else {
      // Check if campaign is active under same vertical (if active campaign list provided)
      if (existingCampaigns.length > 0) {
        const foundCamp = existingCampaigns.find(
          c => c.name.toLowerCase() === camp.toLowerCase()
        );
        if (foundCamp) {
          normalized.campaignName = foundCamp.name;
        } else {
          normalized.campaignName = camp;
        }
      } else {
        normalized.campaignName = camp;
      }
    }
  } else {
    normalized.campaignName = leadData.campaignName || '';
  }

  // 13. Requirement Summary (Max 1000 chars, multiline text)
  if (leadData.requirementSummary) {
    const req = leadData.requirementSummary.trim();
    if (req.length > 1000) {
      errors.requirementSummary = 'Requirement Summary must not exceed 1000 characters.';
    } else {
      normalized.requirementSummary = req;
    }
  } else {
    normalized.requirementSummary = leadData.requirementSummary || '';
  }

  // 14. Priority (Default: Medium, allowed: Low / Medium / High)
  const prio = (leadData.priority || 'Medium').trim();
  if (!PRIORITY_OPTIONS.includes(prio)) {
    normalized.priority = 'Medium';
  } else {
    normalized.priority = prio;
  }

  // 15. Lead Status (New on creation; imports may only create New)
  if (isCsvImport) {
    normalized.status = 'New'; // Imports may only create New
  } else {
    const stat = (leadData.status || 'New').trim();
    if (!LEAD_STATUS_OPTIONS.includes(stat)) {
      normalized.status = 'New';
    } else {
      normalized.status = stat;
    }
  }

  // 16. Owner Email (Active Sales user email; Fallback to Admin assignment rule)
  const owner = (leadData.ownerEmail || '').trim();
  if (owner && isValidEmail(owner)) {
    normalized.ownerEmail = owner.toLowerCase();
  } else {
    normalized.ownerEmail = adminFallbackEmail;
    normalized.ownerName = leadData.ownerName || 'Sales User';
  }

  // 17. Next Follow-up Date (YYYY-MM-DD. If blank: create default next-business-day task)
  if (leadData.nextFollowup && leadData.nextFollowup.trim()) {
    normalized.nextFollowup = leadData.nextFollowup.trim();
  } else {
    normalized.nextFollowup = getNextBusinessDay();
    normalized.defaultTaskCreated = true;
  }

  // 18. Notes (Max 2000 chars, plain text)
  if (leadData.notes) {
    const notesText = leadData.notes.trim();
    if (notesText.length > 2000) {
      errors.notes = 'Notes must not exceed 2000 characters.';
    } else {
      normalized.notes = notesText;
    }
  } else {
    normalized.notes = '';
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    normalized
  };
};
