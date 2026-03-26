/* ═══════════════════════════════════════════
   Pastelette — Renderer (DOM updates)
   ═══════════════════════════════════════════ */

'use strict';

// ─── Watermark ──────────────────────────────
function updateWatermark(word) {
  const el = document.getElementById('bgWatermark');
  if (!el) return;
  el.style.opacity = '0';
  setTimeout(() => {
    el.textContent = (word || 'PASTELETTE').toUpperCase();
    el.style.opacity = '1';
  }, 280);
}

// ─── AI Status Badge ────────────────────────
function updateAIBadge(source) {
  const badge = document.getElementById('aiBadge');
  if (!badge) return;
  const MAP = {
    'free-ai': ['AI 분석 · 무료', 'ai-badge--free'],
    'user-ai': ['AI 분석 · 고급', 'ai-badge--user'],
    'preset':  ['큐레이션 팔레트', 'ai-badge--algo'],
    'algo':    ['알고리즘 팔레트', 'ai-badge--algo'],
  };
  const [text, cls] = MAP[source] || MAP['algo'];
  badge.textContent = text;
  badge.className   = `ai-badge ${cls}`;
}

// ─── Loading State ──────────────────────────
function showLoading(word) {
  updateWatermark(word);
  const card = document.getElementById('paletteCard');
  triggerCardAnimation(card);
  card.innerHTML = `
    <div class="loading-state">
      <span class="loading-word">${escHtml(word)}</span>
      <div class="loading-dots">
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
      </div>
      <span class="loading-label">색채를 번역하는 중</span>
    </div>
  `;
  document.getElementById('resultSection').classList.add('visible');
  setSearchDisabled(true);
}

// ─── Render Palette ─────────────────────────
function renderPalette(keyword, colors, source, description) {
  updateWatermark(keyword);
  updateAIBadge(source);

  const stripSegments = colors
    .map(c => `<div class="palette-strip__segment" style="background:${c.hex};"></div>`)
    .join('');

  const swatches = colors
    .map((c, i) => `
      <div class="color-swatch" style="--swatch-color:${c.hex};animation-delay:${(i + 1) * 0.08}s">
        <div class="swatch-bar"></div>
        <div class="swatch-info">
          <span class="swatch-name" title="${escHtml(c.name)}">${escHtml(c.name)}</span>
          <span class="swatch-name-ko" title="${escHtml(c.nameKo)}">${escHtml(c.nameKo)}</span>
          <span class="hex-code" title="클릭하여 복사"
                onclick="window.copyHex(this,'${c.hex}')">${c.hex}</span>
        </div>
      </div>`)
    .join('');

  const descHtml = description
    ? `<p class="palette-description">${escHtml(description)}</p>`
    : '';

  const card = document.getElementById('paletteCard');
  triggerCardAnimation(card);
  card.innerHTML = `
    <div class="palette-card__header">
      <span class="palette-keyword">${escHtml(keyword)}</span>
      <span class="palette-subtitle">${colors.length}가지 색채 팔레트</span>
    </div>
    ${descHtml}
    <div class="palette-strip">${stripSegments}</div>
    <div class="color-swatches">${swatches}</div>
    <div class="card-actions">
      <button class="btn-action" onclick="window.copyAllHex()">모두 복사</button>
      <button class="btn-action" onclick="window.downloadPalette()">PNG 저장</button>
    </div>
  `;

  // Store for actions
  card.dataset.keyword = keyword;
  card.dataset.colors  = JSON.stringify(colors);

  document.getElementById('resultSection').classList.add('visible');
  setSearchDisabled(false);
}

// ─── Error fallback (render algo) ───────────
function renderFallback(keyword) {
  const colors = ColorUtils.generatePalette(keyword);
  renderPalette(keyword, colors, 'algo', null);
}

// ─── Helpers ────────────────────────────────
function triggerCardAnimation(card) {
  card.style.animation = 'none';
  void card.offsetHeight;
  card.style.animation = 'card-reveal 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards';
}

function setSearchDisabled(disabled) {
  const btn = document.getElementById('searchBtn');
  if (btn) btn.disabled = disabled;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Global clipboard actions ───────────────
window.copyHex = function(el, hex) {
  const feedback = () => {
    el.classList.add('copied');
    setTimeout(() => el.classList.remove('copied'), 1600);
  };
  if (navigator.clipboard) {
    navigator.clipboard.writeText(hex).then(feedback).catch(() => { legacyCopy(hex); feedback(); });
  } else {
    legacyCopy(hex); feedback();
  }
};

window.copyAllHex = function() {
  const card = document.getElementById('paletteCard');
  try {
    const colors = JSON.parse(card.dataset.colors || '[]');
    const text = colors.map(c => `${c.hex}  ${c.name}  ${c.nameKo}`).join('\n');
    navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
  } catch { /* ignore */ }
};

window.downloadPalette = function() {
  const card = document.getElementById('paletteCard');
  try {
    const colors  = JSON.parse(card.dataset.colors || '[]');
    const keyword = card.dataset.keyword || 'palette';
    drawPaletteCanvas(keyword, colors);
  } catch { /* ignore */ }
};

function legacyCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

// ─── PNG Export ─────────────────────────────
function drawPaletteCanvas(keyword, colors) {
  const W = 900, H = 300;
  const canvas = document.createElement('canvas');
  canvas.width  = W * 2; // retina
  canvas.height = H * 2;
  canvas.style.cssText = 'position:fixed;opacity:0;pointer-events:none;top:-9999px';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);

  // Background
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0,   '#FDFCF8');
  grad.addColorStop(0.5, '#F0EDF8');
  grad.addColorStop(1,   '#DDE8F5');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Swatches
  const sw = W / colors.length;
  const barH = H * 0.5;
  const barY = (H - barH) * 0.38;

  colors.forEach((c, i) => {
    const x = i * sw;
    // Bar
    ctx.save();
    roundRect(ctx, x + 14, barY, sw - 28, barH, 10);
    ctx.fillStyle = c.hex;
    ctx.fill();
    ctx.restore();

    // Hex label
    ctx.fillStyle = '#9D9BBF';
    ctx.font = '300 11px "Jost", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(c.hex, x + sw / 2, barY + barH + 20);

    // Name
    ctx.fillStyle = '#7B78A8';
    ctx.font = '300 10px "Jost", sans-serif';
    ctx.fillText(c.nameKo, x + sw / 2, barY + barH + 36);
  });

  // Keyword
  ctx.fillStyle = '#9D9BBF';
  ctx.font = 'italic 300 22px "Cormorant Garamond", serif';
  ctx.textAlign = 'center';
  ctx.fillText(keyword, W / 2, H - 12);

  // Watermark
  ctx.fillStyle = 'rgba(168,164,212,0.3)';
  ctx.font = '200 10px "Jost", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('pastelette', W - 14, H - 12);

  const link = document.createElement('a');
  link.download = `pastelette-${keyword}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  document.body.removeChild(canvas);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ─── Exports ────────────────────────────────
window.Renderer = {
  updateWatermark,
  updateAIBadge,
  showLoading,
  renderPalette,
  renderFallback,
};
