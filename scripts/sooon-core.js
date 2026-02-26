//  sooon-core.js — Feed functionality (deferred)
//  Loads in background while user sees intro screen.
//  Handles: asset loading, feed audio, modals, animations, artist switcher, filters.


// ========================================================
// SEQUENTIAL ASSET LOADER
// Waits for Webflow CMS to populate cards, then defers + lazy-loads media
// ========================================================
(function() {
  'use strict';

  const EAGER_CARDS = 3;
  const LOAD_DISTANCE = '200%';
  let initialized = false;

  // ── Step 1: Wait for Webflow CMS to finish populating cards ──
  function waitForCards(callback) {
    let attempts = 0;
    const check = setInterval(() => {
      const cards = document.querySelectorAll('.card_feed_item');
      attempts++;
      if (cards.length > 1 || attempts > 40) {
        clearInterval(check);
        callback(cards);
      }
    }, 50);
  }

  // ── Step 2: Defer images on cards beyond EAGER_CARDS ──
  // Audio/video are no longer in the template — injected on demand instead.
  function deferCard(card) {
    card.querySelectorAll('img').forEach(function(img) {
      if (img.hasAttribute('data-lazy-processed')) return;
      if (!img.src || img.src.includes('data:image')) return;
      if (img.src.toLowerCase().includes('placeholder')) return;
      img.setAttribute('data-src', img.src);
      img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3C/svg%3E';
      img.setAttribute('data-lazy-processed', 'true');
    });
  }

  // ── Step 3: Restore deferred images when card enters viewport ──
  function loadCard(card) {
    card.querySelectorAll('img[data-src]').forEach(function(img) {
      var src = img.getAttribute('data-src');
      if (src) {
        img.src = src;
        img.removeAttribute('data-src');
      }
    });
  }

  // ── Step 3b: Inject audio elements from data-audio-url-* card attributes ──
  function injectAudioForCard(card) {
    if (card.dataset.audioInjected === 'true') return;

    var slug = card.getAttribute('data-event-slug') || 'unknown';
    console.log('[Core] Injecting audio for:', slug);

    for (var i = 1; i <= 3; i++) {
      var audioUrl = card.getAttribute('data-audio-url-' + i);
      if (!audioUrl || audioUrl === '') continue;

      var audio = document.createElement('audio');
      audio.className = 'track-audio sooon-audio';
      audio.preload = 'none';
      audio.src = audioUrl;
      audio.setAttribute('data-artist-id', String(i));
      card.appendChild(audio);
    }

    card.dataset.audioInjected = 'true';
  }

  // ── Step 4: Main init — runs after cards exist ──
  function init(cards) {
    if (initialized) return;
    initialized = true;

    // Inject audio immediately for first EAGER_CARDS (visible at page load)
    cards.forEach(function(card, index) {
      if (index < EAGER_CARDS) {
        injectAudioForCard(card);
      }
    });

    // Defer images for cards beyond EAGER_CARDS
    cards.forEach(function(card, index) {
      if (index < EAGER_CARDS) return;
      deferCard(card);
    });

    // Combined observer: restore images + inject audio as cards approach viewport
    var lazyObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        loadCard(entry.target);
        injectAudioForCard(entry.target);
        lazyObserver.unobserve(entry.target);
      });
    }, {
      rootMargin: LOAD_DISTANCE + ' 0px',
      threshold: 0
    });

    cards.forEach(function(card, index) {
      if (index < EAGER_CARDS) return;
      lazyObserver.observe(card);
    });

    console.log('[Core] Audio injection observer active for', cards.length, 'cards');

    // Also handle cards added later by sooon-api.js (infinite scroll)
    var feedEl = (cards[0] && cards[0].parentElement) || document.querySelector('.card_feed');
    if (feedEl) {
      new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          mutation.addedNodes.forEach(function(node) {
            if (node.nodeType !== 1) return;
            if (node.classList.contains('card_feed_item')) {
              injectAudioForCard(node);
              lazyObserver.observe(node);
            }
          });
        });
      }).observe(feedEl, { childList: true });
    }
  }

  // ── Filter diagnostics ──
  function logFilterDiagnostics() {
    console.log('[Core] === FILTER DIAGNOSTICS ===');

    var allCards = document.querySelectorAll('.card_feed_item');
    console.log('[Core] Total cards in feed:', allCards.length);

    var cityCounts = {};
    allCards.forEach(function(card) {
      var city = card.getAttribute('data-venue-city') || 'unknown';
      cityCounts[city] = (cityCounts[city] || 0) + 1;
    });
    console.log('[Core] Events by city:', cityCounts);

    var slugs = new Set();
    var duplicateSlugs = [];
    allCards.forEach(function(card) {
      var slug = card.dataset.eventSlug || card.getAttribute('data-event-slug');
      if (slugs.has(slug)) {
        duplicateSlugs.push(slug);
      }
      slugs.add(slug);
    });

    if (duplicateSlugs.length > 0) {
      console.warn('[Core] ⚠️ DUPLICATE EVENT SLUGS DETECTED:', duplicateSlugs);
      console.warn('[Core] This indicates CMS has duplicate entries');
    } else {
      console.log('[Core] ✅ No duplicate slugs in feed');
    }

    var filterListItems = document.querySelectorAll('.stacked-list2_item');
    if (filterListItems.length > 0) {
      console.log('[Core] Items in filter list:', filterListItems.length);
      if (filterListItems.length !== allCards.length) {
        console.warn('[Core] ⚠️ MISMATCH: Filter list has', filterListItems.length, 'items but feed has', allCards.length);
        console.warn('[Core] Check Webflow for duplicate collection lists or wrong CMS binding');
      }
    }

    console.log('[Core] === END DIAGNOSTICS ===');
  }

  // ── Entry point ──
  function start() {
    waitForCards(function(cards) {
      if (cards.length > 0) {
        init(cards);
        window.sooonFeedReady = true;
        console.log('[Core] Feed initialization complete, ready for deep links');
        setTimeout(logFilterDiagnostics, 2000);
      }
    });
  }

  var onboardingSeen = localStorage.getItem('sooon_onboarding_seen') === '1';

  if (onboardingSeen) {
    start();
  } else {
    var confirmBtn = document.querySelector('[data-sooon-onboarding-confirm="true"]');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', function() {
        setTimeout(start, 300);
      });
    } else {
      setTimeout(start, 2000);
    }
  }
})();


