//  sooon-critical.js — Intro screen interactions (blocking) — Kombinat2026 variant
//  Makes intro screen interactive immediately (<1 second)
//  Loads BEFORE deferred scripts; handles onboarding flow only.

(function() {
  'use strict';

  // --- Extend page edge-to-edge behind iOS status bar + home indicator ---
  var vp = document.querySelector('meta[name="viewport"]');
  if (vp) {
    var content = vp.getAttribute('content') || '';
    if (!content.includes('viewport-fit')) {
      vp.setAttribute('content', content + ', viewport-fit=cover');
    }
  }

  // --- Storage keys ---
  var KEY_SEEN  = 'kombinat_onboarding_seen';
  var KEY_AUDIO = 'kombinat_audio_enabled';

  // Safe localStorage wrappers — iOS Safari private mode throws on access
  function lsGet(key) {
    try { return localStorage.getItem(key); } catch(_) { return null; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, val); } catch(_) {}
  }

  function getSeen()  { return lsGet(KEY_SEEN) === '1'; }
  function setSeen()  { lsSet(KEY_SEEN, '1'); }

  function getAudioEnabled() {
    var v = lsGet(KEY_AUDIO);
    return v === null ? true : v === '1'; // default ON
  }
  function setAudioEnabled(on) { lsSet(KEY_AUDIO, on ? '1' : '0'); }

  // --- Deep link + first visit detection ---
  var hasDeepLink = window.location.hash.startsWith('#event-');
  var isFirstVisit = !getSeen();
  var deepLinkFirstVisit = hasDeepLink && isFirstVisit;

  // Audio default: OFF for deep link first visitors, ON otherwise
  if (lsGet(KEY_AUDIO) === null) {
    setAudioEnabled(!deepLinkFirstVisit);
  }

  // Deep link first visit: skip intro, mark onboarding as seen
  if (deepLinkFirstVisit) {
    setSeen();
  }

  // --- DOM refs ---
  var screen = document.querySelector('[data-sooon-onboarding="screen"]')
    || document.querySelector('.intro-screen')
    || document.querySelector('.intro_screen');

  var confirmBtn = document.querySelector('[data-sooon-onboarding-confirm="true"]');
  var toggle     = document.querySelector('[data-sooon-audio-toggle="true"]');
  var label      = document.querySelector('[data-sooon-audio-label="true"]');

  var audioEnabled = getAudioEnabled();

  // --- Update intro toggle UI ---
  function syncToggleUI() {
    if (!toggle) return;
    var circle = toggle.querySelector('.button-toggle-circle');
    // Use inline styles to override Webflow which keeps re-adding is-on class
    if (circle) {
      circle.style.left   = audioEnabled ? 'auto' : '0.25rem';
      circle.style.right  = audioEnabled ? '0.25rem' : 'auto';
    }
    if (label) label.textContent = audioEnabled ? 'ON' : 'OFF';
  }

  syncToggleUI();

  // --- Show / hide intro screen ---
  if (screen) {
    if (getSeen()) {
      screen.classList.add('is-hidden');
      window.sooonIntroReady = true;
    } else {
      screen.classList.remove('is-hidden');
      document.body.classList.add('is-locked');
    }
  }

  // --- Intro audio toggle ---
  console.log('[Kombinat-Critical] toggle el:', toggle, '| circle el:', toggle ? toggle.querySelector('.button-toggle-circle') : 'N/A (no toggle)');

  if (toggle) {
    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      audioEnabled = !audioEnabled;
      setAudioEnabled(audioEnabled);
      syncToggleUI();
      console.log('[Kombinat-Critical] toggle clicked — audioEnabled:', audioEnabled, '| circle:', toggle.querySelector('.button-toggle-circle'));
      // Notify sooon-core.js of state change
      window.dispatchEvent(new CustomEvent('sooon:audio-changed', { detail: { enabled: audioEnabled } }));
    });
  } else {
    console.warn('[Kombinat-Critical] toggle element NOT FOUND — check data-sooon-audio-toggle="true" in Webflow');
  }

  // --- "Discover Shows" button ---
  if (confirmBtn) {
    confirmBtn.addEventListener('click', function() {
      setSeen();
      document.body.classList.remove('is-locked');
      window.sooonIntroReady = true;
      // iOS audio unlock on user gesture
      document.querySelectorAll('audio').forEach(function(a) {
        try { a.muted = false; a.play().catch(function(){}); a.pause(); } catch(e) {}
      });
    });
  }

  if (deepLinkFirstVisit) {
    console.log('[Kombinat-Critical] Deep link detected, first visit - skipping intro, audio OFF');
  } else if (isFirstVisit) {
    console.log('[Kombinat-Critical] First visit - showing intro, audio ON by default');
  } else {
    console.log('[Kombinat-Critical] Returning visitor, intro skipped');
  }
})();
