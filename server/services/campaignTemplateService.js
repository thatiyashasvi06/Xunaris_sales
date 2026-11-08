/**
 * Official Email Campaign Template Service for Xunaris & HYRA Connect
 * Compliant with Specification Requirements:
 * 1. Fully responsive table-based HTML email templates
 * 2. Inlined CSS for universal rendering (Gmail, Outlook, Apple Mail, Yahoo)
 * 3. Dynamic personalization tags ({{contact_name}}, {{company_name}}, {{owner_name}}, {{sender_email}})
 * 4. Dual-branding support (Xunaris Technology Services & HYRA Connect)
 * 5. Text fallback for multipart MIME compliance
 */

export const OFFICIAL_TEMPLATES = [
  {
    id: 'tmpl_xunaris_enterprise',
    name: 'Xunaris Enterprise Cloud & Modernization (Official HTML)',
    businessVertical: 'Xunaris',
    defaultSubject: 'Executive Briefing: Modernizing Enterprise Infrastructure for {{company_name}}',
    category: 'Enterprise Technology Services',
    ctaText: 'Schedule 15-Min Executive Briefing',
    ctaUrl: 'https://xunaris.com/briefing',
    highlights: [
      { title: 'Cloud Architecture & Migration', desc: 'Secure enterprise workload modernization across AWS, Azure, and Google Cloud.' },
      { title: 'Legacy Modernization & Microservices', desc: 'Accelerating monolithic decoupling and continuous delivery pipelines by 40%.' },
      { title: 'SAP S/4HANA & ERP Transformation', desc: 'Dedicated implementation and custom enterprise integration practices.' },
      { title: 'Dedicated Global Engineering Pods', desc: 'Senior software architects with 24/7 delivery and strict SLA commitments.' }
    ],
    defaultBody: `We are reaching out from Xunaris Technology Services regarding enterprise cloud transformation and digital software architecture tailored for {{company_name}}.

Our specialized engineering practices have recently enabled enterprise clients to accelerate digital delivery timelines while reducing infrastructure overhead.

Would your leadership team have 15 minutes this Thursday or next Tuesday for a high-level briefing to review capability synergies?`
  },
  {
    id: 'tmpl_hyra_workforce',
    name: 'HYRA Connect Specialized Technical Workforce (Official HTML)',
    businessVertical: 'HYRA Connect',
    defaultSubject: 'Specialized Engineering & Technical Talent Solutions for {{company_name}}',
    category: 'Workforce & Talent Partnerships',
    ctaText: 'Explore Technical Talent Solutions',
    ctaUrl: 'https://hyraconnect.com/talent',
    highlights: [
      { title: 'High-Velocity Technical Sourcing', desc: 'Pre-vetted senior software engineers, cloud architects, and niche specialists.' },
      { title: '48-Hour Candidate Deployment', desc: 'Rapid interview turnaround and onboarding for critical project milestones.' },
      { title: 'Flexible Global Delivery Models', desc: 'Contract staffing, contract-to-hire, and dedicated offshore/nearshore pods.' },
      { title: 'Enterprise Compliance & Payroll', desc: 'Full vendor governance across India, North America, and EMEA regions.' }
    ],
    defaultBody: `I hope this note finds you well. I lead enterprise talent solutions at HYRA Connect.

We specialize in high-velocity sourcing for senior technical and niche talent across Fortune 500 organizations, with an active pool of pre-vetted engineers ready for deployment at {{company_name}}.

Are your engineering and procurement teams currently exploring technical contract staffing or dedicated engineering pod support?`
  },
  {
    id: 'tmpl_portfolio_intro',
    name: 'Xunaris & HYRA Connect Joint Capabilities Briefing',
    businessVertical: 'Both',
    defaultSubject: 'Enterprise Capabilities Briefing: Technology Services & Engineering Talent for {{company_name}}',
    category: 'Executive Partnership',
    ctaText: 'View Executive Capabilities Deck',
    ctaUrl: 'https://xunaris.com/capabilities',
    highlights: [
      { title: 'End-to-End Technology Solutions', desc: 'Custom enterprise software engineering, cloud migration, and architecture.' },
      { title: 'Specialized Workforce Scaling', desc: 'On-demand senior technical talent and dedicated delivery pods.' },
      { title: 'Proven Track Record', desc: 'Trusted by tier-1 global enterprises for high-stakes digital programs.' }
    ],
    defaultBody: `We noticed {{company_name}}'s ongoing expansion in technology operations and digital platforms.

Our joint practices across Xunaris Technology Services and HYRA Connect support enterprise leaders with both strategic digital engineering and high-velocity technical talent deployment.

We would be pleased to share our executive capability deck and discuss how we can support your upcoming technology roadmap.`
  }
];

