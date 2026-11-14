import dns from 'dns/promises';
import net from 'net';
import db from '../db/database.js';
import { askGeminiJson, geminiConfigured } from './gemini.js';

/**
 * Website -> ideal customer profile.
 * Reads one public web page and writes who the company sells to in 3 lines, plus suggested
 * target industries and job titles. Uses Gemini when GEMINI_API_KEY is set, otherwise a keyword
 * heuristic, so it always works. The user reviews the result before it is applied.
 */

const INDUSTRY_WORDS = {
  'IT Services': ['it services', 'software', 'saas', 'technology', 'digital', 'cloud', 'cyber'],
  Healthcare: ['healthcare', 'hospital', 'medical', 'clinic', 'health care'],
  Pharma: ['pharma', 'life sciences', 'biotech'],
  BFSI: ['bfsi', 'banking', 'bank', 'finance', 'financial', 'insurance', 'fintech'],
  Manufacturing: ['manufacturing', 'factory', 'industrial', 'engineering'],
  Retail: ['retail', 'e-commerce', 'ecommerce', 'consumer'],
  Logistics: ['logistics', 'supply chain', 'transport', 'warehouse'],
  Telecom: ['telecom', 'telecommunications'],
  Education: ['education', 'edtech', 'university', 'training'],
  'Real Estate': ['real estate', 'construction', 'infrastructure'],
  Energy: ['energy', 'oil', 'gas', 'renewable', 'power'],
  Automotive: ['automotive', 'automobile', 'vehicle'],
  Hospitality: ['hospitality', 'hotel', 'travel', 'tourism'],
  Consulting: ['consulting', 'advisory', 'professional services']
};

// ----------------------------------------------------------------- safe fetch

const isPrivateIp = (ip) => {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80') || v.startsWith('::ffff:');
};

const assertPublicUrl = async (raw) => {
  let u;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { throw new Error('Enter a valid website address, for example hyraconnect.com'); }
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Only http and https addresses are allowed.');
  if (u.username || u.password) throw new Error('Addresses with a login are not allowed.');
  if (u.port && !['80', '443'].includes(u.port)) throw new Error('Only standard web ports are allowed.');
  const host = u.hostname;
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => []);
  if (!addrs.length) throw new Error('That website address could not be found.');
  if (addrs.some((a) => isPrivateIp(a.address))) throw new Error('That address is not a public website.');
  return u;
};

export const fetchPage = async (raw) => {
  let url = await assertPublicUrl(raw);
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'XunarisCRM-ICP/1.0', Accept: 'text/html,application/xhtml+xml' }
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = await assertPublicUrl(new URL(res.headers.get('location'), url).toString()); // re-check every redirect
      continue;
    }
    if (!res.ok) throw new Error(`The website answered with an error (${res.status}).`);
    if (!/html|text/i.test(res.headers.get('content-type') || '')) throw new Error('That address is not a web page.');
    const reader = res.body.getReader();
    const chunks = [];
    let size = 0;
    while (size < 1_000_000) { // read at most 1 MB
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); size += value.length;
    }
    reader.cancel().catch(() => {});
    return { url: url.toString(), html: Buffer.concat(chunks).toString('utf8') };
  }
  throw new Error('Too many redirects.');
};

// -------------------------------------------------------------------- analyse

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

export const extractText = (html) => {
  const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim());
  const desc = decode((html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i)?.[1] || '').trim());
  const body = decode(html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  return { title, desc, text: body.slice(0, 8000) };
};

/** Keyword fallback: no AI key needed. */
export const heuristicIcp = ({ title, desc, text }) => {
  const hay = `${title} ${desc} ${text}`.toLowerCase();
  const scored = Object.entries(INDUSTRY_WORDS)
    .map(([name, words]) => [name, words.reduce((n, w) => n + (hay.split(w).length - 1), 0)])
    .filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const industries = scored.slice(0, 4).map(([n]) => n);
  const staffing = /recruit|staffing|talent|hiring|manpower/.test(hay);
  const titles = staffing
    ? ['Head of HR', 'Head of Talent Acquisition', 'Hiring Manager', 'COO']
    : ['CEO', 'Director', 'Head of Operations', 'VP'];
  const offer = desc || title || 'the services described on the website';
  return {
    engine: 'Keyword analysis (add GEMINI_API_KEY for AI-written profiles)',
    summary: [
      `We sell: ${offer.slice(0, 160)}`,
      `Best fit: ${industries.length ? industries.join(', ') + ' companies' : 'companies in the industries named on the site'} that ${staffing ? 'hire often or need contract talent' : 'need what we offer'}.`,
      `Talk to: ${titles.join(', ')}.`
    ],
    industries,
    titles
  };
};

const geminiIcp = async (page) => {
  if (!geminiConfigured()) return null;
  const out = await askGeminiJson(
    `You are a B2B sales strategist. From this company website text, write the ideal customer profile for a salesperson.\nReturn JSON: {"summary":[3 short lines: what the company sells, which companies buy it and why, which job titles to contact],"industries":[up to 5 industry names],"titles":[up to 6 job titles]}.\nUse only what the text supports.\n\nTITLE: ${page.title}\nDESCRIPTION: ${page.desc}\nTEXT: ${page.text.slice(0, 6000)}`
  );
  if (!out) return null;
  const arr = (v, n) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, n) : []);
  const summary = arr(out.summary, 3);
  if (summary.length < 2) return null;
  return { engine: 'Gemini AI', summary, industries: arr(out.industries, 5), titles: arr(out.titles, 6) };
};

export const buildIcp = async (website) => {
  const page = await fetchPage(website);
  const content = extractText(page.html);
  if (content.text.length < 80 && !content.desc) {
    throw new Error('That page has almost no readable text (it may load its content with scripts). Try the website home page or an "About" page.');
  }
  const result = (await geminiIcp(content)) || heuristicIcp(content);
  return { website: page.url, ...result };
};

// ---------------------------------------------------------------- persistence

db.exec(`CREATE TABLE IF NOT EXISTS agent_icp (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  website_url TEXT, summary TEXT, engine TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

export const saveIcp = ({ website, summary, engine }) => {
  db.prepare(`
    INSERT INTO agent_icp (id, website_url, summary, engine, updated_at) VALUES (1, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET website_url = excluded.website_url, summary = excluded.summary, engine = excluded.engine, updated_at = CURRENT_TIMESTAMP
  `).run(website, JSON.stringify(summary), engine);
};

export const getIcp = () => {
  const r = db.prepare('SELECT * FROM agent_icp WHERE id = 1').get();
  return r ? { website: r.website_url, summary: JSON.parse(r.summary || '[]'), engine: r.engine, updated_at: r.updated_at } : null;
};
