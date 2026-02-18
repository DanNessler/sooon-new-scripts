// ============================================================
// SOOON Bookmarks — Event bookmarking & favourites list
// ============================================================
// Allows users to bookmark events from the modal, persists to
// localStorage, populates a favourites list in the filter view,
// and syncs bookmark state across all UI elements.
// ============================================================

(function () {
  'use strict';

  const LOG = '[Bookmarks]';
  const STORAGE_KEY = 'sooon_bookmarks';

  // ── Selectors ──
  const SEL = {
    toggleBtn:      '[data-bookmark-action="toggle"]',
    slugSource:     '[data-event-slug-source="true"]',
    iconInactive:   '.bookmark-icon-inactive',
    iconActive:     '.bookmark-icon-active',
    feedCard:       '.card_feed_item',
    feedSlugAttr:   'data-event-slug',
    bookmarkDot:    '.bookmark-indicator',
    favContainer:   '[data-favourites-list="container"]',
    favTemplate:    '[data-favourites-template="true"]',
    favEmpty:       '[data-favourites-empty="true"]',
    modalScope:     '.event_modal_scope',
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
    const test = '__sooon_ls_test__';
    localStorage.setItem(test, '1');
    localStorage.removeItem(test);
  } catch (_) {
    storageAvailable = false;
    console.warn(LOG, 'localStorage unavailable — bookmarks will not persist.');
  }

  // ── State ──
  let bookmarks = readBookmarks();

  function isBookmarked(slug) {
    return bookmarks.indexOf(slug) !== -1;
  }

  function addBookmark(slug) {
    if (isBookmarked(slug)) return; // prevent duplicates
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

  // ── UI: Modal bookmark button icons ──
  function updateModalButton(slug) {
    const inactive = document.querySelector(SEL.iconInactive);
    const active = document.querySelector(SEL.iconActive);
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
      const slug = card.getAttribute(SEL.feedSlugAttr);
      const dot = card.querySelector(SEL.bookmarkDot);
      if (!slug || !dot) return;

      if (isBookmarked(slug)) {
        dot.classList.remove('is-hidden');
      } else {
        dot.classList.add('is-hidden');
      }
    });
  }

  // ── UI: Favourites list ──
  function populateFavourites() {
    const container = document.querySelector(SEL.favContainer);
    const template = document.querySelector(SEL.favTemplate);
    const emptyMsg = document.querySelector(SEL.favEmpty);

    if (!container) {
      console.error(LOG, 'Favourites container not found.');
      return;
    }
    if (!template) {
      console.error(LOG, 'Favourites template not found.');
      return;
    }

    // Clear previous items (template lives outside container, so it's preserved)
    container.textContent = '';

    if (bookmarks.length === 0) {
      if (emptyMsg) emptyMsg.classList.remove('is-hidden');
      return;
    }

    if (emptyMsg) emptyMsg.classList.add('is-hidden');

    bookmarks.forEach(function (slug) {
      // Find the feed card to extract event data
      const card = document.querySelector(
        SEL.feedCard + '[' + SEL.feedSlugAttr + '="' + CSS.escape(slug) + '"]'
      );

      if (!card) {
        console.warn(LOG, 'Feed card not found for slug:', slug);
        return; // skip orphaned bookmarks
      }

      // Extract data from the feed card's data attributes
      const artist = card.getAttribute('data-event-artist') || '';
      const venue  = card.getAttribute('data-event-venue')  || '';
      const date   = card.getAttribute('data-event-date')   || '';
      const city   = card.getAttribute('data-event-city')   || '';

      // Clone template and populate
      const clone = template.cloneNode(true);
      clone.removeAttribute('data-favourites-template');
      clone.classList.remove('is-hidden');
      clone.setAttribute('data-target-slug', slug);

      const favArtist = clone.querySelector('[data-fav-artist]');
      const favVenue  = clone.querySelector('[data-fav-venue]');
      const favDate   = clone.querySelector('[data-fav-date]');
      const favCity   = clone.querySelector('[data-fav-city]');

      if (favArtist) favArtist.textContent = artist;
      if (favVenue)  favVenue.textContent  = venue;
      if (favDate)   favDate.textContent   = date;
      if (favCity)   favCity.textContent    = city;

      container.appendChild(clone);
    });
  }

  // ── Master sync: update all UI elements ──
  function syncAll(currentSlug) {
    if (currentSlug) updateModalButton(currentSlug);
    updateFeedIndicators();
    populateFavourites();
  }

  // ── Get current event slug from the modal ──
  // Scoped to the open modal to avoid matching stale/hidden elements
  function getCurrentSlug() {
    const modal = document.querySelector(SEL.modalScope);
    const scope = (modal && modal.classList.contains('is-open')) ? modal : document;
    const el = scope.querySelector(SEL.slugSource);
    if (!el) return null;
    return el.getAttribute(SEL.feedSlugAttr) || null;
  }

  // ── Debounce helper for rapid clicks ──
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
  // Uses a MutationObserver to detect when the modal gains .is-open
  const modalScope = document.querySelector(SEL.modalScope);
  if (modalScope) {
    const observer = new MutationObserver(function () {
      if (modalScope.classList.contains('is-open')) {
        // Small delay to let Webflow populate modal content
        setTimeout(function () {
          const slug = getCurrentSlug();
          if (slug) updateModalButton(slug);
        }, 100);
      }
    });
    observer.observe(modalScope, { attributes: true, attributeFilter: ['class'] });
  }

  // ── Initial sync on page load ──
  // Wait for Webflow CMS cards to be populated (mirrors sooon-footer.js pattern)
  function waitForCardsAndInit() {
    let attempts = 0;
    const check = setInterval(function () {
      const cards = document.querySelectorAll(SEL.feedCard);
      attempts++;
      if (cards.length > 1 || attempts > 40) {
        clearInterval(check);
        console.log(LOG, 'Initialized with', bookmarks.length, 'bookmark(s).');
        syncAll(getCurrentSlug());
      }
    }, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForCardsAndInit);
  } else {
    waitForCardsAndInit();
  }

})();
