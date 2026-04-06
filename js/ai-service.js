/* ═══════════════════════════════════════════
   Pastelette — AI Service
   Priority: 1. Session cache
             2. Preset palette map
             3. Pollinations.ai (free, GET — no CORS preflight)
             4. User Gemini/OpenAI key (multiple model fallback)
             5. Algorithmic fallback
   ═══════════════════════════════════════════ */

'use strict';

// ─── Config ────────────────────────────────
const STORAGE_KEY_SERVICE = 'pst_api_service';
const STORAGE_KEY_KEY     = 'pst_api_key';
const SESSION_CACHE_KEY   = 'pst_cache';

// Gemini models to try in order (each may have separate quota)
const GEMINI_MODELS = [
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
];

// ─── Rate Limiter ──────────────────────────
let _lastCallTime = 0;
const MIN_CALL_INTERVAL = 2000;

function waitForCooldown() {
  const now = Date.now();
  const elapsed = now - _lastCallTime;
  if (elapsed >= MIN_CALL_INTERVAL) {
    _lastCallTime = now;
    return Promise.resolve();
  }
  const wait = MIN_CALL_INTERVAL - elapsed;
  _lastCallTime = now + wait;
  return new Promise(r => setTimeout(r, wait));
}

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

// ─── Parse AI response ─────────────────────
function parseAIResponse(text) {
  // Try JSON object with colors key first
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
  // Try bare JSON array
  const arrMatch = text.match(/\[[\s\S]*?\]/);
  if (arrMatch) {
    try {
      const arr = JSON.parse(arrMatch[0]);
      if (Array.isArray(arr) && arr.length >= 3) {
        return {
          colors: arr.map(normalizeColor),
          description: null,
        };
      }
    } catch { /* fall through */ }
  }
  throw new Error('No valid JSON found in response');
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
//  1) POST to /openai (OpenAI-compatible endpoint)
//  2) GET  to /{prompt}?json=true (simple endpoint fallback)
// ═════════════════════════════════════════════
async function callPollinationsAI(word) {
  // --- Attempt 1: POST /openai (correct endpoint) ---
  try {
    console.log('[Pastelette] Trying Pollinations POST /openai...');
    await waitForCooldown();

    const res = await withTimeout(
      fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai',
          messages: [
            {
              role: 'system',
              content: 'You are a color palette designer. Return ONLY valid JSON, no markdown.',
            },
            {
              role: 'user',
              content:
                `Word: "${word}". Create a 5-color palette. ` +
                `Vary saturation: dark(S25%,L20%), vivid(S70%,L45%), muted(S35%,L60%), soft(S15%,L78%), pale(S7%,L91%). ` +
                `Return JSON: {"description":"one sentence","colors":[{"hex":"#RRGGBB","name":"English","nameKo":"한국어"},..5]}`,
            },
          ],
          seed: ColorUtils.hashWord(word) % 9999,
          jsonMode: true,
        }),
      }),
      30000
    );

    console.log('[Pastelette] Pollinations POST response:', res.status);
    if (!res.ok) throw new Error(`POST HTTP ${res.status}`);

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || JSON.stringify(data);
    console.log('[Pastelette] Pollinations POST raw (first 300):', text.slice(0, 300));
    const result = parseAIResponse(text);
    console.log('[Pastelette] ✓ Pollinations POST succeeded');
    return result;

  } catch (err) {
    console.warn('[Pastelette] Pollinations POST failed:', err.message);
  }

  // --- Attempt 2: GET /{prompt} (simple, no CORS preflight) ---
  try {
    console.log('[Pastelette] Trying Pollinations GET...');
    await waitForCooldown();

    const prompt = `Create a 5-color palette for the word "${word}". Return only JSON: {"description":"sentence","colors":[{"hex":"#RRGGBB","name":"English","nameKo":"Korean"},{"hex":"#RRGGBB","name":"English","nameKo":"Korean"},{"hex":"#RRGGBB","name":"English","nameKo":"Korean"},{"hex":"#RRGGBB","name":"English","nameKo":"Korean"},{"hex":"#RRGGBB","name":"English","nameKo":"Korean"}]}`;
    const url =
      `https://text.pollinations.ai/${encodeURIComponent(prompt)}` +
      `?seed=${ColorUtils.hashWord(word) % 9999}` +
      `&json=true` +
      `&model=openai`;

    const res = await withTimeout(fetch(url), 30000);

    console.log('[Pastelette] Pollinations GET response:', res.status);
    if (!res.ok) throw new Error(`GET HTTP ${res.status}`);

    const text = await res.text();
    console.log('[Pastelette] Pollinations GET raw (first 300):', text.slice(0, 300));
    const result = parseAIResponse(text);
    console.log('[Pastelette] ✓ Pollinations GET succeeded');
    return result;

  } catch (err) {
    console.warn('[Pastelette] Pollinations GET failed:', err.message);
    throw new Error(`Pollinations failed: ${err.message}`);
  }
}

