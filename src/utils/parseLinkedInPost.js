/**
 * Reads the text of a pasted LinkedIn post and suggests Add Lead form values.
 * Plain pattern matching: no AI service, nothing leaves the browser.
 * Returns { fields, found, check, hints }:
 *   fields: values to put in the form (only what was recognised)
 *   found:  labels read directly from the text
 *   check:  labels that were guessed and should be double checked
 *   hints:  short notes for the user
 */

const FREE_MAIL = ['gmail.com', 'yahoo.com', 'yahoo.in', 'outlook.com', 'hotmail.com', 'live.com', 'rediffmail.com', 'icloud.com', 'proton.me', 'protonmail.com', 'aol.com'];

const CITIES = [
  'Lucknow', 'Noida', 'Gurgaon', 'Gurugram', 'New Delhi', 'Delhi', 'Mumbai', 'Pune', 'Bengaluru', 'Bangalore', 'Hyderabad',
  'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Chandigarh', 'Indore', 'Kochi', 'Coimbatore', 'Nagpur', 'Bhopal', 'Vadodara',
  'Surat', 'Visakhapatnam', 'Thiruvananthapuram', 'Mysuru', 'Mysore'
];

const ROLE_WORDS = /(manager|recruit|hr\b|human resources|talent|director|head|lead\b|officer|executive|founder|ceo|cto|coo|consultant|specialist|partner|president|vp\b|recruiter|sourcer|associate)/i;
const COMPANY_SUFFIX = /([A-Z][\w&.-]*(?:\s+[A-Z][\w&.-]*){0,3}\s+(?:Inc\.?|Ltd\.?|LLC|LLP|Pvt\.?\s*Ltd\.?|Technologies|Technology|Placements?|Solutions|Consulting|Services|Systems|Staffing|Recruitment|Global|Corp\.?))/;

const titleCase = (s) => s.replace(/[._-]+/g, ' ').trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
const looksLikeName = (s) => /^[A-Za-z][A-Za-z.'-]*(?:\s+[A-Za-z][A-Za-z.'-]*){0,3}$/.test(s) && s.length <= 40 && !/\d|@/.test(s);

