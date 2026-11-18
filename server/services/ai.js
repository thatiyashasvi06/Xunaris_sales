import Anthropic from '@anthropic-ai/sdk';
import { askGeminiJson, geminiConfigured, geminiStatus } from './gemini.js';

/**
 * One place that asks an AI for a JSON answer. Order of engines:
 *   1. Gemini (set GEMINI_API_KEY)            <- the default first choice
 *   2. Claude (set ANTHROPIC_API_KEY, optional) <- only used if a key is set; costs nothing otherwise
 *   3. built-in rules (the callers' own fallback) <- always available
 * Set AI_PROVIDER=claude to try Claude first once a Claude key is available.
 * Every call returns { data, engine } or null, and never throws.
 */

const claudeState = { model: null, lastError: '', lastOkAt: null };
let client = null;

export const claudeConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);
const claudeModel = () => process.env.ANTHROPIC_MODEL || 'claude-opus-5-5';
const getClient = () => {
  if (!client) client = new Anthropic({ timeout: 45000, maxRetries: 1 }); // reads ANTHROPIC_API_KEY from the environment
  return client;
};

const extractJson = (text) => {
  const cleaned = String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(cleaned); } catch { /* look for the first JSON value inside the text */ }
  const m = cleaned.match(/[\[{][\s\S]*[\]}]/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
};

const requestBase = (prompt, effort) => ({
  model: claudeModel(),
  max_tokens: 16000,
  output_config: { effort },
  system: 'You are a JSON API inside a CRM. Reply with exactly one valid JSON value and nothing else: no commentary, no code fences.',
  messages: [{ role: 'user', content: prompt }]
});

const askClaudeJson = async (prompt, { effort = 'low' } = {}) => {
  if (!claudeConfigured()) return null;
  const c = getClient();
  try {
    let res;
    try {
      // Safety fallback is requested by default: if the model declines, the API retries on another model
      res = await c.beta.messages.create({ ...requestBase(prompt, effort), betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
    } catch (e) {
      if (!(e instanceof Anthropic.BadRequestError)) throw e;
      res = await c.messages.create(requestBase(prompt, effort)); // the plain request, if the extras are not accepted
    }
    if (res.stop_reason === 'refusal') { claudeState.lastError = 'Claude declined this request.'; return null; }
    if (res.stop_reason === 'max_tokens') { claudeState.lastError = 'Claude ran out of room.'; return null; }
    const text = (res.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    const parsed = extractJson(text);
    if (parsed === null) { claudeState.lastError = 'Claude did not return valid JSON.'; return null; }
    claudeState.model = res.model || claudeModel();
    claudeState.lastError = '';
    claudeState.lastOkAt = new Date().toISOString();
    return parsed;
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) claudeState.lastError = 'The Claude key was rejected.';
    else if (e instanceof Anthropic.PermissionDeniedError) claudeState.lastError = 'The Claude key may not use this model.';
    else if (e instanceof Anthropic.NotFoundError) claudeState.lastError = `Claude model ${claudeModel()} is not available.`;
    else if (e instanceof Anthropic.RateLimitError) claudeState.lastError = 'Claude is rate limited right now.';
    else if (e instanceof Anthropic.APIConnectionTimeoutError) claudeState.lastError = 'Claude took too long.';
    else if (e instanceof Anthropic.APIError) claudeState.lastError = `Claude answered ${e.status || 'with an error'}.`;
    else claudeState.lastError = `Claude error: ${e.message}`;
    return null;
  }
};

const order = () => (String(process.env.AI_PROVIDER || '').toLowerCase() === 'claude' ? ['claude', 'gemini'] : ['gemini', 'claude']);

/** Ask the available engines in order. `effort` (low/medium/high) only matters for Claude. */
export const askAiJson = async (prompt, opts = {}) => {
  for (const p of order()) {
    if (p === 'gemini' && geminiConfigured()) {
      const data = await askGeminiJson(prompt);
      if (data) return { data, engine: 'Gemini AI' };
    }
    if (p === 'claude' && claudeConfigured()) {
      const data = await askClaudeJson(prompt, opts);
      if (data) return { data, engine: 'Claude AI' };
    }
  }
  return null;
};

export const aiConfigured = () => geminiConfigured() || claudeConfigured();

export const aiStatus = () => {
  const g = geminiStatus();
  const providers = {
    gemini: { label: 'Gemini AI', configured: g.configured, model: g.model, lastError: g.lastError },
    claude: { label: 'Claude AI', configured: claudeConfigured(), model: claudeState.model || (claudeConfigured() ? claudeModel() : null), lastError: claudeState.lastError }
  };
  const candidates = order().filter((p) => providers[p].configured);
  const healthy = candidates.find((p) => !providers[p].lastError);
  const errors = candidates.map((p) => providers[p].lastError).filter(Boolean);
  return {
    engine: healthy ? providers[healthy].label : candidates.length ? 'Built-in rules (AI unavailable)' : 'Built-in rules',
    configured: candidates.length > 0,
    model: healthy ? providers[healthy].model : null,
    note: errors.join(' ') || (candidates.length ? '' : 'Add GEMINI_API_KEY (or ANTHROPIC_API_KEY) in the server settings for AI-written text.'),
    providers: Object.values(providers).map(({ label, configured, model }) => ({ label, configured, model }))
  };
};
