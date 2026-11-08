/**
 * Utility for opening the user's default email client or Gmail compose window
 * with pre-filled From, To, Subject, and Body fields.
 */

export const SENDER_ACCOUNTS = [
  {
    id: 'acc_hyra',
    email: 'sales@hyraconnect.com',
    displayName: 'HYRA Connect Sales',
    brand: 'HYRA Connect',
    color: '#6d28d9'
  },
  {
    id: 'acc_xunaris',
    email: 'sales@xunaris.com',
    displayName: 'Xunaris Sales',
    brand: 'Xunaris',
    color: '#0d2238'
  }
];

/**
 * Builds a Gmail Web compose URL
 * Uses authuser parameter to pre-select the authorized official account if logged in.
 */
export const buildGmailComposeUrl = ({ senderEmail, to, subject, body, cc, bcc }) => {
  const params = new URLSearchParams();
  params.append('view', 'cm');
  params.append('fs', '1');

  // Note: authuser is omitted because external domains (e.g. sales@xunaris.com) cause Google
  // to trigger an account redirect that wipes out the to, su, and body parameters.

  if (to) {
    const toStr = Array.isArray(to) ? to.filter(Boolean).join(', ') : to;
    params.append('to', toStr.trim());
  }

  if (subject) {
    params.append('su', subject.trim());
  }

  if (body) {
    params.append('body', body);
  }

  if (cc) {
    const ccStr = Array.isArray(cc) ? cc.filter(Boolean).join(', ') : cc;
    params.append('cc', ccStr.trim());
  }

  if (bcc) {
    const bccStr = Array.isArray(bcc) ? bcc.filter(Boolean).join(', ') : bcc;
    params.append('bcc', bccStr.trim());
  }

  return `https://mail.google.com/mail/?${params.toString()}`;
};

/**
 * Builds an Outlook Office 365 Web compose URL (Enterprise Microsoft 365)
 */
export const buildOutlookOfficeUrl = ({ to, subject, body, cc, bcc }) => {
  const toStr = Array.isArray(to) ? to.filter(Boolean).join(';') : (to || '').trim();
  const params = new URLSearchParams();
  if (toStr) params.append('to', toStr);
  if (subject) params.append('subject', subject.trim());
  if (body) params.append('body', body);
  if (cc) {
    const ccStr = Array.isArray(cc) ? cc.filter(Boolean).join(';') : cc;
    params.append('cc', ccStr.trim());
  }
  if (bcc) {
    const bccStr = Array.isArray(bcc) ? bcc.filter(Boolean).join(';') : bcc;
    params.append('bcc', bccStr.trim());
  }
  return `https://outlook.office.com/mail/deeplink/compose?${params.toString()}`;
};

/**
 * Builds an Outlook Live / Hotmail Web compose URL
 */
export const buildOutlookLiveUrl = ({ to, subject, body, cc, bcc }) => {
  const toStr = Array.isArray(to) ? to.filter(Boolean).join(';') : (to || '').trim();
  const params = new URLSearchParams();
  if (toStr) params.append('to', toStr);
  if (subject) params.append('subject', subject.trim());
  if (body) params.append('body', body);
  return `https://outlook.live.com/mail/0/deeplink/compose?${params.toString()}`;
};

/**
 * Builds an RFC 6068 mailto: URI for default desktop email applications (Outlook, Apple Mail, Thunderbird, Windows Mail)
 */
export const buildMailtoUrl = ({ senderEmail, to, subject, body, cc, bcc }) => {
  const toStr = Array.isArray(to) ? to.filter(Boolean).join('; ') : (to || '');
  const cleanTo = toStr.trim();
  const queryParts = [];

  if (subject) {
    queryParts.push(`subject=${encodeURIComponent(subject.trim())}`);
  }

  if (body) {
    queryParts.push(`body=${encodeURIComponent(body)}`);
  }

  if (senderEmail) {
    // RFC 6068 permits 'from' in header fields for compatible mail agents
    queryParts.push(`from=${encodeURIComponent(senderEmail.trim())}`);
  }

  if (cc) {
    const ccStr = Array.isArray(cc) ? cc.filter(Boolean).join('; ') : cc;
    queryParts.push(`cc=${encodeURIComponent(ccStr.trim())}`);
  }

  if (bcc) {
    const bccStr = Array.isArray(bcc) ? bcc.filter(Boolean).join('; ') : bcc;
    queryParts.push(`bcc=${encodeURIComponent(bccStr.trim())}`);
  }

  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  return `mailto:${cleanTo}${queryString}`;
};

/**
 * Sanitizes and cleans HTML specifically for Microsoft Outlook rendering.
 * Strips @keyframes CSS animations (which Outlook unsupported and dumps as raw visible text)
 * and wraps any <style> blocks in HTML comments (<!-- -->) so Outlook does not display CSS code.
 */
