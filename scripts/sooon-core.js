//  sooon-core.js — Feed functionality (deferred)
//  Loads in background while user sees intro screen.
//  Handles: asset loading, feed audio, modals, animations, artist switcher, filters.


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
      if (cards.length > 1 || attempts > 40) {
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
        var srcArray = Array.from(sources).map(function(s) { return s.src; });
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
        console.log('[Core] Feed initialization complete, ready for deep links');
      }
    });
  }

  var onboardingSeen = localStorage.getItem('sooon_onboarding_seen') === '1';

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
// FEED AUDIO, MODALS, ANIMATIONS, ARTIST SWITCHER
// ========================================================
document.addEventListener("DOMContentLoaded", function() {

  const STORAGE = {
    seen: "sooon_onboarding_seen",
    audio: "sooon_audio_enabled"
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

    triggerSelector: '.artist-trigger',
    visualSelector: '.artist-visual',
    titleSelector: '.artist-title',

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
    if (e.target.closest('.modal-open-button, .modal-open-hitarea, .artist-trigger')) return;

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

  // ========================================================
  // ARTIST SWITCHER
  // DOM reality (confirmed via Webflow DOM inspection):
  //   .artist-title has NO data-artist-id — it's a child of .artist-trigger
  //   Must find it via el.querySelector('.artist-title') inside each tagged element.
  //   .card_feed_item wraps both feed UI and modal — use it as root.
  //   Audio elements have no data-artist-id at runtime — use index-based lookup.
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

    const artistId = parseInt(artistIdAttr, 10);

    card.querySelectorAll('[data-artist-id]').forEach(el => {
      const elId = parseInt(el.getAttribute('data-artist-id'), 10);
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

    if (!canPlayAudioNow()) return;

    const targetAudio = allAudios[artistId - 1];
    if (targetAudio) {
      targetAudio.currentTime = 0;
      targetAudio.muted = false;
      targetAudio.play().catch(() => {});
    }
  });

  console.log('[Core] Feed system initialized');
});


// ========================================================
// FILTER-TO-FEED LINKING
// ========================================================
document.addEventListener("click", function(e) {
  const item = e.target.closest(".stacked-list2_item[data-target-slug]");
  if (!item) return;

  e.preventDefault();

  const closeBtn = document.querySelector(".filter_screen .filter-close-button");
  if (closeBtn) closeBtn.click();

  const slug = item.getAttribute("data-target-slug");
  if (!slug) return;

  requestAnimationFrame(() => {
    const target = document.querySelector('.card_feed_item[data-event-slug="' + CSS.escape(slug) + '"]');
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
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
    const v = values[input.getAttribute("data-date-role")];
    if (!v) return;
    input.value = v;
    input.setAttribute("value", v);
  });

  const checked = document.querySelector('input[name="date-quick"]:checked');
  if (checked) checked.dispatchEvent(new Event("change", { bubbles: true }));
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
