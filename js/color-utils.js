/* ═══════════════════════════════════════════
   Pastelette — Color Utilities & Harmony
   ═══════════════════════════════════════════ */

'use strict';

// ─── Hash ───────────────────────────────────
function hashWord(word) {
  let h = 5381;
  for (let i = 0; i < word.length; i++) {
    h = ((h << 5) + h) + word.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// ─── HSL ↔ HEX ──────────────────────────────
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.min(100, Math.max(0, s)) / 100;
  l = Math.min(100, Math.max(0, l)) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function isValidHex(hex) {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

// ─── Hue Names ──────────────────────────────
const HUE_NAMES = [
  { min: 0,   max: 14,  en: 'Red',       ko: '빨강'   },
  { min: 14,  max: 38,  en: 'Vermilion', ko: '주홍'   },
  { min: 38,  max: 62,  en: 'Amber',     ko: '황금'   },
  { min: 62,  max: 155, en: 'Green',     ko: '초록'   },
  { min: 155, max: 190, en: 'Teal',      ko: '청록'   },
  { min: 190, max: 250, en: 'Blue',      ko: '파랑'   },
  { min: 250, max: 288, en: 'Violet',    ko: '보라'   },
  { min: 288, max: 334, en: 'Mauve',     ko: '자주'   },
  { min: 334, max: 360, en: 'Rose',      ko: '장미'   },
];

function getHueName(hue) {
  const h = ((hue % 360) + 360) % 360;
  for (const n of HUE_NAMES) {
    if (h >= n.min && h < n.max) return { en: n.en, ko: n.ko };
  }
  return { en: 'Rose', ko: '장미' };
}

// ─── Semantic Word → Hue Mapping ────────────
const MOOD_SEEDS = [
  { words: ['fire','flame','passion','love','anger','red','열정','사랑','불'], hue: 5,   satBoost: 18 },
  { words: ['orange','warm','autumn','harvest','fall','가을','단풍','온기'], hue: 26,  satBoost: 12 },
  { words: ['sun','gold','joy','happy','summer','황금','기쁨','여름','빛'], hue: 46,  satBoost: 14 },
  { words: ['forest','nature','life','spring','leaf','숲','봄','자연','식물'], hue: 122, satBoost: 8  },
  { words: ['tea','sage','herb','mint','차','허브'], hue: 145, satBoost: 4  },
  { words: ['sea','ocean','teal','청록','바다','파도'], hue: 175, satBoost: 6  },
  { words: ['sky','blue','freedom','하늘','자유','파랑','구름'], hue: 210, satBoost: 8  },
  { words: ['night','midnight','deep','mystery','밤','자정','신비','어둠'], hue: 228, satBoost: -6 },
  { words: ['violet','dream','magic','spirit','보라','꿈','마법','신비'], hue: 270, satBoost: 10 },
  { words: ['rose','pink','bloom','cherry','핑크','벚꽃','꽃','장미'], hue: 340, satBoost: 8  },
  { words: ['snow','ice','crystal','winter','눈','겨울','얼음','크리스탈'], hue: 204, satBoost: -16 },
  { words: ['earth','soil','wood','cozy','desert','흙','나무','사막','따뜻'], hue: 30,  satBoost: -6 },
  { words: ['grief','sorrow','nostalgia','longing','그리움','슬픔','향수','그리'], hue: 240, satBoost: -8 },
  { words: ['smoke','ash','stone','gray','연기','재','돌','회색'], hue: 220, satBoost: -22 },
  { words: ['coffee','chocolate','espresso','커피','초콜릿','카카오'], hue: 22,  satBoost: -4 },
  { words: ['rain','drizzle','cloud','fog','비','안개','구름','이슬'], hue: 214, satBoost: -10 },
  { words: ['lavender','lilac','라벤더','라일락'], hue: 268, satBoost: 6  },
  { words: ['cherry blossom','sakura','벚꽃','봄꽃'], hue: 346, satBoost: 6  },
];

function getSemanticSeed(word) {
  const w = word.toLowerCase();
  for (const seed of MOOD_SEEDS) {
    if (seed.words.some(kw => w.includes(kw) || kw.includes(w))) {
      return { hue: seed.hue, satBoost: seed.satBoost };
    }
  }
  return null;
}

// ─── 5-color Varied-Saturation Palette ──────
//
// Profile: [saturation%, lightness%, hue-shift°, name-en, name-ko]
// Deliberately varied saturation for visual interest
const SAT_PROFILES = [
  [ 28,  20,   0,   'Deep',    '심층의'   ],  // dark anchor
  [ 72,  46,  12,   'Vivid',   '선명한'   ],  // vivid accent
  [ 38,  61,  -8,   'Muted',   '차분한'   ],  // muted mid
  [ 16,  78,   5,   'Soft',    '부드러운' ],  // soft light
  [  7,  91,  -3,   'Pale',    '연한'     ],  // ethereal pale
];

function generatePalette(word) {
  const hash     = hashWord(word);
  const seed     = getSemanticSeed(word);
  const baseH    = seed ? seed.hue : (hash % 360);
  const satBoost = seed ? seed.satBoost : (((hash >> 8) % 21) - 10);
  // Spread hues analogously to keep harmony
  const spread   = 18 + (hash % 22);

  return SAT_PROFILES.map(([baseSat, baseL, hShift, nameEn, nameKo], i) => {
    const direction = i % 2 === 0 ? 1 : -1;
    const hue = baseH + hShift + (i * spread / SAT_PROFILES.length) * direction;
    const sat = Math.min(88, Math.max(4, baseSat + satBoost));
    const hex = hslToHex(hue, sat, baseL);
    const hueInfo = getHueName(hue);
    return {
      hex,
      name:   `${nameEn} ${hueInfo.en}`,
      nameKo: `${nameKo} ${hueInfo.ko}`,
    };
  });
}

// ─── Exports (global, no modules for GH Pages compat) ───
window.ColorUtils = {
  hashWord,
  hslToHex,
  hexToHsl,
  isValidHex,
  getHueName,
  getSemanticSeed,
  generatePalette,
};