// ========================================================
// FEED AUDIO, MODALS, ANIMATIONS, ARTIST SWITCHER
// ========================================================
document.addEventListener("DOMContentLoaded", function() {

  const STORAGE = {
    seen: "sooon_onboarding_seen",
    audio: "sooon_audio_enabled"
  };

  const DEFAULT_AUDIO_ENABLED = true;

  const setSeen = () => localStorage.setItem(STORAGE.seen, "1");

  const getAudioEnabled = () => {
    const v = localStorage.getItem(STORAGE.audio);
    if (v === null) return DEFAULT_AUDIO_ENABLED;
    return v === "1";
  };

  const setAudioEnabled = (enabled) => localStorage.setItem(STORAGE.audio, enabled ? "1" : "0");

  const onboardingScreen =
    document.querySelector('[data-sooon-onboarding="screen"]') ||
    document.querySelector(".intro-screen") ||
    document.querySelector(".intro_screen");

  const confirmBtn = document.querySelector('[data-sooon-onboarding-confirm="true"]');

  // --- CONFIGURATION ---
  const config = {
    classIn: 'anim-start-in',
    classOut: 'anim-start-out',
    animTrigger: '[data-animate="true"]',
    defaultExitThreshold: 0,

    cardSelector: '.card_feed_item',
    audioSelector: 'audio.track-audio, audio.sooon-audio',

    triggerSelector: '.artist-trigger',
    visualSelector: '.artist-visual',
    titleSelector: '.artist-title',

    activeClass: 'is-active',

    openTrigger: '.modal-open-button',
    closeTrigger: '.modal-close-button',
    modalClass: '.event_modal'
  };

  // ========================================================
  // MODAL SCROLL LOCK (Webflow IX compatible)
  // ========================================================
  document.addEventListener('click', function(e) {
    if (e.target.closest(config.openTrigger)) {
      setTimeout(() => {
        document.body.classList.add('is-locked');
      }, 50);
    }
    if (e.target.closest(config.closeTrigger)) {
      document.body.classList.remove('is-locked');
    }
  });

  document.addEventListener('click', function(e) {
    if (e.target.closest('.modal-open-hitarea')) {
      setTimeout(() => {
        document.body.classList.add('is-locked');
      }, 50);
    }
  });

  // ========================================================
  // AUDIO STATE (single source of truth)
  // ========================================================
  let audioEnabled = getAudioEnabled();

  // Persist default ON once
  const existing = localStorage.getItem(STORAGE.audio);
  if (existing !== "1" && existing !== "0") {
    setAudioEnabled(DEFAULT_AUDIO_ENABLED);
    audioEnabled = DEFAULT_AUDIO_ENABLED;
  }

  // ========================================================
  // FEED AUDIO UI UPDATE
  // Updates all feed card audio-on-off buttons
  // ========================================================
  const updateFeedButtonsUI = () => {
    document.querySelectorAll('.audio-on-off_button').forEach(btn => {
      const onIcon = btn.querySelector('.audio-on-icon');
      const offIcon = btn.querySelector('.audio-off-icon');

      if (!onIcon || !offIcon) return;

      if (audioEnabled) {
        onIcon.classList.remove('is-hidden');
        offIcon.classList.add('is-hidden');
      } else {
        onIcon.classList.add('is-hidden');
        offIcon.classList.remove('is-hidden');
      }
    });
  };

  // Wrapper — sooon-core.js only manages feed UI (intro UI handled by sooon-critical.js)
  const updateAudioUI = () => {
    updateFeedButtonsUI();
  };

  // Initialize feed audio UI on load
  updateAudioUI();

  // Sync with sooon-critical.js intro toggle changes
  window.addEventListener('sooon:audio-changed', function(e) {
    audioEnabled = e.detail.enabled;
    updateAudioUI();
  });

  // ========================================================
  // AUDIO HELPERS
  // ========================================================
  const isOnboardingOpen = () => onboardingScreen && !onboardingScreen.classList.contains("is-hidden");
  const canPlayAudioNow = () => audioEnabled && !isOnboardingOpen();

  const stopAllAudio = (resetTime = true) => {
    document.querySelectorAll(config.audioSelector).forEach(a => {
      try {
        a.pause();
        if (resetTime) a.currentTime = 0;
        a.muted = true;
      } catch(_) {}
    });
  };

  // ========================================================
  // AUDIO TOGGLE (feed card buttons via delegation)
  // ========================================================
  const toggleAudio = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const wasEnabled = audioEnabled;
    audioEnabled = !audioEnabled;
    setAudioEnabled(audioEnabled);
    updateAudioUI();

    if (!audioEnabled) {
      stopAllAudio(true);
    } else {
      // Turning ON — manually restart current card's audio if visible
      if (wasEnabled === false && !isOnboardingOpen()) {
        const cards = Array.from(document.querySelectorAll(config.cardSelector));
        const visibleCard = cards.find(card => {
          const r = card.getBoundingClientRect();
          const vh = window.innerHeight;
          const visibleHeight = Math.min(r.bottom, vh) - Math.max(r.top, 0);
          const cardHeight = r.height;
          return visibleHeight / cardHeight >= 0.6;
        });

        if (visibleCard) {
          const audio = visibleCard.querySelector(config.audioSelector);
          if (audio) {
            document.querySelectorAll(config.audioSelector).forEach(a => {
              if (a !== audio) {
                try { a.pause(); a.currentTime = 0; } catch(_) {}
              }
            });
            audio.muted = false;
            audio.play().catch(()=>{});
          }
        }
      }
    }
  };

  // Feed card audio buttons (event delegation for CMS-generated content)
  document.addEventListener('click', function(e) {
    const audioBtn = e.target.closest('.audio-on-off_button');
    if (!audioBtn) return;
    if (e.target.closest('.modal-open-button, .modal-open-hitarea, .artist-trigger')) return;
    toggleAudio(e);
  }, true);

  // ========================================================
  // PLAY FIRST VISIBLE CARD
  // ========================================================
  const playFirstVisibleCardAudio = () => {
    if (!audioEnabled) return;

    const cards = Array.from(document.querySelectorAll(config.cardSelector));
    if (!cards.length) return;

    const firstVisible = cards.find(card => {
      const r = card.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight;
    }) || cards[0];

    const audio = firstVisible.querySelector(config.audioSelector);
    if (!audio) return;

    document.querySelectorAll(config.audioSelector).forEach(a => {
      if (a !== audio) { try { a.pause(); a.currentTime = 0; } catch(_) {} }
    });

    audio.muted = false;
    audio.play().catch(()=>{});
  };

  // ========================================================
  // CONFIRM BUTTON — Start feed audio after intro dismissal
  // State management (setSeen, scroll unlock) handled by sooon-critical.js
  // ========================================================
  if (confirmBtn) {
    confirmBtn.addEventListener("click", () => {
      if (audioEnabled) {
        // iOS unlock for feed audio elements
        document.querySelectorAll(config.audioSelector).forEach(a => {
          try { a.muted = false; a.play().catch(()=>{}); a.pause(); } catch(_) {}
        });

        // Allow intro animation to start; then begin feed audio
        setTimeout(() => {
          playFirstVisibleCardAudio();
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
      const delayIn = el.getAttribute('data-delay-in') || 0;
      const delayOut = el.getAttribute('data-delay-out') || 0;
      if (entry.isIntersecting) {
        el.style.transitionDelay = `${delayIn}ms`;
        requestAnimationFrame(() => el.classList.remove(config.classIn, config.classOut));
      } else {
        el.style.transitionDelay = `${delayOut}ms`;
        const isTopHalf = entry.boundingClientRect.top < (window.innerHeight / 2);
        el.classList.remove(isTopHalf ? config.classIn : config.classOut);
        el.classList.add(isTopHalf ? config.classOut : config.classIn);
      }
    });
  };

  const getObserver = (exitValue) => {
    const rootMargin = `-${exitValue}% 0px -1% 0px`;
    return new IntersectionObserver(handleIntersect, { threshold: 0, rootMargin });
  };

  document.querySelectorAll(config.animTrigger).forEach(el => {
    el.classList.add(config.classIn);
    const exit = parseInt(el.getAttribute('data-exit-threshold')) || config.defaultExitThreshold;
    getObserver(exit).observe(el);
  });

  // ========================================================
  // AUDIO OBSERVER (gated by onboarding + audio state)
  // ========================================================
  const audioObserver = new IntersectionObserver((entries) => {
    if (!canPlayAudioNow()) {
      stopAllAudio(false);
      return;
    }

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

  // Also observe cards added later by sooon-api.js (infinite scroll)
  var _feedEl = document.querySelector('.card_feed');
  if (_feedEl) {
    new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType !== 1) return;
          if (node.matches && node.matches(config.cardSelector)) {
            audioObserver.observe(node);
          }
        });
      });
    }).observe(_feedEl, { childList: true });
  }

  const unlockAudio = () => {
    if (!canPlayAudioNow()) return;

    document.querySelectorAll(config.audioSelector).forEach(a => {
      a.muted = false;
      a.play().catch(()=>{});
      a.pause();
    });

    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
  };

  document.addEventListener('click', unlockAudio);
  document.addEventListener('touchstart', unlockAudio);

  // ========================================================
  // UNIVERSAL ARTIST SWITCHER
  // ========================================================
  document.addEventListener('click', function(e) {
    const trigger = e.target.closest(config.triggerSelector);
    if (!trigger) return;

    e.preventDefault();
    e.stopPropagation();

    const card = trigger.closest(config.cardSelector);
    if (!card) return;

    const artistIdAttr = trigger.getAttribute('data-artist-id');
    if (!artistIdAttr) return;

    const artistId = parseInt(artistIdAttr);

    const allTaggedElements = card.querySelectorAll('[data-artist-id]');
    allTaggedElements.forEach(el => {
      const elId = parseInt(el.getAttribute('data-artist-id'));
      const title = el.querySelector(config.titleSelector);

      if (elId === artistId) {
        el.classList.add(config.activeClass);
        if (title) title.classList.add(config.activeClass);
      } else {
        el.classList.remove(config.activeClass);
        if (title) title.classList.remove(config.activeClass);
      }
    });

    const allAudios = Array.from(card.querySelectorAll(config.audioSelector));
    allAudios.forEach(a => a.pause());

    if (!canPlayAudioNow()) {
      stopAllAudio(false);
      return;
    }

    // Select by data-artist-id so index gaps from missing audio URLs don't break switching
    const targetAudio = card.querySelector(config.audioSelector + '[data-artist-id="' + artistId + '"]');
    if (targetAudio) {
      targetAudio.muted = false;
      targetAudio.play().catch(err => console.error("[Core] Switch error:", err));
    }
  });

  console.log('[Core] Feed system initialized');
});


