// ============================================================
// SOOON Bookmarks — Event bookmarking & favourites list — Kombinat2026 variant
// ============================================================
// Allows users to bookmark events from the modal, persists to
// localStorage, populates a favourites list in the filter view,
// and syncs bookmark state across all UI elements.
//
// Slug source: [data-bookmark-action="toggle"] carries the event slug
// in its CMS-bound [data-bookmark-slug] attribute. All other slug
// lookups (feed card dot indicators, favourites list) use
// [data-event-slug-source] or [data-feed-slug] textContent within
// the nearest .event_modal_scope ancestor.
// ============================================================

(function () {
  'use strict';

  const LOG = '[Kombinat-Bookmarks]';
  const STORAGE_KEY = 'kombinat_bookmarks';

  // ── Selectors ──
  const SEL = {
    // Bookmark button (CMS-bound data-bookmark-slug carries the slug)
    toggleBtn:      '[data-bookmark-action="toggle"]',
    iconInactive:   '.bookmark-icon-inactive',
    iconActive:     '.bookmark-icon-active',

    // Slug sources for feed card indicators & favourites list lookup
    slugSource:     '[data-event-slug-source="true"]',
    feedSlug:       '[data-feed-slug="true"]',

    // Modal structure (used only for icon state sync on open)
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
   * Get the slug for a feed card via its nearest .event_modal_scope ancestor.
   */
  function getCardSlug(card) {
    const scope = card.closest(SEL.modalScope);
    if (!scope) return null;
    const el = scope.querySelector(SEL.slugSource) || scope.querySelector(SEL.feedSlug);
    return el ? (el.textContent.trim() || null) : null;
  }

  /**
   * Extract event display data from a modal scope for the favourites list.
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

  // ── UI: Modal bookmark button icons + label ──
  // Finds the bookmark button in the open modal and updates icon visibility
  // and the optional text label.
  //
  // Label setup in Webflow (all optional — script degrades gracefully):
  //   • On the button: data-bookmark-label-inactive="Save show"
  //                    data-bookmark-label-active="Saved show"
  //   • Inside the button: a child element with data-bookmark-label (any tag)
  function updateModalButton(slug) {
    const btn = document.querySelector(SEL.openModal + ' ' + SEL.toggleBtn)
             || document.querySelector(SEL.toggleBtn + '[data-bookmark-slug="' + slug + '"]');
    if (!btn) return;

    const container = btn.closest(SEL.modalScope) || btn.parentElement;
    const inactive = container.querySelector(SEL.iconInactive);
    const active   = container.querySelector(SEL.iconActive);

    const saved = isBookmarked(slug);

    if (inactive && active) {
      active.classList.toggle('is-hidden', !saved);
      inactive.classList.toggle('is-hidden', saved);
    }

    // Update text label if present
    const labelEl = btn.querySelector('[data-bookmark-label]');
    if (labelEl) {
      const text = saved
        ? (btn.getAttribute('data-bookmark-label-active')   || 'Saved show')
        : (btn.getAttribute('data-bookmark-label-inactive') || 'Save show');
      labelEl.textContent = text;
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

    // Remove all items except the template
    Array.from(listWrapper.children).forEach(function (child) {
      if (!child.classList.contains('is-template')) {
        listWrapper.removeChild(child);
      }
    });

    // Build slug → scope lookup from all CMS scopes
    const slugToScope = new Map();
    document.querySelectorAll(SEL.modalScope).forEach(function (scope) {
      const el = scope.querySelector(SEL.slugSource);
      if (el) {
        const s = el.textContent.trim();
        if (s) slugToScope.set(s, scope);
      }
    });

    // Also index by bookmark button's data-bookmark-slug (CMS-bound)
    document.querySelectorAll(SEL.toggleBtn + '[data-bookmark-slug]').forEach(function (btn) {
      const s = btn.getAttribute('data-bookmark-slug').trim();
      if (s && !slugToScope.has(s)) {
        // Scope isn't found via slugSource — store the button's closest scope or modal
        const scope = btn.closest(SEL.modalScope) || btn.closest(SEL.openModal);
        if (scope) slugToScope.set(s, scope);
      }
    });

    // Collect bookmark data, then sort by date ascending (earliest first)
    var bookmarkItems = [];
    bookmarks.forEach(function (slug) {
      const scope = slugToScope.get(slug);
      if (!scope) {
        console.warn(LOG, 'Scope not found for slug:', slug);
        return;
      }
      const data = getEventDataFromScope(scope);
      bookmarkItems.push({ slug: slug, data: data });
    });

    function parseTimeToMinutes(str) {
      if (!str) return Infinity;
      var m = str.trim().match(/^(\d+):(\d+)\s*(am|pm)$/i);
      if (!m) return Infinity;
      var h = parseInt(m[1], 10);
      var min = parseInt(m[2], 10);
      var isPm = m[3].toLowerCase() === 'pm';
      if (isPm && h !== 12) h += 12;
      if (!isPm && h === 12) h = 0;
      return h * 60 + min;
    }

    bookmarkItems.sort(function (a, b) {
      return parseTimeToMinutes(a.data.date) - parseTimeToMinutes(b.data.date);
    });

    // Append a clone for each bookmarked slug in sorted order
    bookmarkItems.forEach(function (item) {
      const clone = template.cloneNode(true);
      clone.removeAttribute('data-favourites-template');
      clone.classList.remove('is-template');
      clone.setAttribute('data-target-slug', item.slug);

      const favArtist = clone.querySelector('[data-fav-artist]');
      const favVenue  = clone.querySelector('[data-fav-venue]');
      const favDate   = clone.querySelector('[data-fav-date]');
      const favCity   = clone.querySelector('[data-fav-city]');

      if (favArtist) favArtist.textContent = item.data.artist;
      if (favVenue)  favVenue.textContent  = item.data.venue;
      if (favDate)   favDate.textContent   = item.data.date;
      if (favCity)   favCity.textContent   = item.data.city;

      listWrapper.appendChild(clone);
    });

    // Show/hide empty state
    const visibleCount = listWrapper.querySelectorAll(':scope > :not(.is-template)').length;
    if (emptyMsg) {
      emptyMsg.classList.toggle('is-hidden', visibleCount > 0);
    }
  }

  // ── Master sync ──
  function syncAll(slug) {
    if (slug) updateModalButton(slug);
    updateFeedIndicators();
    populateFavourites();
  }

  // ── Event: Bookmark toggle button click ──
  // Slug comes directly from CMS-bound [data-bookmark-slug] on the button.
  // Uses capture phase + stopImmediatePropagation to prevent Webflow IX2
  // (which also listens at document level) from seeing the click and
  // re-triggering a modal-open interaction on the parent card.
  document.addEventListener('click', function (e) {
    const btn = e.target.closest(SEL.toggleBtn);
    if (!btn) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const slug = (btn.getAttribute('data-bookmark-slug') || '').trim();
    if (!slug) {
      console.warn(LOG, 'No slug on bookmark button (data-bookmark-slug empty).');
      return;
    }

    if (isBookmarked(slug)) {
      removeBookmark(slug);
    } else {
      addBookmark(slug);
    }

    syncAll(slug);
  }, true);

  // ── Initial sync on page load ──
  function waitForCardsAndInit() {
    let attempts = 0;
    const check = setInterval(function () {
      const cards = document.querySelectorAll(SEL.feedCard);
      attempts++;
      if (cards.length > 1 || attempts > 40) {
        clearInterval(check);
        console.log(LOG, 'Initialized with', bookmarks.length, 'bookmark(s).');
        syncAll(null);
      }
    }, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForCardsAndInit);
  } else {
    waitForCardsAndInit();
  }

})();
