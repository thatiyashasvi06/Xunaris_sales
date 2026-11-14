/**
 * One place that talks to Google Gemini. It tries the configured model first, then current
 * fallbacks, remembers the one that works, and never throws: callers get null and use their
 * built-in rules instead. Set GEMINI_API_KEY (and optionally GEMINI_MODEL) in the environment.
 */

const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

let workingModel = null;
let lastError = '';
let lastOkAt = null;

export const geminiConfigured = () => Boolean(process.env.GEMINI_API_KEY);

export const geminiStatus = () => ({
  configured: geminiConfigured(),
  model: workingModel,
  lastError,
  lastOkAt
});

const parseJsonText = (text) => {
  const cleaned = String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
};

/** Ask for a JSON answer. Returns the parsed object, or null if AI is off or unavailable. */
export const askGeminiJson = async (prompt, { timeoutMs = 20000 } = {}) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const all = [process.env.GEMINI_MODEL, ...FALLBACK_MODELS].filter(Boolean);
  const order = workingModel ? [workingModel, ...all.filter((m) => m !== workingModel)] : [...new Set(all)];

  for (const model of order) {
    try {
      const base = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
      const res = await fetch(`${base}/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.4 }
        }),
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (res.status === 404) { lastError = `Model ${model} is not available.`; continue; } // try the next model
      if (!res.ok) { lastError = `Gemini answered ${res.status}.`; return null; } // key, quota or outage: stop, use rules
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = parseJsonText(text);
      workingModel = model;
      lastError = '';
      lastOkAt = new Date().toISOString();
      return parsed;
    } catch (e) {
      lastError = e.name === 'TimeoutError' ? 'Gemini took too long.' : `Gemini error: ${e.message}`;
      return null;
    }
  }
  return null;
};