// ========================================================
// FILTER-TO-FEED LINKING
// ========================================================
document.addEventListener("click", function (e) {
  const item = e.target.closest(".stacked-list2_item[data-target-slug]");
  if (!item) return;

  e.preventDefault();

  const closeBtn = document.querySelector(".filter_screen .filter-close-button");
  if (closeBtn) closeBtn.click();

  const slug = item.getAttribute("data-target-slug");
  if (!slug) return;

  // Inject card into feed if not yet loaded (hybrid feed support)
  if (window.sooonHybridFeed) {
    window.sooonHybridFeed.injectCard(slug);
  }

  requestAnimationFrame(() => {
    const target = document.querySelector('.card_feed_item[data-event-slug="' + CSS.escape(slug) + '"]');
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});


// ========================================================
// DATE FILTERING (Finsweet integration)
// ========================================================
document.addEventListener("DOMContentLoaded", () => {
  const localISO = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const values = {
    today: localISO(today),
    tomorrow: localISO(tomorrow),
    "next-month-start": localISO(nextMonthStart),
  };

  document.querySelectorAll('input[name="date-quick"][data-date-role]').forEach((input) => {
    const role = input.getAttribute("data-date-role");
    const v = values[role];
    if (!v) return;
    input.value = v;
    input.setAttribute("value", v);
  });

  const checked = document.querySelector('input[name="date-quick"]:checked');
  if (checked) checked.dispatchEvent(new Event("change", { bubbles: true }));
});


// ========================================================
// CARD FEED EMPTY STATE — JS-managed visibility
// The empty state is a sibling of .card_feed-wrapper (outside the
// scroll container), so Finsweet can't reveal it through the wrapper.
// We watch card items for Finsweet's display:none toggling and hide
// the wrapper when 0 results, letting the empty state show through.
// ========================================================
document.addEventListener('DOMContentLoaded', function() {
  var feedWrapper = document.querySelector('.card_feed-wrapper');
  if (!feedWrapper) return;

  var listEl = feedWrapper.querySelector('[fs-list-element="list"]');
  if (!listEl) return;

  console.log('[Core] Card feed empty state: JS-managed');

  var syncTimeout;
  function syncEmptyState() {
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(function() {
      var allItems = listEl.querySelectorAll('.card_feed_item');

      // 0 items = Finsweet removed them all from DOM (not just display:none)
      var hasResults = allItems.length > 0 && Array.from(allItems).some(function(item) {
        return window.getComputedStyle(item).display !== 'none';
      });

      feedWrapper.style.display = hasResults ? '' : 'none';

      if (!hasResults) {
        console.log('[Core] Filter: 0 results — feed hidden, empty state visible');
      }
    }, 50);
  }

  new MutationObserver(syncEmptyState).observe(listEl, {
    subtree: true,
    childList: true,          // Finsweet removes items from DOM — not just display:none
    attributes: true,
    attributeFilter: ['style']
  });
});
