/* ═══════════════════════════════════════════
   Pastelette — AI Service
   Priority: Pollinations.ai (free, no key)
          → User Gemini/OpenAI key (optional)
          → Algorithmic fallback
   ═══════════════════════════════════════════ */

'use strict';

// ─── Config ────────────────────────────────
const STORAGE_KEY_SERVICE = 'pst_api_service';
const STORAGE_KEY_KEY     = 'pst_api_key';
const SESSION_CACHE_KEY   = 'pst_cache';

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
    // Keep max 30 entries
    const keys = Object.keys(cache);
    if (keys.length > 30) delete cache[keys[0]];
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cache));
  } catch { /* ignore */ }
}

// ─── Parse AI response ─────────────────────
function parseAIResponse(text) {
  // Try to extract JSON array
  const arrMatch = text.match(/\[[\s\S]*?\]/);
  if (arrMatch) {
    const arr = JSON.parse(arrMatch[0]);
    if (Array.isArray(arr) && arr.length >= 3) {
      return {
        colors: arr.map(normalizeColor),
        description: null,
      };
    }
  }
  // Try JSON object with colors key
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    const obj = JSON.parse(objMatch[0]);
    const colors = obj.colors || obj.palette || obj.swatches;
    if (Array.isArray(colors) && colors.length >= 3) {
      return {
        colors: colors.map(normalizeColor),
        description: obj.description || obj.mood || null,
      };
    }
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

// ─── Pollinations.ai (FREE — no key) ───────
async function callPollinationsAI(word) {
  const systemPrompt =
    'You are a professional color palette designer. You translate words into evocative, ' +
    'harmonious color palettes. Always respond with valid JSON only — no markdown, no explanation.';

  const userPrompt =
    `Analyze the word "${word}" — its meaning, emotion, and sensory associations. ` +
    `Create a 5-color palette that captures its essence.\n\n` +
    `REQUIREMENTS:\n` +
    `- Vary saturation dramatically: include a deep/dark color (S≈25%, L≈20%), ` +
    `a vivid accent (S≈70%, L≈45%), a muted mid (S≈35%, L≈60%), ` +
    `a soft light (S≈15%, L≈78%), an ethereal pale (S≈7%, L≈91%)\n` +
    `- Use harmonious hues (analogous or split-complementary)\n` +
    `- Colors must evoke the specific word's meaning, NOT generic palettes\n\n` +
    `Return ONLY this JSON:\n` +
    `{"description":"One poetic sentence about how these colors capture the word","colors":[` +
    `{"hex":"#RRGGBB","name":"Poetic English name","nameKo":"시적인 한국어 이름"},` +
    `{"hex":"#RRGGBB","name":"Poetic English name","nameKo":"시적인 한국어 이름"},` +
    `{"hex":"#RRGGBB","name":"Poetic English name","nameKo":"시적인 한국어 이름"},` +
    `{"hex":"#RRGGBB","name":"Poetic English name","nameKo":"시적인 한국어 이름"},` +
    `{"hex":"#RRGGBB","name":"Poetic English name","nameKo":"시적인 한국어 이름"}]}`;

  const res = await fetch('https://text.pollinations.ai/', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
      model:   'openai',
      seed:    ColorUtils.hashWord(word) % 9999,
      private: true,
      jsonMode: false,
    }),
  });

  if (!res.ok) throw new Error(`Pollinations HTTP ${res.status}`);
  const text = await res.text();
  return parseAIResponse(text);
}

// ─── Gemini API (user key) ──────────────────
async function callGeminiAPI(word, apiKey) {
  const prompt =
    `단어 "${word}"의 의미, 감정, 연상 이미지를 분석하여 5가지 색채 팔레트를 생성하세요.\n` +
    `채도가 서로 크게 다른 색들을 조합하세요 (깊고 진한 색 + 선명한 포인트 색 + 차분한 중간 색 + 부드러운 연한 색 + 매우 옅은 색).\n` +
    `단순 단색 그라데이션은 금지입니다. JSON만 반환하세요:\n` +
    `{"description":"한 문장의 시적인 설명","colors":[{"hex":"#RRGGBB","name":"English name","nameKo":"한국어 이름"},...5개]}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.85, maxOutputTokens: 500 },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini HTTP ${res.status}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return parseAIResponse(text);
}

// ─── OpenAI API (user key) ──────────────────
async function callOpenAIAPI(word, apiKey) {
  const prompt =
    `단어 "${word}"를 색채로 번역하세요. 채도가 다양한 5색 팔레트를 생성하세요. ` +
    `JSON만 반환: {"description":"한 문장 설명","colors":[{"hex":"#RRGGBB","name":"English","nameKo":"한국어"},...5개]}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.85,
      max_tokens:  500,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI HTTP ${res.status}`);
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
  // Check session cache
  const cached = getCached(word);
  if (cached) return { ...cached, fromCache: true };

  let result = null;
  let source = 'algo';

  // 1. Try Pollinations.ai (free)
  try {
    result = await callPollinationsAI(word);
    source = 'free-ai';
  } catch (err1) {
    console.warn('[Pastelette] Pollinations failed:', err1.message);

    // 2. Try user API key
    const { service, key } = getUserAPIConfig();
    if (key) {
      try {
        result = service === 'openai'
          ? await callOpenAIAPI(word, key)
          : await callGeminiAPI(word, key);
        source = 'user-ai';
      } catch (err2) {
        console.warn('[Pastelette] User API failed:', err2.message);
      }
    }
  }

  // 3. Algorithmic fallback
  if (!result || !result.colors || result.colors.length === 0) {
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
