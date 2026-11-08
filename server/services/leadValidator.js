import db from '../db/database.js';

export const validateLeadPayload = (data) => {
  const errors = [];

  // 1. Vertical blank
  const vertical = (data.businessVerticalCode || data.businessVertical || '').trim().toUpperCase();
  if (!vertical || (vertical !== 'XUN' && vertical !== 'HYRA' && vertical !== 'XUNARIS' && vertical !== 'HYRA CONNECT')) {
    errors.push({ field: 'businessVertical', message: 'Select Xunaris or HYRA Connect.' });
  }

  const verticalCode = (vertical === 'HYRA' || vertical === 'HYRA CONNECT') ? 'HYRA' : 'XUN';

  // 2. Service mismatch
  const service = (data.service || '').trim();
  if (!service) {
    errors.push({ field: 'service', message: 'Choose a service available for the selected business vertical.' });
  } else {
    // Check against active service catalog
    const validService = db.prepare(`
      SELECT id FROM service_catalog 
      WHERE vertical_code = ? AND display_label = ? AND is_active = 1
    `).get(verticalCode, service);

    if (!validService && service.toLowerCase() !== 'other') {
      errors.push({ field: 'service', message: 'Choose a service available for the selected business vertical.' });
    }
  }

  // 3. Missing company/contact
  const companyName = (data.companyName || '').trim();
  const contactName = (data.contactName || '').trim();
  if (!companyName || !contactName) {
    errors.push({ field: 'companyContact', message: 'Enter the company name and contact name.' });
  }

  // 4. No email or phone
  const workEmail = (data.workEmail || '').trim().toLowerCase();
  const phone = (data.phone || '').trim();
  if (!workEmail && !phone) {
    errors.push({ field: 'contactMethod', message: 'Enter at least one contact method: work email or phone.' });
  }

  // 5. Invalid email format
  if (workEmail) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(workEmail)) {
      errors.push({ field: 'workEmail', message: 'Enter a valid work email address.' });
    }
  }

  // 6. Inactive owner check
  if (data.ownerEmail || data.ownerId) {
    const owner = db.prepare(`
      SELECT status FROM users WHERE email = ? OR id = ?
    `).get(data.ownerEmail, data.ownerId);

    if (owner && owner.status === 'Inactive') {
      errors.push({ field: 'ownerEmail', message: 'Selected owner is inactive. Choose another user.' });
    }
  }

  // 7. Campaign mismatch check
  if (data.campaignId || data.campaignName) {
    const campaign = db.prepare(`
      SELECT business_vertical_code FROM campaigns WHERE id = ? OR campaign_name = ?
    `).get(data.campaignId, data.campaignName);

    if (campaign && campaign.business_vertical_code !== verticalCode) {
      errors.push({ field: 'campaign', message: 'Campaign and lead must belong to the same business vertical.' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalized: {
      verticalCode,
      verticalName: verticalCode === 'XUN' ? 'Xunaris Services' : 'HYRA Connect',
      service,
      companyName,
      contactName,
      workEmail,
      phone
    }
  };
};

export const checkPossibleDuplicate = (companyName, workEmail, phone) => {
  const normName = (companyName || '').trim().toLowerCase();
  const normEmail = (workEmail || '').trim().toLowerCase();
  const normPhone = (phone || '').replace(/[^0-9]/g, '');

  let existingCompany = null;
  if (normName) {
    existingCompany = db.prepare(`
      SELECT * FROM companies WHERE LOWER(name) = ? OR LOWER(normalized_name) = ?
    `).get(normName, normName);
  }

  let existingContact = null;
  if (normEmail) {
    existingContact = db.prepare(`
      SELECT * FROM contacts WHERE LOWER(email) = ? OR LOWER(normalized_email) = ?
    `).get(normEmail, normEmail);
  } else if (normPhone) {
    existingContact = db.prepare(`
      SELECT * FROM contacts WHERE normalized_phone = ?
    `).get(normPhone);
  }

  if (existingContact || existingCompany) {
    return {
      isDuplicateCandidate: true,
      existingCompany,
      existingContact,
      message: 'Possible existing contact found. Review and link, or keep separate with a reason.'
    };
  }

  return { isDuplicateCandidate: false };
};
