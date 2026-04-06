/* ═══════════════════════════════════════════
   Pastelette — AI Service
   Priority: 1. Session cache
             2. Preset palette map
             3. Pollinations.ai POST /openai
             4. Pollinations.ai GET (fallback)
             5. User Gemini/OpenAI key
             6. Algorithmic fallback
   ═══════════════════════════════════════════ */

'use strict';

// ─── Config ────────────────────────────────
const STORAGE_KEY_SERVICE = 'pst_api_service';
const STORAGE_KEY_KEY     = 'pst_api_key';
const SESSION_CACHE_KEY   = 'pst_cache';
const GEMINI_DEAD_KEY     = 'pst_gemini_dead';

const GEMINI_MODELS = [
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
];

// ─── Timeout wrapper ───────────────────────
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    ),
  ]);
}

// ─── Session Cache ──────────────────────────
function getCached(word) {
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    return cache[word.toLowerCase()] || null;
  } catch { return null; }
}

function setCache(word, result) {
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[word.toLowerCase()] = result;
    const keys = Object.keys(cache);
    if (keys.length > 30) delete cache[keys[0]];
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cache));
  } catch { /* ignore */ }
}

// ─── Gemini quota memory ────────────────────
// Once all Gemini models return 429, skip for this session
function isGeminiDead() {
  return sessionStorage.getItem(GEMINI_DEAD_KEY) === 'true';
}
function markGeminiDead() {
  sessionStorage.setItem(GEMINI_DEAD_KEY, 'true');
}

// ─── Parse AI response ─────────────────────
function parseAIResponse(text) {
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const obj = JSON.parse(objMatch[0]);
      const colors = obj.colors || obj.palette || obj.swatches;
      if (Array.isArray(colors) && colors.length >= 3) {
        return {
          colors: colors.map(normalizeColor),
          description: obj.description || obj.mood || null,
        };
      }
    } catch { /* try array fallback */ }
  }
  const arrMatch = text.match(/\[[\s\S]*?\]/);
  if (arrMatch) {
    try {
      const arr = JSON.parse(arrMatch[0]);
      if (Array.isArray(arr) && arr.length >= 3) {
        return { colors: arr.map(normalizeColor), description: null };
      }
    } catch { /* fall through */ }
  }
  throw new Error('No valid JSON found');
}

function normalizeColor(c) {
  const hex = (c.hex || c.color || c.value || '#AAAAAA').toUpperCase();
  return {
    hex:    ColorUtils.isValidHex(hex) ? hex : '#AAAAAA',
    name:   c.name   || c.title || 'Color',
    nameKo: c.nameKo || c.name_ko || c.korean || c.name || '색',
  };
}

// ═════════════════════════════════════════════
//  Pollinations.ai
// ═════════════════════════════════════════════
const POLL_SYSTEM = 'You are a color palette designer. Return ONLY valid JSON, no markdown.';

function pollPrompt(word) {
  return (
    `Word: "${word}". Create a 5-color palette. ` +
    `Vary saturation: dark(S25%,L20%), vivid(S70%,L45%), muted(S35%,L60%), soft(S15%,L78%), pale(S7%,L91%). ` +
    `Return JSON: {"description":"one sentence","colors":[{"hex":"#RRGGBB","name":"English","nameKo":"한국어"},..5]}`
  );
}

// Attempt 1: POST /openai — fast timeout (8s)
// If CORS blocks it, fails instantly. If server is slow, bail quickly.
async function pollPost(word) {
  console.log('[Pastelette] → Pollinations POST /openai');
  const res = await withTimeout(
    fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [
          { role: 'system', content: POLL_SYSTEM },
          { role: 'user',   content: pollPrompt(word) },
        ],
        seed: ColorUtils.hashWord(word) % 9999,
        jsonMode: true,
      }),
    }),
    8000
  );
  console.log('[Pastelette] POST status:', res.status);
  if (!res.ok) throw new Error(`POST ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || JSON.stringify(data);
  return parseAIResponse(text);
}

// Attempt 2: GET /{prompt} — longer timeout (25s), no CORS preflight
async function pollGet(word) {
  console.log('[Pastelette] → Pollinations GET');
  const prompt = `Create a 5-color palette for "${word}". Return only JSON: {"description":"sentence","colors":[{"hex":"#RRGGBB","name":"English","nameKo":"Korean"},{"hex":"#RRGGBB","name":"English","nameKo":"Korean"},{"hex":"#RRGGBB","name":"English","nameKo":"Korean"},{"hex":"#RRGGBB","name":"English","nameKo":"Korean"},{"hex":"#RRGGBB","name":"English","nameKo":"Korean"}]}`;
  const url =
    `https://text.pollinations.ai/${encodeURIComponent(prompt)}` +
    `?seed=${ColorUtils.hashWord(word) % 9999}&json=true&model=openai`;
  const res = await withTimeout(fetch(url), 25000);
  console.log('[Pastelette] GET status:', res.status);
  if (!res.ok) throw new Error(`GET ${res.status}`);
  const text = await res.text();
  return parseAIResponse(text);
}

