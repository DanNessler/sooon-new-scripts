// ============================================================
// SOOON Bookmarks — Event bookmarking & favourites list — Kombinat2026 variant
// ============================================================
// Allows users to bookmark events from the modal, persists to
// localStorage, populates a favourites list in the filter view,
// and syncs bookmark state across all UI elements.
//
// DOM structure mirrors event-share.js patterns:
//  - Slugs live in textContent of [data-event-slug-source] /
//    [data-feed-slug] elements (Finsweet CMS binding)
//  - Open modal detected via .event_modal.is-open, then scoped
//    to parent .event_modal_scope
// ============================================================

(function () {
  'use strict';

  const LOG = '[Kombinat-Bookmarks]';
  const STORAGE_KEY = 'kombinat_bookmarks';

  // ── Selectors ──
  const SEL = {
    // Bookmark button & icons (inside modal)
    toggleBtn:      '[data-bookmark-action="toggle"]',
    iconInactive:   '.bookmark-icon-inactive',
    iconActive:     '.bookmark-icon-active',

    // Slug sources (Finsweet CMS — slug is in textContent)
    slugSource:     '[data-event-slug-source="true"]',
    feedSlug:       '[data-feed-slug="true"]',

    // Modal structure
    openModal:      '.event_modal.is-open',
    modalScope:     '.event_modal_scope',

    // Modal data text elements (for populating favourites)
    modalArtist:    '.event_modal_hero_artist_content .heading-h2-4xl',
    modalVenue:     '.event_location-venue',
    modalCity:      '.event_location-city',
    modalDate:      '.date_detailed',

    // Feed cards
    feedCard:       '.card_feed_item',
    bookmarkDot:    '.bookmark-indicator',

    // Favourites tab
    favContainer:   '[data-favourites-list="container"]',
    favTemplate:    '[data-favourites-template="true"]',
    favEmpty:       '[data-favourites-empty="true"]',
  };

  // ── localStorage helpers (graceful degradation) ──
  let storageAvailable = true;

  function readBookmarks() {
    if (!storageAvailable) return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn(LOG, 'Failed to read localStorage:', e);
      return [];
    }
  }

  function writeBookmarks(arr) {
    if (!storageAvailable) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch (e) {
      console.warn(LOG, 'Failed to write localStorage:', e);
    }
  }

  // Check localStorage availability once
  try {
    const test = '__kombinat_ls_test__';
    localStorage.setItem(test, '1');
    localStorage.removeItem(test);
  } catch (_) {
    storageAvailable = false;
    console.warn(LOG, 'localStorage unavailable — bookmarks will not persist.');
  }

  // ── State ──
  let bookmarks = readBookmarks();

  // Track the slug of the last-opened modal (set when user clicks modal open trigger)
  let activeModalSlug = null;

  function isBookmarked(slug) {
    return bookmarks.indexOf(slug) !== -1;
  }

  function addBookmark(slug) {
    if (isBookmarked(slug)) return;
    bookmarks.push(slug);
    writeBookmarks(bookmarks);
    console.log(LOG, 'Added:', slug);
  }

  function removeBookmark(slug) {
    const idx = bookmarks.indexOf(slug);
    if (idx === -1) return;
    bookmarks.splice(idx, 1);
    writeBookmarks(bookmarks);
    console.log(LOG, 'Removed:', slug);
  }

  // ── Slug helpers ──

  /**
   * Get the slug for the currently open modal.
   * Uses activeModalSlug (set when the modal open trigger is clicked) as the
   * primary source, since Webflow IX2 may use a shared modal overlay that is
   * not nested inside the per-item .event_modal_scope.
   * Falls back to DOM traversal for cases where the modal IS nested.
   */
  function getCurrentSlug() {
    if (activeModalSlug) return activeModalSlug;

    // Fallback: traverse DOM (works when modal is inside its scope)
    const openModal = document.querySelector(SEL.openModal);
    if (!openModal) return null;

    const scope = openModal.closest(SEL.modalScope);
    if (!scope) return null;

    const el = scope.querySelector(SEL.slugSource);
    if (!el) return null;

    return el.textContent.trim() || null;
  }

  /**
   * Get the slug for a feed card's parent .event_modal_scope.
   * Each feed card sits inside a scope that has the slug source element.
   */
  function getCardSlug(card) {
    const scope = card.closest(SEL.modalScope);
    if (!scope) return null;

    // Try [data-event-slug-source] first, then [data-feed-slug]
    const el = scope.querySelector(SEL.slugSource) || scope.querySelector(SEL.feedSlug);
    if (!el) return null;

    return el.textContent.trim() || null;
  }

  /**
   * Extract event display data from a modal scope for the favourites list.
   * Uses the same text element selectors as event-share.js.
   */
  function getEventDataFromScope(scope) {
    const artistEl = scope.querySelector(SEL.modalArtist);
    const venueEl  = scope.querySelector(SEL.modalVenue);
    const cityEl   = scope.querySelector(SEL.modalCity);
    const dateEl   = scope.querySelector(SEL.modalDate);

    return {
      artist: artistEl ? artistEl.textContent.trim() : '',
      venue:  venueEl  ? venueEl.textContent.trim()  : '',
      city:   cityEl   ? cityEl.textContent.trim()    : '',
      date:   dateEl   ? dateEl.textContent.trim()    : '',
    };
  }

  // ── UI: Modal bookmark button icons ──
  // Scoped to the open modal so we don't toggle hidden/stale icons
  function updateModalButton(slug) {
    const openModal = document.querySelector(SEL.openModal);
    if (!openModal) return;

    const scope = openModal.closest(SEL.modalScope) || openModal;
    const inactive = scope.querySelector(SEL.iconInactive);
    const active = scope.querySelector(SEL.iconActive);
    if (!inactive || !active) return;

    if (isBookmarked(slug)) {
      active.classList.remove('is-hidden');
      inactive.classList.add('is-hidden');
    } else {
      active.classList.add('is-hidden');
      inactive.classList.remove('is-hidden');
    }
  }

  // ── UI: Feed card bookmark indicators ──
  function updateFeedIndicators() {
    document.querySelectorAll(SEL.feedCard).forEach(function (card) {
      const dot = card.querySelector(SEL.bookmarkDot);
      if (!dot) return;

      const slug = getCardSlug(card);
      if (!slug) return;

      if (isBookmarked(slug)) {
        dot.classList.remove('is-hidden');
      } else {
        dot.classList.add('is-hidden');
      }
    });
  }

  // ── UI: Favourites list ──
  // Webflow structure:
  //   [data-favourites-list="container"]
  //     └─ .stacked-list2_list          ← items appended here
  //         └─ [data-favourites-template].is-template  ← hidden clone source
  //     └─ [data-favourites-empty]      ← empty state (sibling to list)
  function populateFavourites() {
    const container = document.querySelector(SEL.favContainer);
    if (!container) return;

    const listWrapper = container.querySelector('.stacked-list2_list');
    if (!listWrapper) {
      console.warn(LOG, 'List wrapper .stacked-list2_list not found inside container.');
      return;
    }

    const template = listWrapper.querySelector(SEL.favTemplate);
    if (!template) {
      console.warn(LOG, 'Favourites template not found inside list wrapper.');
      return;
    }

    const emptyMsg = container.querySelector(SEL.favEmpty);

    // Remove all items from listWrapper EXCEPT the .is-template
    Array.from(listWrapper.children).forEach(function (child) {
      if (!child.classList.contains('is-template')) {
        listWrapper.removeChild(child);
      }
    });

    // Build slug → scope lookup
    const scopes = document.querySelectorAll(SEL.modalScope);
    const slugToScope = new Map();
    scopes.forEach(function (scope) {
      const el = scope.querySelector(SEL.slugSource);
      if (el) {
        const s = el.textContent.trim();
        if (s) slugToScope.set(s, scope);
      }
    });

    // Append a clone for each bookmarked slug
    bookmarks.forEach(function (slug) {
      const scope = slugToScope.get(slug);
      if (!scope) {
        console.warn(LOG, 'Scope not found for slug:', slug);
        return;
      }

      const data = getEventDataFromScope(scope);

      const clone = template.cloneNode(true);
      clone.removeAttribute('data-favourites-template');
      clone.classList.remove('is-template');
      clone.setAttribute('data-target-slug', slug);

      const favArtist = clone.querySelector('[data-fav-artist]');
      const favVenue  = clone.querySelector('[data-fav-venue]');
      const favDate   = clone.querySelector('[data-fav-date]');
      const favCity   = clone.querySelector('[data-fav-city]');

      if (favArtist) favArtist.textContent = data.artist;
      if (favVenue)  favVenue.textContent  = data.venue;
      if (favDate)   favDate.textContent   = data.date;
      if (favCity)   favCity.textContent    = data.city;

      listWrapper.appendChild(clone);
    });

    // Show/hide empty state based on visible item count
    const visibleCount = listWrapper.querySelectorAll(':scope > :not(.is-template)').length;
    if (emptyMsg) {
      if (visibleCount === 0) {
        emptyMsg.classList.remove('is-hidden');
      } else {
        emptyMsg.classList.add('is-hidden');
      }
    }
  }

  // ── Master sync ──
  function syncAll(currentSlug) {
    if (currentSlug) updateModalButton(currentSlug);
    updateFeedIndicators();
    populateFavourites();
  }

  // ── Track active modal slug from the card that triggered the open ──
  // Webflow IX2 may use a shared modal overlay (not nested per CMS item),
  // so we capture the slug at click time from the triggering card's scope.
  document.addEventListener('click', function (e) {
    const trigger = e.target.closest('.modal-open-button, .modal-open-hitarea');
    if (!trigger) return;

    const scope = trigger.closest(SEL.modalScope);
    if (!scope) return;

    const el = scope.querySelector(SEL.slugSource) || scope.querySelector(SEL.feedSlug);
    activeModalSlug = el ? (el.textContent.trim() || null) : null;
    console.log(LOG, 'Modal opened for slug:', activeModalSlug);
  }, true); // capture phase — runs before Webflow handlers

  // Clear active slug when modal closes
  document.addEventListener('click', function (e) {
    if (e.target.closest('.modal-close-button')) {
      activeModalSlug = null;
    }
  });

  // ── Debounce for rapid clicks ──
  let toggleLock = false;

  // ── Event: Bookmark toggle button click ──
  document.addEventListener('click', function (e) {
    const btn = e.target.closest(SEL.toggleBtn);
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    if (toggleLock) return;
    toggleLock = true;
    setTimeout(function () { toggleLock = false; }, 300);

    const slug = getCurrentSlug();
    if (!slug) {
      console.warn(LOG, 'No event slug found in modal.');
      return;
    }

    if (isBookmarked(slug)) {
      removeBookmark(slug);
    } else {
      addBookmark(slug);
    }

    syncAll(slug);
  });

  // ── Modal open detection: sync button state ──
  // Observe class changes on every .event_modal_scope to catch whichever
  // modal is opened (Webflow generates one scope per CMS item).
  function observeModalOpens() {
    const scopes = document.querySelectorAll(SEL.modalScope);
    scopes.forEach(function (scope) {
      const modal = scope.querySelector('.event_modal');
      if (!modal) return;

      const obs = new MutationObserver(function () {
        if (modal.classList.contains('is-open')) {
          setTimeout(function () {
            const slug = getCurrentSlug();
            if (slug) updateModalButton(slug);
          }, 100);
        }
      });
      obs.observe(modal, { attributes: true, attributeFilter: ['class'] });
    });
  }

  // ── Initial sync on page load ──
  function waitForCardsAndInit() {
    let attempts = 0;
    const check = setInterval(function () {
      const cards = document.querySelectorAll(SEL.feedCard);
      attempts++;
      if (cards.length > 1 || attempts > 40) {
        clearInterval(check);
        observeModalOpens();
        console.log(LOG, 'Initialized with', bookmarks.length, 'bookmark(s).');
        syncAll(null); // no modal open at init
      }
    }, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForCardsAndInit);
  } else {
    waitForCardsAndInit();
  }

})();
