// Scroll lock cleanup — removes stale is-locked class on page load for returning visitors
(function () {
  function removeLockIfSeen() {
    if (document.body && localStorage.getItem('sooon_onboarding_seen') === '1') {
      document.body.classList.remove('is-locked');
    }
  }
  removeLockIfSeen(); // Run immediately (covers footer-injected script)
  document.addEventListener('DOMContentLoaded', removeLockIfSeen); // Fallback if body not ready yet
})();

//  CUSTOM page based before-body code inject


//  Script to limit number of cards loading in feed to optimize performance  

// Sequential Asset Loader — replaces both deferral + observer
// Waits for Webflow CMS to populate cards, then defers + lazy-loads images
(function() {
  'use strict';

  const EAGER_CARDS = 3;
  const LOAD_DISTANCE = '200%';
  let initialized = false;

  // ── Step 1: Wait for Webflow CMS to finish populating cards ──
  // Webflow sets fs-list on the list container after CMS items are injected.
  // We poll until we see more than 1 card (the template alone = 1).
  function waitForCards(callback) {
    let attempts = 0;
    const check = setInterval(() => {
      const cards = document.querySelectorAll('.card_feed_item');
      attempts++;
      if (cards.length > 1 || attempts > 40) {
        // Either cards populated, or 2 seconds passed (40 × 50ms) — proceed either way
        clearInterval(check);
        callback(cards);
      }
    }, 50);
  }

  // ── Step 2: Defer images on cards beyond EAGER_CARDS ──
  function deferCard(card) {
    card.querySelectorAll('img').forEach(function(img) {
      // Skip if already processed
      if (img.hasAttribute('data-lazy-processed')) return;
      // Skip if src is empty or is already a data: URI
      if (!img.src || img.src.includes('data:image')) return;
      // Skip SVG placeholders — these are NOT real images, don't store them
      // Match both "Placeholder" and "placeholder" (case-insensitive)
      if (img.src.toLowerCase().includes('placeholder')) return;
      // Store real src and blank it
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
        // Only store if at least one source has a real URL
        if (srcArray.some(function(s) { return s && s !== ''; })) {
          audio.setAttribute('data-src', JSON.stringify(srcArray));
          sources.forEach(function(s) { s.remove(); });
          audio.setAttribute('data-lazy-processed', 'true');
        }
      }
    });
  }

  // ── Step 3: Load assets back when card enters viewport ──
  function loadCard(card) {
    card.querySelectorAll('img[data-src]').forEach(function(img) {
      var src = img.getAttribute('data-src');
      if (src) {
        img.src = src;
        img.removeAttribute('data-src');
      }
    });
    card.querySelectorAll('video[data-src]').forEach(function(video) {
      var src = video.getAttribute('data-src');
      if (src) {
        video.src = src;
        video.load();
        video.removeAttribute('data-src');
      }
    });
    card.querySelectorAll('audio[data-src]').forEach(function(audio) {
      var srcData = audio.getAttribute('data-src');
      if (srcData) {
        try {
          var srcArray = JSON.parse(srcData);
          srcArray.forEach(function(src) {
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

  // ── Step 4: Main init — runs after cards exist ──
  function init(cards) {
    if (initialized) return;
    initialized = true;

    // Defer cards beyond the eager threshold
    cards.forEach(function(card, index) {
      if (index < EAGER_CARDS) return;
      deferCard(card);
    });

    // Set up IntersectionObserver for lazy loading
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        loadCard(entry.target);
        observer.unobserve(entry.target);
      });
    }, {
      rootMargin: LOAD_DISTANCE + ' 0px',
      threshold: 0
    });

    // Observe all cards (eager ones are already loaded, observer is harmless on them)
    cards.forEach(function(card) {
      observer.observe(card);
    });
  }

  // ── Entry point: wait for onboarding state, then wait for cards ──
  function start() {
    waitForCards(function(cards) {
      if (cards.length > 0) {
        init(cards);
      }
    });
  }

  // Use correct localStorage key (sooon_onboarding_seen, not sooon:onboarding-seen)
  var onboardingSeen = localStorage.getItem('sooon_onboarding_seen') === '1';

  if (onboardingSeen) {
    // Returning visitor — start immediately
    start();
  } else {
    // First visit — wait for "Discover Shows" click
    var confirmBtn = document.querySelector('[data-sooon-onboarding-confirm="true"]');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', function() {
        setTimeout(start, 300);
      });
    } else {
      // Fallback: start after 2s if button not found
      setTimeout(start, 2000);
    }
  }
})();

//  General Feed & Audio Handling  