export const cleanHtmlForOutlook = (html) => {
  if (!html) return '';
  // 1. Remove @keyframes blocks entirely (email clients don't support CSS animations, and Outlook displays them as plain text)
  let cleaned = html.replace(/@keyframes\s+[\s\S]*?\}\s*\}/gi, '');
  // 2. Wrap any <style> tags with HTML comments <!-- --> if not already wrapped
  cleaned = cleaned.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (match, attrs, css) => {
    const trimmed = css.trim();
    if (trimmed.startsWith('<!--') || trimmed.includes('<!--')) return match;
    return `<style${attrs}>\n  <!--\n${trimmed}\n  -->\n</style>`;
  });
  return cleaned;
};

/**
 * Generates and downloads a standard RFC 822 .eml draft file with X-Unsent: 1 header.
 * When opened, Microsoft Outlook immediately launches its native compose window with
 * the FULL RICH HTML template rendered in the body (not plain text).
 */
export const downloadOutlookEmlDraft = ({ to, subject, htmlBody, from = '' }) => {
  const toStr = Array.isArray(to) ? to.filter(Boolean).join('; ') : (to || '').trim();
  const cleanSubject = (subject || 'Email Draft').trim();
  const sanitizedHtml = cleanHtmlForOutlook(htmlBody || '<p></p>');

  // RFC 822 format with X-Unsent: 1 for Outlook draft compose mode
  const emlLines = [
    'X-Unsent: 1',
    toStr ? `To: ${toStr}` : '',
    from ? `From: ${from}` : '',
    `Subject: ${cleanSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    sanitizedHtml
  ].filter(line => line !== '');

  const emlContent = emlLines.join('\r\n');
  const blob = new Blob([emlContent], { type: 'message/rfc822' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeFilename = `${cleanSubject.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 50)}.eml`;
  a.download = safeFilename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);

  return {
    success: true,
    filename: safeFilename,
    method: 'Outlook HTML Draft (.eml)'
  };
};

/**
 * Copies rich HTML to the system clipboard as 'text/html'.
 * When pasted (Ctrl+V) into Outlook, it renders the rich graphical HTML template directly.
 */
export const copyRichHtmlToClipboard = async (htmlContent, plainTextFallback = '') => {
  const plainText = plainTextFallback || (htmlContent ? htmlContent.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim() : '');

  // Method 1: Synchronous oncopy event interception (Industry standard, 100% reliable in Chromium)
  let copySuccessful = false;
  const onCopyHandler = (e) => {
    e.preventDefault();
    if (e.clipboardData) {
      e.clipboardData.setData('text/html', htmlContent);
      e.clipboardData.setData('text/plain', plainText);
      copySuccessful = true;
    }
  };

  try {
    document.addEventListener('copy', onCopyHandler);
    document.execCommand('copy');
    document.removeEventListener('copy', onCopyHandler);
    if (copySuccessful) {
      return true;
    }
  } catch (err) {
    document.removeEventListener('copy', onCopyHandler);
    console.warn('oncopy interception failed:', err);
  }

  // Method 2: Modern Async Clipboard API with text/html Blob
  if (navigator.clipboard && window.ClipboardItem) {
    try {
      const blobHtml = new Blob([htmlContent], { type: 'text/html' });
      const blobText = new Blob([plainText], { type: 'text/plain' });
      const item = new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText
      });
      await navigator.clipboard.write([item]);
      return true;
    } catch (err) {
      console.warn('ClipboardItem write failed:', err);
    }
  }

  return false;
};

/**
 * Launches the email compose window in Microsoft Outlook (Desktop or Office 365 Web) or Gmail.
 */
export const launchEmailCompose = ({
  method = 'outlook', // 'outlook' | 'outlook-web' | 'gmail' | 'default'
  senderEmail = 'sales@hyraconnect.com',
  to = '',
  subject = '',
  body = '',
  cc = '',
  bcc = ''
}) => {
  const toClean = Array.isArray(to) ? to.filter(Boolean).join('; ') : (to || '').trim();

  if (method === 'outlook-web' || method === 'office365') {
    const url = buildOutlookOfficeUrl({ to: toClean, subject, body, cc, bcc });
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    return {
      success: true,
      method: 'Outlook Web (Office 365)',
      url,
      winOpened: Boolean(win)
    };
  } else if (method === 'outlook-live') {
    const url = buildOutlookLiveUrl({ to: toClean, subject, body, cc, bcc });
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    return {
      success: true,
      method: 'Outlook Live',
      url,
      winOpened: Boolean(win)
    };
  } else if (method === 'gmail') {
    const url = buildGmailComposeUrl({ senderEmail, to: toClean.replace(/;/g, ','), subject, body, cc, bcc });
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    return {
      success: true,
      method: 'Gmail Web Compose',
      url,
      winOpened: Boolean(win)
    };
  } else {
    // Default desktop client: Microsoft Outlook (via standard mailto protocol)
    const url = buildMailtoUrl({ senderEmail, to: toClean, subject, body, cc, bcc });
    const a = document.createElement('a');
    a.href = url;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
    }, 500);

    return {
      success: true,
      method: 'Microsoft Outlook (Desktop)',
      url
    };
  }
};