export const parseLinkedInPost = (raw) => {
  const text = String(raw || '').replace(/\r/g, '').trim();
  const fields = {};
  const found = [];
  const check = [];
  const hints = [];
  if (!text) return { fields, found, check, hints };

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // Email
  const email = (text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/) || [])[0];
  const domain = email ? email.split('@')[1].toLowerCase() : '';
  const domainRoot = domain && !FREE_MAIL.includes(domain) ? domain.split('.')[0] : '';
  if (email) { fields.workEmail = email.toLowerCase(); found.push('Email'); }

  // Phone (international with +, or an Indian mobile number)
  const noEmail = text.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, ' ');
  const phone = (noEmail.match(/\+\d{1,3}[\s-]?\d{2,5}[\s-]?\d{3,5}[\s-]?\d{0,5}/) || noEmail.match(/\b[6-9]\d{4}[\s-]?\d{5}\b/) || [])[0];
  if (phone) { fields.phone = phone.replace(/\s+/g, ' ').trim(); found.push('Phone'); }

  // Website from a company email domain
  if (domainRoot) { fields.companyWebsite = `https://${domain}`; check.push('Website'); }

  // Profile link, kept in the notes
  const profile = (text.match(/https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/[^\s)]+/i) || [])[0];

  // Name, title and company from a signature such as "Regards / Name / Title | Company"
  let title = '';
  let company = '';
  let name = '';
  const sigIdx = lines.findIndex((l) => /^(thanks(?: and| &)? regards|best regards|warm regards|kind regards|regards|thanks|thank you|sincerely|cheers)[,.!]?$/i.test(l));
  if (sigIdx >= 0 && lines[sigIdx + 1] && looksLikeName(lines[sigIdx + 1])) {
    name = lines[sigIdx + 1];
    const next = lines[sigIdx + 2] || '';
    const parts = next.split(/\s*\|\s*|\s+at\s+|\s+@\s+/);
    if (next && !/@|:/.test(next) && ROLE_WORDS.test(parts[0])) {
      title = parts[0].trim();
      if (parts[1]) company = parts[1].trim();
    }
  }
  // A copied profile header: "Name" then a headline line
  if (!name && lines.length > 1 && looksLikeName(lines[0]) && lines[0].split(/\s+/).length >= 2 && ROLE_WORDS.test(lines[1]) && lines[1].length < 120) {
    name = lines[0];
    const parts = lines[1].split(/\s+at\s+|\s+@\s+|\s*\|\s*/);
    title = parts[0].trim();
    if (parts[1]) company = parts[1].trim();
  }
  if (name) { fields.contactName = name; found.push('Contact name'); }
  else if (email) {
    const local = email.split('@')[0].replace(/\d+/g, '');
    if (local.length > 1) { fields.contactName = titleCase(local); check.push('Contact name'); }
  }
  if (title) { fields.jobTitle = title.slice(0, 100); found.push('Job title'); }

  // Company: signature, then a name ending in Inc/Ltd/Technologies..., then "at X", then the email domain
  const candidates = [];
  if (company) candidates.push(company);
  const suffix = (text.match(COMPANY_SUFFIX) || [])[0];
  if (suffix) candidates.push(suffix);
  const atMatch = (text.match(/\bat\s+([A-Z][A-Za-z0-9&.-]*(?:\s+[A-Z][A-Za-z0-9&.-]*)?)/) || [])[1];
  if (atMatch) candidates.push(atMatch);
  let pickedCompany = candidates.find(Boolean) || '';
  if (pickedCompany && domainRoot) {
    const words = pickedCompany.split(/\s+/);
    const root = words.find((w) => w.toLowerCase().replace(/[^a-z0-9]/g, '').startsWith(domainRoot.replace(/[^a-z0-9]/g, '')));
    if (root && words.length > 1 && !COMPANY_SUFFIX.test(pickedCompany)) pickedCompany = root;
  }
  if (pickedCompany) {
    fields.companyName = pickedCompany.replace(/[,;:]+$/, '').replace(/(?<!\b(?:Inc|Ltd|Corp))\.$/i, '').trim();
    (company ? found : check).push('Company');
  } else if (domainRoot) {
    fields.companyName = titleCase(domainRoot);
    check.push('Company');
  }

  // City and country
  const cityHit = CITIES.find((c) => new RegExp(`\\b${c}\\b`, 'i').test(text));
  fields.city = cityHit || '';
  if (cityHit) found.push('City');
  if (cityHit || /\+91\b|pan[- ]india|\bindia\b/i.test(text)) fields.country = 'India';

  // Service guess for HYRA Connect
  fields.businessVertical = 'HYRA Connect';
  let service = '';
  if (/sub-?vendor|recruitment (agenc|partner)|vendor list|staffing partner|business association/i.test(text)) service = 'Recruitment Services';
  else if (/\bc2c\b|corp[- ]to[- ]corp|contract|bench/i.test(text)) service = 'Contract Staffing';
  else if (/\bbpo\b|voice (process|support)|customer service|non[- ]?it|telecaller|data entry|back office/i.test(text)) service = 'Non-IT Staffing';
  else if (/developer|engineer|software|java\b|python|react|\.net|devops|cloud|\bsap\b|\bit staffing\b|testing|\bqa\b/i.test(text)) service = 'IT Staffing';
  else if (/permanent|full[- ]?time|direct hire/i.test(text)) service = 'Permanent Staffing';
  if (service) { fields.service = service; check.push('Service'); }

  // Priority, source, requirement and notes
  if (/urgent|immediate|asap|walk-?in/i.test(text)) { fields.priority = 'High'; check.push('Priority'); }
  fields.leadSource = 'LinkedIn';
  const cleaned = text.replace(/#[\w-]+/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  fields.requirementSummary = cleaned.slice(0, 900);
  found.push('Requirement');

  const partner = /sub-?vendor|recruitment (agenc|partner)|vendor list|staffing partner|business association|distribution list/i.test(text);
  fields.notes = ['Source: LinkedIn post (pasted).', profile ? `Profile: ${profile}` : '', partner ? 'This looks like a partnership or vendor-list post, not a client requirement.' : ''].filter(Boolean).join(' ');
  if (partner) hints.push('This looks like a partnership or vendor-list post, not a client requirement. Reply to what the post asks for.');
  if (!email && !phone) hints.push('No email or phone found. Add one before saving: the CRM needs at least one.');

  return { fields, found, check, hints };
};