document.addEventListener("DOMContentLoaded", function() {

  const STORAGE = {
    seen: "sooon_onboarding_seen",
    audio: "sooon_audio_enabled"
  };

  const DEFAULT_AUDIO_ENABLED = true;

  const getSeen = () => localStorage.getItem(STORAGE.seen) === "1";
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

  const confirmBtn  = document.querySelector('[data-sooon-onboarding-confirm="true"]');
  const audioToggle = document.querySelector('[data-sooon-audio-toggle="true"]');
  const audioLabel  = document.querySelector('[data-sooon-audio-label="true"]');

  // --- CONFIGURATION (needed early for helpers) ---
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
  // Open modal - DON'T preventDefault, let Webflow IX run
  if (e.target.closest(config.openTrigger)) {
    // Let Webflow IX add 'is-open' class, we just lock scroll
    setTimeout(() => {
      document.body.classList.add('is-locked');
    }, 50); // Small delay to let IX start
  }
  
  // Close modal - DON'T preventDefault, let Webflow IX run
  if (e.target.closest(config.closeTrigger)) {
    // Unlock scroll immediately when close is clicked
    document.body.classList.remove('is-locked');
  }
});

// Also handle the modal-open-hitarea (has no button inside it)
document.addEventListener('click', function(e) {
  if (e.target.closest('.modal-open-hitarea')) {
    setTimeout(() => {
      document.body.classList.add('is-locked');
    }, 50);
  }
});

  // --- AUDIO STATE (single source of truth) ---
  let audioEnabled = getAudioEnabled();

  // Persist default ON once (prevents "sometimes on/off")
  const existing = localStorage.getItem(STORAGE.audio);
  if (existing !== "1" && existing !== "0") {
    setAudioEnabled(DEFAULT_AUDIO_ENABLED);
    audioEnabled = DEFAULT_AUDIO_ENABLED;
  }

  // ========================================================
  // AUDIO UI UPDATE FUNCTIONS
  // Handles BOTH intro toggle AND feed card icon buttons
  // ========================================================
  
  /**
   * Updates intro_screen toggle button
   * Toggles 'is-on' class on button and circle element
   */
  const updateIntroToggleUI = () => {
    if (!audioToggle) return;
    
    const circle = audioToggle.querySelector('.button-toggle-circle');
    
    if (audioEnabled) {
      audioToggle.classList.add('is-on');
      if (circle) circle.classList.add('is-on');
    } else {
      audioToggle.classList.remove('is-on');
      if (circle) circle.classList.remove('is-on');
    }
  };
  
  /**
   * Updates ALL feed card audio-on-off buttons
   * Toggles 'is-hidden' class between audio-on-icon and audio-off-icon
   */
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
  
  /**
   * Master UI update function
   * Syncs intro toggle, feed buttons, and label text
   */
  const updateAudioUI = () => {
    // Update text label (ON/OFF)
    if (audioLabel) audioLabel.textContent = audioEnabled ? "ON" : "OFF";
    
    // Update intro toggle appearance
    updateIntroToggleUI();
    
    // Update all feed card button icons
    updateFeedButtonsUI();
  };

  // Initialize all audio UI on page load
  updateAudioUI();

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

  const showOnboarding = () => {
    if (!onboardingScreen) return;
    onboardingScreen.style.removeProperty('display'); // Clear any Webflow inline display:none
    onboardingScreen.classList.remove("is-hidden");
    document.body.classList.add("is-locked");
    updateAudioUI();
    stopAllAudio(true);
  };

  const hideOnboarding = () => {
    if (!onboardingScreen) return;
    onboardingScreen.classList.add("is-hidden");
    document.body.classList.remove("is-locked");
  };

  // Initial onboarding state
  if (onboardingScreen) {
    if (getSeen()) hideOnboarding();
    else showOnboarding();
  } else if (getSeen()) {
    // Returning visitor but intro screen element not found — remove any stale lock
    document.body.classList.remove('is-locked');
  }

  // ========================================================
  // AUDIO TOGGLE EVENT HANDLERS
  // Both intro toggle AND feed buttons toggle the same state
  // ========================================================
  
  /**
   * Central toggle function
   * Updates state, persists to localStorage, updates all UI elements
   * AND manually restarts audio if toggling ON while on a visible card
   */
  const toggleAudio = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const wasEnabled = audioEnabled;
    audioEnabled = !audioEnabled;
    setAudioEnabled(audioEnabled);
    updateAudioUI();

    if (!audioEnabled) {
      // Turning OFF - stop all audio
      stopAllAudio(true);
    } else {
      // Turning ON - manually restart current card's audio if visible
      if (wasEnabled === false && !isOnboardingOpen()) {
        // Find the currently visible card
        const cards = Array.from(document.querySelectorAll(config.cardSelector));
        const visibleCard = cards.find(card => {
          const r = card.getBoundingClientRect();
          const vh = window.innerHeight;
          // Check if card is at least 60% visible (matches observer threshold)
          const visibleHeight = Math.min(r.bottom, vh) - Math.max(r.top, 0);
          const cardHeight = r.height;
          return visibleHeight / cardHeight >= 0.6;
        });
        
        if (visibleCard) {
          const audio = visibleCard.querySelector(config.audioSelector);
          if (audio) {
            // Stop all others
            document.querySelectorAll(config.audioSelector).forEach(a => {
              if (a !== audio) {
                try { a.pause(); a.currentTime = 0; } catch(_) {}
              }
            });
            // Start this one
            audio.muted = false;
            audio.play().catch(()=>{});
          }
        }
      }
    }
  };
  
  // Attach to intro toggle button
  if (audioToggle) {
    audioToggle.addEventListener("click", toggleAudio);
  }
  
  // Use event delegation for feed buttons (handles dynamically loaded cards)
  document.addEventListener('click', function(e) {
    const audioBtn = e.target.closest('.audio-on-off_button');
    if (!audioBtn) return;
    
    // Prevent if click is on modal trigger or other interactive elements
    if (e.target.closest('.modal-open-button, .modal-open-hitarea, .artist-trigger')) return;
    
    toggleAudio(e);
  }, true); // Use capture phase to catch early

  // Helper: start playing the first visible card's audio
  const playFirstVisibleCardAudio = () => {
    if (!audioEnabled) return;

    const cards = Array.from(document.querySelectorAll(config.cardSelector));
    if (!cards.length) return;

    // Find first card that is at least partially in view
    const firstVisible = cards.find(card => {
      const r = card.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight;
    }) || cards[0];

    const audio = firstVisible.querySelector(config.audioSelector);
    if (!audio) return;

    // stop others
    document.querySelectorAll(config.audioSelector).forEach(a => {
      if (a !== audio) { try { a.pause(); a.currentTime = 0; } catch(_) {} }
    });

    audio.muted = false;
    audio.play().catch(()=>{});
  };

  // Confirm CTA:
  // Webflow IX hides intro visually.
  // JS persists state, unlocks scroll, unlocks audio, then starts playback.
  if (confirmBtn) {
    confirmBtn.addEventListener("click", () => {
      setSeen();
      document.body.classList.remove("is-locked");

      if (audioEnabled) {
        // iOS unlock attempt on user gesture
        document.querySelectorAll(config.audioSelector).forEach(a => {
          try { a.muted = false; a.play().catch(()=>{}); a.pause(); } catch(_) {}
        });

        // Allow Webflow IX to start and intro to begin leaving; then start feed audio.
        setTimeout(() => {
          // Only start if onboarding is effectively closed / leaving
          playFirstVisibleCardAudio();
        }, 150);
      } else {
        stopAllAudio(true);
      }
    });
  }

  // ========================================================
  // PART A: SCROLL ANIMATION (unchanged)
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
  // PART B: AUDIO OBSERVER (gated)
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
  // PART C: UNIVERSAL SWITCHER (unchanged except uses config above)
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
    const targetIndex = artistId - 1;

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

    if (allAudios[targetIndex]) {
      allAudios[targetIndex].muted = false;
      allAudios[targetIndex].play().catch(err => console.error("Switch error:", err));
    }
  });

});


//  Filter-List & Feed-Linking  

document.addEventListener("click", function (e) {
  const item = e.target.closest(".stacked-list2_item[data-target-slug]");
  if (!item) return;

  e.preventDefault();

  // 1) Close the filter modal using your real close button
  const closeBtn = document.querySelector(".filter_screen .filter-close-button");
  if (closeBtn) closeBtn.click();

  // 2) Find matching card_feed_item and scroll to it
  const slug = item.getAttribute("data-target-slug");
  if (!slug) return;

  // Wait one frame so the modal starts closing before scroll
  requestAnimationFrame(() => {
    const target = document.querySelector('.card_feed_item[data-event-slug="' + CSS.escape(slug) + '"]');
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

//  Date filtering Logic  

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

  // If a radio is pre-checked, force FS to apply with the updated value
  const checked = document.querySelector('input[name="date-quick"]:checked');
  if (checked) checked.dispatchEvent(new Event("change", { bubbles: true }));
});
