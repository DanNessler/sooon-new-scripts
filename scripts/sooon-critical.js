//  sooon-critical.js — Intro screen interactions (blocking)
//  Makes intro screen interactive immediately (<1 second)
//  Loads BEFORE deferred scripts; handles onboarding flow only.

(function() {
  'use strict';

  // --- Storage keys ---
  var KEY_SEEN  = 'sooon_onboarding_seen';
  var KEY_AUDIO = 'sooon_audio_enabled';

  function getSeen()  { return localStorage.getItem(KEY_SEEN) === '1'; }
  function setSeen()  { localStorage.setItem(KEY_SEEN, '1'); }

  function getAudioEnabled() {
    var v = localStorage.getItem(KEY_AUDIO);
    return v === null ? true : v === '1'; // default ON
  }
  function setAudioEnabled(on) { localStorage.setItem(KEY_AUDIO, on ? '1' : '0'); }

  // Persist default ON once (first visit)
  if (localStorage.getItem(KEY_AUDIO) === null) setAudioEnabled(true);

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
    toggle.classList.toggle('is-on', audioEnabled);
    if (circle) circle.classList.toggle('is-on', audioEnabled);
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
  if (toggle) {
    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      audioEnabled = !audioEnabled;
      setAudioEnabled(audioEnabled);
      syncToggleUI();
      // Notify sooon-core.js of state change
      window.dispatchEvent(new CustomEvent('sooon:audio-changed', { detail: { enabled: audioEnabled } }));
    });
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

  console.log('[Critical] Intro ready, returning visitor:', getSeen());
})();
