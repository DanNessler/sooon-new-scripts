//  sooon-core.js — Feed functionality (deferred) — Kombinat2026 variant
//  Loads in background while user sees intro screen.
//  Handles: asset loading, feed audio, modals, animations, filters.
//  Note: Artist switcher removed (single artist per event).
//        Dynamic date filter injection removed (manual Finsweet filters used).


// ========================================================
// SEQUENTIAL ASSET LOADER
// Waits for Webflow CMS to populate cards, then defers + lazy-loads media
// ========================================================
(function() {
  'use strict';

  const EAGER_CARDS = 1;
  const LOAD_DISTANCE = '100%';
  let initialized = false;

  function waitForCards(callback) {
    let attempts = 0;
    const check = setInterval(() => {
      const cards = document.querySelectorAll('.card_feed_item');
      attempts++;
      if (cards.length >= 1 || attempts > 40) {
        clearInterval(check);
        callback(cards);
      }
    }, 50);
  }

  function deferCard(card) {
    card.querySelectorAll('img').forEach(function(img) {
      if (img.hasAttribute('data-lazy-processed')) return;
      if (!img.src || img.src.includes('data:image')) return;
      if (img.src.toLowerCase().includes('placeholder')) return;
      img.setAttribute('data-src', img.src);
      img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3C/svg%3E';
      img.setAttribute('data-lazy-processed', 'true');
    });
    card.querySelectorAll('video').forEach(function(video) {
      if (video.hasAttribute('data-lazy-processed')) return;
      if (video.src && video.src !== window.location.href) {
        video.setAttribute('data-src', video.src);
        video.removeAttribute('src');
        video.setAttribute('data-lazy-processed', 'true');
      }
    });
    card.querySelectorAll('audio').forEach(function(audio) {
      if (audio.hasAttribute('data-lazy-processed')) return;
      var sources = audio.querySelectorAll('source');
      if (sources.length > 0) {
        var srcArray = Array.from(sources).map(function(s) { return s.getAttribute('src') || ''; });
        if (srcArray.some(function(s) { return s && s !== ''; })) {
          audio.setAttribute('data-src', JSON.stringify(srcArray));
          sources.forEach(function(s) { s.remove(); });
          audio.setAttribute('data-lazy-processed', 'true');
        }
      }
    });
  }

  function loadCard(card) {
    card.querySelectorAll('img[data-src]').forEach(function(img) {
      var src = img.getAttribute('data-src');
      if (src) { img.src = src; img.removeAttribute('data-src'); }
    });
    card.querySelectorAll('video[data-src]').forEach(function(video) {
      var src = video.getAttribute('data-src');
      if (src) { video.src = src; video.load(); video.removeAttribute('data-src'); }
    });
    card.querySelectorAll('audio[data-src]').forEach(function(audio) {
      var srcData = audio.getAttribute('data-src');
      if (srcData) {
        try {
          JSON.parse(srcData).forEach(function(src) {
            if (!src) return;
            var source = document.createElement('source');
            source.src = src;
            source.type = 'audio/mpeg';
            audio.appendChild(source);
          });
          audio.load();
          audio.removeAttribute('data-src');
        } catch(e) {}
      }
    });
  }

  function init(cards) {
    if (initialized) return;
    initialized = true;

    cards.forEach(function(card, index) {
      if (index < EAGER_CARDS) return;
      deferCard(card);
    });

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        loadCard(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: LOAD_DISTANCE + ' 0px', threshold: 0 });

    cards.forEach(function(card) { observer.observe(card); });
  }

  function start() {
    waitForCards(function(cards) {
      if (cards.length > 0) {
        init(cards);
        window.sooonFeedReady = true;
        console.log('[Kombinat-Core] Feed initialization complete, ready for deep links');
      }
    });
  }

  var onboardingSeen = localStorage.getItem('kombinat_onboarding_seen') === '1';

  if (onboardingSeen) {
    start();
  } else {
    var confirmBtn = document.querySelector('[data-sooon-onboarding-confirm="true"]');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', function() { setTimeout(start, 300); });
    } else {
      setTimeout(start, 2000);
    }
  }
})();