async function callPollinationsAI(word) {
  // POST first (fast fail if CORS blocks)
  try {
    const result = await pollPost(word);
    console.log('[Pastelette] ✓ POST succeeded');
    return result;
  } catch (err) {
    console.warn('[Pastelette] POST failed:', err.message);
  }

  // GET fallback (no cooldown — different endpoint)
  try {
    const result = await pollGet(word);
    console.log('[Pastelette] ✓ GET succeeded');
    return result;
  } catch (err) {
    console.warn('[Pastelette] GET failed:', err.message);
    throw err;
  }
}

// ═════════════════════════════════════════════
//  Gemini API — skip if already known dead
// ═════════════════════════════════════════════
async function callGeminiAPI(word, apiKey) {
  if (isGeminiDead()) {
    console.log('[Pastelette] Gemini skipped (quota 0 this session)');
    throw new Error('Gemini quota exhausted (cached)');
  }

  const prompt =
    `단어 "${word}"의 의미, 감정, 연상 이미지를 분석하여 5가지 색채 팔레트를 생성하세요.\n` +
    `채도가 서로 크게 다른 색들을 조합하세요.\n` +
    `JSON만 반환: {"description":"한 문장","colors":[{"hex":"#RRGGBB","name":"English","nameKo":"한국어"},...5개]}`;

  let allQuotaDead = true;

  for (const model of GEMINI_MODELS) {
    console.log(`[Pastelette] → Gemini ${model}`);
    try {
      const res = await withTimeout(
        fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.85, maxOutputTokens: 500 },
            }),
          }
        ),
        10000
      );

      if (res.status === 429) {
        console.warn(`[Pastelette] ${model}: 429 quota exhausted`);
        continue;
      }

      allQuotaDead = false; // at least one model didn't 429

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`${res.status}: ${err.error?.message || `HTTP ${res.status}`}`);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log(`[Pastelette] ✓ Gemini ${model} succeeded`);
      return parseAIResponse(text);

    } catch (err) {
      if (err.message?.startsWith('429')) continue;
      allQuotaDead = false;
      throw err;
    }
  }

  // All models returned 429 → remember for this session
  if (allQuotaDead) {
    markGeminiDead();
    console.warn('[Pastelette] All Gemini models dead → skipping future calls this session');
  }

  throw new Error('All Gemini models exhausted');
}

// ─── OpenAI API ─────────────────────────────
async function callOpenAIAPI(word, apiKey) {
  console.log('[Pastelette] → OpenAI');
  const prompt =
    `단어 "${word}"를 색채로 번역하세요. 채도가 다양한 5색 팔레트를 생성하세요. ` +
    `JSON만 반환: {"description":"한 문장","colors":[{"hex":"#RRGGBB","name":"English","nameKo":"한국어"},...5개]}`;

  const res = await withTimeout(
    fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.85,
        max_tokens: 500,
      }),
    }),
    12000
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`${res.status}: ${err.error?.message || `HTTP ${res.status}`}`);
  }
  const data = await res.json();
  return parseAIResponse(data.choices?.[0]?.message?.content || '');
}

// ─── User API Config ────────────────────────
function getUserAPIConfig() {
  return {
    service: localStorage.getItem(STORAGE_KEY_SERVICE) || 'gemini',
    key:     localStorage.getItem(STORAGE_KEY_KEY)     || '',
  };
}
function saveUserAPIConfig(service, key) {
  localStorage.setItem(STORAGE_KEY_SERVICE, service);
  localStorage.setItem(STORAGE_KEY_KEY, key);
}
function clearUserAPIConfig() {
  localStorage.removeItem(STORAGE_KEY_SERVICE);
  localStorage.removeItem(STORAGE_KEY_KEY);
}

// ─── Main Entry ─────────────────────────────
async function getAIPalette(word) {
  const t0 = Date.now();

  // 1. Session cache
  const cached = getCached(word);
  if (cached) {
    console.log('[Pastelette] Cache hit:', word);
    return { ...cached, fromCache: true };
  }

  let result = null;
  let source = 'algo';

  // 2. Pollinations (POST → GET, no cooldown between)
  try {
    result = await callPollinationsAI(word);
    source = 'free-ai';
  } catch (err) {
    console.warn('[Pastelette] ✗ Pollinations:', err.message);
  }

  // 3. User API (Gemini / OpenAI) — skip Gemini if dead
  if (!result) {
    const { service, key } = getUserAPIConfig();
    if (key) {
      try {
        result = service === 'openai'
          ? await callOpenAIAPI(word, key)
          : await callGeminiAPI(word, key);
        source = 'user-ai';
      } catch (err) {
        console.warn(`[Pastelette] ✗ ${service}:`, err.message);
      }
    }
  }

  // 4. Algorithmic fallback
  if (!result || !result.colors || result.colors.length === 0) {
    console.log('[Pastelette] → Algorithmic fallback');
    result = {
      colors: ColorUtils.generatePalette(word),
      description: null,
    };
    source = 'algo';
  }

  console.log(`[Pastelette] Done in ${Date.now() - t0}ms (source: ${source})`);
  const final = { ...result, source };
  setCache(word, final);
  return final;
}

// ─── Exports ────────────────────────────────
window.AIService = {
  getAIPalette,
  getUserAPIConfig,
  saveUserAPIConfig,
  clearUserAPIConfig,
};