/**
 * Compiles a rich, responsive, inline-styled HTML email
 */
export const compileOfficialEmailHtml = ({
  templateId,
  subject,
  bodyText,
  businessUnit = 'HYRA Connect',
  senderAccount = 'sales@hyraconnect.com',
  recipient = {},
  ownerName = 'Sales Team',
  ctaText,
  ctaUrl,
  isCustomTemplate = false
}) => {
  const isHyra = (businessUnit === 'HYRA Connect' || senderAccount.includes('hyra'));
  const activeTemplate = OFFICIAL_TEMPLATES.find(t => t.id === templateId) || 
    (isHyra ? OFFICIAL_TEMPLATES[1] : OFFICIAL_TEMPLATES[0]);

  const contactName = recipient.name || 'Valued Partner';
  const companyName = recipient.company || 'Enterprise Partner';
  const targetEmail = recipient.email || '';

  // Dynamic token replacement
  const replaceTokens = (text) => {
    if (!text) return '';
    return text
      .replace(/\{\{Contact\.Name\}\}/g, contactName)
      .replace(/\{\{contact_name\}\}/g, contactName)
      .replace(/\{\{Company\.Name\}\}/g, companyName)
      .replace(/\{\{company_name\}\}/g, companyName)
      .replace(/\{\{owner_name\}\}/g, ownerName)
      .replace(/\{\{sender_email\}\}/g, senderAccount)
      .replace(/\{\{email\}\}/g, targetEmail)
      .replace(/\{\{vertical\}\}/g, isHyra ? 'HYRA Connect' : 'Xunaris');
  };

  // If custom template provided, return the full customized HTML directly with tokens replaced
  const trimmed = (bodyText || '').trim();
  const hasFullHtmlStructure = trimmed.toLowerCase().startsWith('<!doctype html') || 
                               trimmed.toLowerCase().startsWith('<html') || 
                               (trimmed.startsWith('<') && (trimmed.includes('<table') || trimmed.includes('<body') || trimmed.includes('<style')));

  if (isCustomTemplate || hasFullHtmlStructure) {
    return replaceTokens(bodyText);
  }

  const processedBody = replaceTokens(bodyText || activeTemplate.defaultBody);
  const processedSubject = replaceTokens(subject || activeTemplate.defaultSubject);
  const processedCtaText = replaceTokens(ctaText || activeTemplate.ctaText);
  const processedCtaUrl = ctaUrl || activeTemplate.ctaUrl;

  // Paragraphs formatting
  const formattedParagraphs = processedBody
    .split(/\n\s*\n/)
    .map(p => `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.65; color: #334155;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  // Brand palettes
  const primaryColor = isHyra ? '#7c3aed' : '#0063f2';
  const secondaryColor = isHyra ? '#1e1b4b' : '#0d2238';
  const accentLight = isHyra ? '#f5f3ff' : '#eff6ff';
  const accentBorder = isHyra ? '#ddd6fe' : '#bfdbfe';
  const brandTitle = isHyra ? 'HYRA CONNECT' : 'XUNARIS';
  const brandSubtitle = isHyra ? 'SPECIALIZED TECHNICAL WORKFORCE & TALENT' : 'TECHNOLOGY SERVICES & CLOUD ARCHITECTURE';
  const websiteUrl = isHyra ? 'https://hyraconnect.com' : 'https://xunaris.com';
  const unsubscribeEmail = isHyra ? 'unsubscribe@hyraconnect.com' : 'unsubscribe@xunaris.com';

  const highlightsHtml = (activeTemplate.highlights || []).map(h => `
    <tr>
      <td style="padding: 10px 14px; background: ${accentLight}; border: 1px solid ${accentBorder}; border-radius: 8px; margin-bottom: 8px;">
        <div style="font-size: 13px; font-weight: 700; color: ${secondaryColor}; margin-bottom: 2px;">
          ✓ ${replaceTokens(h.title)}
        </div>
        <div style="font-size: 12px; color: #475569; line-height: 1.45;">
          ${replaceTokens(h.desc)}
        </div>
      </td>
    </tr>
    <tr><td style="height: 6px;"></td></tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${processedSubject}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    a { color: ${primaryColor}; text-decoration: underline; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
      .email-padding { padding: 20px 16px !important; }
      .cta-button { width: 100% !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f1f5f9;">

  <!-- Hidden Preheader Preview Text -->
  <div style="display: none; font-size: 1px; color: #f1f5f9; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${processedSubject} • Executive briefing for ${companyName}
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" style="padding: 12px;">
        
        <!-- Main Card Container (600px Max Width) -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
          
          <!-- Brand Header Banner -->
          <tr>
            <td style="background-color: ${secondaryColor}; padding: 28px 36px; text-align: left; border-bottom: 4px solid ${primaryColor};">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <div style="display: inline-block; vertical-align: middle;">
                      <span style="font-size: 22px; font-weight: 900; letter-spacing: 1.5px; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                        ${brandTitle}
                      </span>
                      <div style="font-size: 10px; font-weight: 700; letter-spacing: 1.8px; color: #94a3b8; text-transform: uppercase; margin-top: 3px;">
                        ${brandSubtitle}
                      </div>
                    </div>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="font-size: 11px; font-weight: 800; color: #ffffff; background: rgba(255, 255, 255, 0.12); padding: 5px 12px; border-radius: 20px; letter-spacing: 0.5px; border: 1px solid rgba(255, 255, 255, 0.2);">
                      OFFICIAL OUTREACH
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td class="email-padding" style="padding: 36px 36px 28px 36px; background-color: #ffffff;">
              
              <!-- Salutation -->
              <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 18px;">
                Dear ${contactName},
              </div>

              <!-- Main Paragraphs -->
              ${formattedParagraphs}

              <!-- Capabilities Highlight Grid -->
              ${highlightsHtml ? `
              <div style="margin: 24px 0 20px 0;">
                <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 10px;">
                  Key Strategic Practice Highlights
                </div>
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  ${highlightsHtml}
                </table>
              </div>
              ` : ''}

              <!-- Prominent CTA Button -->
              <div style="margin: 32px 0 28px 0; text-align: left;">
                <table border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="background-color: ${primaryColor}; border-radius: 12px; box-shadow: 0 4px 14px rgba(0, 99, 242, 0.25);">
                      <a href="${processedCtaUrl}" target="_blank" class="cta-button" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: 800; color: #ffffff; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: 0.3px;">
                        ${processedCtaText} &rarr;
                      </a>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Executive Sign-off Block -->
              <div style="border-top: 1px solid #e2e8f0; padding-top: 22px; margin-top: 28px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td>
                      <div style="font-size: 14px; font-weight: 800; color: #0f172a;">
                        ${ownerName}
                      </div>
                      <div style="font-size: 12px; font-weight: 600; color: #475569; margin-top: 2px;">
                        ${isHyra ? 'Talent Partnerships Director • HYRA Connect' : 'Practice Lead • Enterprise Technology Services'}
                      </div>
                      <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                        Authorized Sender: <a href="mailto:${senderAccount}" style="color: ${primaryColor}; text-decoration: none; font-weight: 600;">${senderAccount}</a> • <a href="${websiteUrl}" style="color: ${primaryColor}; text-decoration: none;">${websiteUrl.replace('https://', '')}</a>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

            </td>
          </tr>

          <!-- Standard Compliance & Security Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 36px; border-top: 1px solid #e2e8f0; text-align: left;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-size: 11px; line-height: 1.6; color: #94a3b8;">
                    <strong>Security &amp; Origin:</strong> This message was dispatched directly from the authorized official sender <strong>${senderAccount}</strong> via Xunaris HYRA CRM v2.0 Enterprise.<br/>
                    <strong>Office Locations:</strong> Bangalore, India • Wilmington, Delaware, USA.<br/>
                    <strong>Recipient Privacy:</strong> You received this briefing because your organization engages in enterprise technology operations. To stop receiving future capability updates, <a href="mailto:${unsubscribeEmail}?subject=Unsubscribe%20${encodeURIComponent(targetEmail)}" style="color: #64748b; text-decoration: underline;">click here to unsubscribe</a> or reply with 'Unsubscribe'.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
};

/**
 * Compiles a clean plaintext alternative for MIME compliance
 */
export const compileOfficialEmailText = ({
  templateId,
  subject,
  bodyText,
  businessUnit = 'HYRA Connect',
  senderAccount = 'sales@hyraconnect.com',
  recipient = {},
  ownerName = 'Sales Team',
  ctaText,
  ctaUrl
}) => {
  const isHyra = (businessUnit === 'HYRA Connect' || senderAccount.includes('hyra'));
  const activeTemplate = OFFICIAL_TEMPLATES.find(t => t.id === templateId) || 
    (isHyra ? OFFICIAL_TEMPLATES[1] : OFFICIAL_TEMPLATES[0]);

  const contactName = recipient.name || 'Valued Partner';
  const companyName = recipient.company || 'Enterprise Partner';
  const targetEmail = recipient.email || '';

  const replaceTokens = (text) => {
    if (!text) return '';
    return text
      .replace(/\{\{Contact\.Name\}\}/g, contactName)
      .replace(/\{\{contact_name\}\}/g, contactName)
      .replace(/\{\{Company\.Name\}\}/g, companyName)
      .replace(/\{\{company_name\}\}/g, companyName)
      .replace(/\{\{owner_name\}\}/g, ownerName)
      .replace(/\{\{sender_email\}\}/g, senderAccount)
      .replace(/\{\{email\}\}/g, targetEmail)
      .replace(/\{\{vertical\}\}/g, isHyra ? 'HYRA Connect' : 'Xunaris');
  };

  let rawBody = bodyText || activeTemplate.defaultBody;
  if (rawBody && (rawBody.includes('<!DOCTYPE') || rawBody.includes('<html') || rawBody.includes('<table') || rawBody.includes('<body'))) {
    rawBody = rawBody
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#8199;|&zwnj;/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const processedBody = replaceTokens(rawBody);
  const processedCtaText = replaceTokens(ctaText || activeTemplate.ctaText);
  const processedCtaUrl = ctaUrl || activeTemplate.ctaUrl;

  const highlights = (activeTemplate.highlights || [])
    .map(h => `• ${replaceTokens(h.title)}: ${replaceTokens(h.desc)}`)
    .join('\n');

  return `[${isHyra ? 'HYRA CONNECT' : 'XUNARIS TECHNOLOGY SERVICES'}]
Official Executive Outreach

Dear ${contactName},

${processedBody}

${highlights ? `KEY PRACTICE HIGHLIGHTS:\n${highlights}\n` : ''}
${processedCtaText}: ${processedCtaUrl}

Best regards,
${ownerName}
${isHyra ? 'Talent Partnerships Director • HYRA Connect' : 'Practice Lead • Enterprise Technology Services'}
Authorized Sender: ${senderAccount}
Website: ${isHyra ? 'https://hyraconnect.com' : 'https://xunaris.com'}

---
Offices: Bangalore, India • Wilmington, Delaware, USA
To unsubscribe, reply with 'Unsubscribe' or write to ${isHyra ? 'unsubscribe@hyraconnect.com' : 'unsubscribe@xunaris.com'}.`;
};