// ========================================================
// FEED AUDIO, MODALS, ANIMATIONS
// ========================================================
document.addEventListener("DOMContentLoaded", function() {

  const STORAGE = {
    seen: "kombinat_onboarding_seen",
    audio: "kombinat_audio_enabled"
  };

  const DEFAULT_AUDIO_ENABLED = true;

  const getAudioEnabled = () => {
    const v = localStorage.getItem(STORAGE.audio);
    return v === null ? DEFAULT_AUDIO_ENABLED : v === "1";
  };

  const setAudioEnabled = (enabled) => localStorage.setItem(STORAGE.audio, enabled ? "1" : "0");

  const onboardingScreen =
    document.querySelector('[data-sooon-onboarding="screen"]') ||
    document.querySelector(".intro-screen") ||
    document.querySelector(".intro_screen");

  const confirmBtn = document.querySelector('[data-sooon-onboarding-confirm="true"]');

  const config = {
    classIn: 'anim-start-in',
    classOut: 'anim-start-out',
    animTrigger: '[data-animate="true"]',
    defaultExitThreshold: 0,

    cardSelector: '.card_feed_item',
    audioSelector: 'audio.track-audio, audio.sooon-audio',

    activeClass: 'is-active',

    openTrigger: '.modal-open-button, .modal-open-hitarea',
    closeTrigger: '.modal-close-button',
  };

  // ========================================================
  // MODAL SCROLL LOCK
  // ========================================================
  document.addEventListener('click', function(e) {
    if (e.target.closest(config.openTrigger)) {
      setTimeout(() => document.body.classList.add('is-locked'), 50);
    }
    if (e.target.closest(config.closeTrigger)) {
      document.body.classList.remove('is-locked');
    }
  });

  // ========================================================
  // MODAL CLOSE ON SWIPE DOWN
  // Tracks a downward drag on .modal_close_swipe, animates the
  // modal sheet in real-time, and commits a dismiss (iOS-style
  // slide-out) when the drag exceeds the threshold, or snaps
  // back if the user lets go too early.
  // ========================================================
  (function() {
    var COMMIT_THRESHOLD  = 120; // px — minimum drag distance to dismiss
    var COMMIT_VELOCITY   = 0.5; // px/ms — fast flick also dismisses
    var SLIDE_OUT_DURATION = 340; // ms — iOS-sheet exit duration

    var startY = null;
    var startX = null;
    var startTime = null;
    var activeModal = null;
    var dragging = false;

    function getModal() {
      return document.querySelector('.event_modal.is-open');
    }

    function setTranslate(modal, dy) {
      modal.style.transition = 'none';
      modal.style.transform  = 'translateY(' + Math.max(0, dy) + 'px)';
    }

    function snapBack(modal) {
      modal.style.transition = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)';
      modal.style.transform  = 'translateY(0)';
      modal.addEventListener('transitionend', function cleanup() {
        modal.removeEventListener('transitionend', cleanup);
        modal.style.transition = '';
        modal.style.transform  = '';
      });
    }

    function slideOut(modal) {
      var viewH = window.innerHeight;
      modal.style.transition = 'transform ' + SLIDE_OUT_DURATION + 'ms cubic-bezier(0.32, 0.72, 0, 1)';
      modal.style.transform  = 'translateY(' + viewH + 'px)';
      modal.addEventListener('transitionend', function cleanup() {
        modal.removeEventListener('transitionend', cleanup);
        modal.style.transition = '';
        modal.style.transform  = '';
        var closeBtn = document.querySelector(config.closeTrigger);
        if (closeBtn) closeBtn.click();
      });
    }

    document.addEventListener('touchstart', function(e) {
      if (!e.target.closest('.modal_close_swipe')) return;
      var modal = getModal();
      if (!modal) return;
      var t = e.touches[0];
      startY      = t.clientY;
      startX      = t.clientX;
      startTime   = Date.now();
      activeModal = modal;
      dragging    = false;
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
      if (startY === null || !activeModal) return;
      var t  = e.touches[0];
      var dy = t.clientY - startY;
      var dx = t.clientX - startX;

      // Lock axis on first significant movement
      if (!dragging) {
        if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
        // Abandon if primarily horizontal
        if (Math.abs(dx) > Math.abs(dy)) { startY = null; return; }
        dragging = true;
      }

      if (dy > 0) setTranslate(activeModal, dy);
    }, { passive: true });

    document.addEventListener('touchend', function(e) {
      if (startY === null || !activeModal) return;
      var t        = e.changedTouches[0];
      var dy       = t.clientY - startY;
      var elapsed  = Date.now() - startTime;
      var velocity = elapsed > 0 ? dy / elapsed : 0;
      var modal    = activeModal;

      startY      = null;
      startX      = null;
      startTime   = null;
      activeModal = null;
      dragging    = false;

      if (dy < 10) { snapBack(modal); return; }
      if (dy >= COMMIT_THRESHOLD || velocity >= COMMIT_VELOCITY) {
        slideOut(modal);
      } else {
        snapBack(modal);
      }
    }, { passive: true });
  })();

  // ========================================================
  // AUDIO STATE
  // ========================================================
  let audioEnabled = getAudioEnabled();

  if (localStorage.getItem(STORAGE.audio) === null) {
    setAudioEnabled(DEFAULT_AUDIO_ENABLED);
    audioEnabled = DEFAULT_AUDIO_ENABLED;
  }

  const isOnboardingOpen = () => onboardingScreen && !onboardingScreen.classList.contains("is-hidden");
  const canPlayAudioNow = () => audioEnabled && !isOnboardingOpen();

  const stopAllAudio = (resetTime = true) => {
    document.querySelectorAll(config.audioSelector).forEach(a => {
      try { a.pause(); if (resetTime) a.currentTime = 0; a.muted = true; } catch(_) {}
    });
  };

  // ========================================================
  // FEED AUDIO UI
  // ========================================================
  const updateFeedButtonsUI = () => {
    document.querySelectorAll('.audio-on-off_button').forEach(btn => {
      const onIcon  = btn.querySelector('.audio-on-icon');
      const offIcon = btn.querySelector('.audio-off-icon');
      if (!onIcon || !offIcon) return;
      onIcon.classList.toggle('is-hidden', !audioEnabled);
      offIcon.classList.toggle('is-hidden', audioEnabled);
    });
  };

  updateFeedButtonsUI();

  window.addEventListener('sooon:audio-changed', function(e) {
    audioEnabled = e.detail.enabled;
    updateFeedButtonsUI();
  });

  // ========================================================
  // AUDIO TOGGLE (feed card buttons via delegation)
  // ========================================================
  document.addEventListener('click', function(e) {
    const audioBtn = e.target.closest('.audio-on-off_button');
    if (!audioBtn) return;
    if (e.target.closest('.modal-open-button, .modal-open-hitarea')) return;

    e.preventDefault();
    e.stopPropagation();

    audioEnabled = !audioEnabled;
    setAudioEnabled(audioEnabled);
    updateFeedButtonsUI();

    if (!audioEnabled) {
      stopAllAudio(true);
    } else if (!isOnboardingOpen()) {
      // Turning ON — play the currently visible card
      const visibleCard = Array.from(document.querySelectorAll(config.cardSelector)).find(card => {
        const r = card.getBoundingClientRect();
        return (Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0)) / r.height >= 0.6;
      });
      if (visibleCard) {
        const audio = visibleCard.querySelector(config.audioSelector);
        if (audio) {
          document.querySelectorAll(config.audioSelector).forEach(a => {
            if (a !== audio) { try { a.pause(); a.currentTime = 0; } catch(_) {} }
          });
          audio.muted = false;
          audio.play().catch(()=>{});
        }
      }
    }
  }, true);

  // ========================================================
  // CONFIRM BUTTON — Start feed audio after intro dismissal
  // ========================================================
  if (confirmBtn) {
    confirmBtn.addEventListener("click", () => {
      if (audioEnabled) {
        document.querySelectorAll(config.audioSelector).forEach(a => {
          try { a.muted = false; a.play().catch(()=>{}); a.pause(); } catch(_) {}
        });
        setTimeout(() => {
          const cards = Array.from(document.querySelectorAll(config.cardSelector));
          if (!cards.length) return;
          const first = cards.find(c => {
            const r = c.getBoundingClientRect();
            return r.bottom > 0 && r.top < window.innerHeight;
          }) || cards[0];
          const audio = first.querySelector(config.audioSelector);
          if (audio) { audio.muted = false; audio.play().catch(()=>{}); }
        }, 150);
      } else {
        stopAllAudio(true);
      }
    });
  }

  // ========================================================
  // SCROLL ANIMATIONS
  // ========================================================
  const handleIntersect = (entries) => {
    entries.forEach(entry => {
      const el = entry.target;
      if (entry.isIntersecting) {
        el.style.transitionDelay = `${el.getAttribute('data-delay-in') || 0}ms`;
        requestAnimationFrame(() => el.classList.remove(config.classIn, config.classOut));
      } else {
        el.style.transitionDelay = `${el.getAttribute('data-delay-out') || 0}ms`;
        const isTopHalf = entry.boundingClientRect.top < (window.innerHeight / 2);
        el.classList.remove(isTopHalf ? config.classIn : config.classOut);
        el.classList.add(isTopHalf ? config.classOut : config.classIn);
      }
    });
  };

  document.querySelectorAll(config.animTrigger).forEach(el => {
    el.classList.add(config.classIn);
    const exit = parseInt(el.getAttribute('data-exit-threshold')) || config.defaultExitThreshold;
    new IntersectionObserver(handleIntersect, {
      threshold: 0,
      rootMargin: `-${exit}% 0px -1% 0px`
    }).observe(el);
  });

  // ========================================================
  // AUDIO OBSERVER (60% visibility threshold)
  // ========================================================
  const audioObserver = new IntersectionObserver((entries) => {
    if (!canPlayAudioNow()) { stopAllAudio(false); return; }

    entries.forEach(entry => {
      const audio = entry.target.querySelector(config.audioSelector);
      if (entry.isIntersecting && audio) {
        document.querySelectorAll(config.audioSelector).forEach(a => {
          if (a !== audio) { a.pause(); a.currentTime = 0; }
        });
        audio.muted = false;
        audio.play().catch(()=>{});
      } else if (audio) {
        audio.pause();
      }
    });
  }, { threshold: 0.6 });

  document.querySelectorAll(config.cardSelector).forEach(card => audioObserver.observe(card));

  // iOS audio unlock on first gesture
  const unlockAudio = () => {
    if (!canPlayAudioNow()) return;
    document.querySelectorAll(config.audioSelector).forEach(a => {
      a.muted = false; a.play().catch(()=>{}); a.pause();
    });
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
  };
  document.addEventListener('click', unlockAudio);
  document.addEventListener('touchstart', unlockAudio);

  console.log('[Kombinat-Core] Feed system initialized');
});