// ═════════════════════════════════════════════
//  Gemini API — tries multiple models in sequence
//  Each model has separate quota; if one is 429/0
//  we move to the next immediately.
// ═════════════════════════════════════════════
async function callGeminiAPI(word, apiKey) {
  const prompt =
    `단어 "${word}"의 의미, 감정, 연상 이미지를 분석하여 5가지 색채 팔레트를 생성하세요.\n` +
    `채도가 서로 크게 다른 색들을 조합하세요 (깊고 진한 색 + 선명한 포인트 색 + 차분한 중간 색 + 부드러운 연한 색 + 매우 옅은 색).\n` +
    `단순 단색 그라데이션은 금지입니다. JSON만 반환하세요:\n` +
    `{"description":"한 문장의 시적인 설명","colors":[{"hex":"#RRGGBB","name":"English name","nameKo":"한국어 이름"},...5개]}`;

  let lastErr = null;

  for (const model of GEMINI_MODELS) {
    console.log(`[Pastelette] Trying Gemini ${model}...`);

    try {
      await waitForCooldown();
      const res = await withTimeout(
        fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.85, maxOutputTokens: 500 },
            }),
          }
        ),
        12000
      );

      console.log(`[Pastelette] Gemini ${model} response:`, res.status);

      if (res.status === 429) {
        const err = await res.json().catch(() => ({}));
        const msg = err.error?.message || 'Rate limit';
        console.warn(`[Pastelette] ${model} quota exhausted, trying next...`);
        lastErr = new Error(`429 ${model}: ${msg}`);
        continue; // → try next model
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`${res.status}: ${err.error?.message || `HTTP ${res.status}`}`);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log(`[Pastelette] ✓ Gemini ${model} succeeded`);
      return parseAIResponse(text);

    } catch (err) {
      lastErr = err;
      if (err.message.startsWith('429')) continue; // try next model
      throw err; // non-429 errors → stop
    }
  }

  throw lastErr || new Error('All Gemini models exhausted');
}

// ─── OpenAI API (user key) ──────────────────
async function callOpenAIAPI(word, apiKey) {
  console.log('[Pastelette] Trying OpenAI API...');

  const prompt =
    `단어 "${word}"를 색채로 번역하세요. 채도가 다양한 5색 팔레트를 생성하세요. ` +
    `JSON만 반환: {"description":"한 문장 설명","colors":[{"hex":"#RRGGBB","name":"English","nameKo":"한국어"},...5개]}`;

  await waitForCooldown();
  const res = await withTimeout(
    fetch('https://api.openai.com/v1/chat/completions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.85,
        max_tokens:  500,
      }),
    }),
    12000
  );

  console.log('[Pastelette] OpenAI response:', res.status);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`${res.status}: ${err.error?.message || `OpenAI HTTP ${res.status}`}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  return parseAIResponse(text);
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
  // 1. Session cache
  const cached = getCached(word);
  if (cached) {
    console.log('[Pastelette] Cache hit for:', word);
    return { ...cached, fromCache: true };
  }

  let result = null;
  let source = 'algo';
  const errors = [];

  // 2. Pollinations.ai (free, no key, GET = no CORS issue)
  try {
    result = await callPollinationsAI(word);
    source = 'free-ai';
  } catch (err) {
    errors.push(`Pollinations: ${err.message}`);
    console.warn('[Pastelette] ✗ Pollinations failed:', err.message);
  }

  // 3. User API key (Gemini multi-model / OpenAI)
  if (!result) {
    const { service, key } = getUserAPIConfig();
    if (key) {
      try {
        result = service === 'openai'
          ? await callOpenAIAPI(word, key)
          : await callGeminiAPI(word, key);
        source = 'user-ai';
      } catch (err) {
        errors.push(`${service}: ${err.message}`);
        console.warn(`[Pastelette] ✗ ${service} failed:`, err.message);
      }
    }
  }

  // 4. Algorithmic fallback (always works)
  if (!result || !result.colors || result.colors.length === 0) {
    console.log('[Pastelette] → Algorithmic fallback');
    if (errors.length) {
      console.warn('[Pastelette] All AI services failed:', errors.join(' | '));
    }
    result = {
      colors: ColorUtils.generatePalette(word),
      description: null,
    };
    source = 'algo';
  }

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
