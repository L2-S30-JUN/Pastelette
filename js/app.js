/* ═══════════════════════════════════════════
   Pastelette — App Entry Point
   ═══════════════════════════════════════════ */

'use strict';

// ─── Search ─────────────────────────────────
async function search(word) {
  const trimmed = word.trim();
  if (!trimmed) return;

  // Highlight active tag pill
  document.querySelectorAll('.tag-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.word === trimmed);
  });

  // Check preset
  const key    = trimmed.toLowerCase();
  const preset = PALETTE_MAP[key] || PALETTE_MAP[trimmed];
  if (preset) {
    Renderer.renderPalette(trimmed, preset, 'preset', null);
    document.getElementById('wordInput').value = trimmed;
    return;
  }

  // AI (loading → fetch → render)
  Renderer.showLoading(trimmed);
  document.getElementById('wordInput').value = trimmed;

  try {
    const { colors, description, source } = await AIService.getAIPalette(trimmed);
    Renderer.renderPalette(trimmed, colors, source, description || null);
  } catch (err) {
    console.error('[Pastelette] Search error:', err);
    Renderer.renderFallback(trimmed);
  }
}

// ─── Settings Modal ──────────────────────────
function openModal() {
  const { service, key } = AIService.getUserAPIConfig();
  document.getElementById('apiService').value   = service;
  document.getElementById('apiKeyInput').value  = key;
  document.getElementById('modalOverlay').classList.add('open');
  setTimeout(() => document.getElementById('apiKeyInput').focus(), 280);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function syncModalSettingsToUI() {
  const { key } = AIService.getUserAPIConfig();
  const badge = document.getElementById('aiBadge');
  if (!badge) return;
  // Badge is updated per-search; only show 'configured' state initially
  if (key && badge.textContent === '알고리즘 팔레트') {
    badge.textContent = 'API 키 설정됨';
    badge.className   = 'ai-badge ai-badge--user';
  }
}

// ─── Events ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Search form
  document.getElementById('searchForm').addEventListener('submit', e => {
    e.preventDefault();
    search(document.getElementById('wordInput').value);
  });

  // Tag pills
  document.getElementById('suggestionTags').addEventListener('click', e => {
    const pill = e.target.closest('.tag-pill');
    if (pill) search(pill.dataset.word);
  });

  // Watermark live update
  document.getElementById('wordInput').addEventListener('input', e => {
    Renderer.updateWatermark(e.target.value);
  });

  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', openModal);
  document.getElementById('modalClose') .addEventListener('click', closeModal);
  document.getElementById('btnCancel')  .addEventListener('click', closeModal);

  // Click outside modal
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // Save API key
  document.getElementById('btnSave').addEventListener('click', () => {
    const service = document.getElementById('apiService').value;
    const key     = document.getElementById('apiKeyInput').value.trim();
    AIService.saveUserAPIConfig(service, key);
    syncModalSettingsToUI();
    closeModal();
  });

  // Clear API key
  document.getElementById('btnClear').addEventListener('click', () => {
    document.getElementById('apiKeyInput').value = '';
    AIService.clearUserAPIConfig();
    syncModalSettingsToUI();
  });

  // Enter in API key field
  document.getElementById('apiKeyInput').addEventListener('keydown', e => {
    if (e.key === 'Enter')  document.getElementById('btnSave').click();
    if (e.key === 'Escape') closeModal();
  });

  // Init
  syncModalSettingsToUI();
  document.getElementById('wordInput').focus();
});