// ========================================================
// FILTER-TO-FEED LINKING
// ========================================================

// Prevent a Webflow IX2-controlled dropdown "close on outside click" from
// also triggering list items layered below.
// Track open state via toggle clicks. On mousedown on a list item while
// open, set a "just closed" flag and let the click handler suppress itself.
let filterDropdownOpen = false;
let filterDropdownJustClosed = false;

document.addEventListener("click", function(e) {
  const toggle = e.target.closest(".filter_screen .w-dropdown-toggle");
  if (toggle) {
    filterDropdownOpen = !filterDropdownOpen;
  }
}, true);

function onPointerOutsideDropdown(e) {
  if (!filterDropdownOpen) return;
  if (e.target.closest(".filter_screen .w-dropdown")) return;

  // A dropdown is open and user pressed outside it — it will close.
  // Set flag so the subsequent click event on any list item is suppressed.
  filterDropdownOpen = false;
  filterDropdownJustClosed = true;
}

document.addEventListener("mousedown", onPointerOutsideDropdown, true);
document.addEventListener("touchstart", onPointerOutsideDropdown, { capture: true, passive: true });

document.addEventListener("click", function(e) {
  const item = e.target.closest(".stacked-list2_item[data-target-slug]");
  if (!item) return;

  if (filterDropdownJustClosed) {
    filterDropdownJustClosed = false;
    e.preventDefault();
    e.stopImmediatePropagation();
    return;
  }

  e.preventDefault();

  const closeBtn = document.querySelector(".filter_screen .filter-close-button");
  if (closeBtn) closeBtn.click();

  const slug = item.getAttribute("data-target-slug");
  if (!slug) return;

  // Wait for Finsweet filter + feedWrapper display sync to settle before scrolling
  setTimeout(function() {
    const target = document.querySelector('.card_feed_item[data-event-slug="' + CSS.escape(slug) + '"]');
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 150);
});


// ========================================================
// CARD FEED EMPTY STATE
// Hides .card_feed-wrapper when Finsweet removes all items,
// revealing the empty state sibling behind it.
// ========================================================
document.addEventListener('DOMContentLoaded', function() {
  var feedWrapper = document.querySelector('.card_feed-wrapper');
  if (!feedWrapper) return;

  var listEl = feedWrapper.querySelector('[fs-list-element="list"]');
  if (!listEl) return;

  var syncTimeout;
  function syncEmptyState() {
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(function() {
      var items = listEl.querySelectorAll('.card_feed_item');
      var hasResults = items.length > 0 && Array.from(items).some(function(item) {
        return window.getComputedStyle(item).display !== 'none';
      });
      feedWrapper.style.display = hasResults ? '' : 'none';
    }, 50);
  }

  new MutationObserver(syncEmptyState).observe(listEl, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['style']
  });
});
