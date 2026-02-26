/**
 * sooon-hybrid-feed.js — Phase 1 + Phase 2
 *
 * Phase 1: Webflow loads all CMS cards; we trim the DOM to KEEP_CARDS.
 * Phase 2: Inject cards on-demand from filter list data as user scrolls.
 *
 * Integration notes:
 * - sooon-core.js MutationObserver auto-handles audio injection for appended cards
 * - sooon-core.js audioObserver auto-handles play/pause for appended cards
 * - Modals use event delegation — no rebinding needed
 * - sooon-bookmarks.js uses MutationObserver — auto-detects new cards
 *
 * Testing checklist:
 * - [ ] Scroll to card 5 → card 6 appears
 * - [ ] Card 6 has correct artist / venue / date
 * - [ ] Card 6 audio plays on scroll (sooon-core handles it)
 * - [ ] Card 6 modal opens correctly
 * - [ ] Scroll to card 6 → card 7 appears
 * - [ ] Fast scrolling doesn't duplicate injections (isInjecting guard)
 * - [ ] Reaching last event logs "End of events" and stops observing
 */
(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────────────
  var KEEP_CARDS       = 5;
  var POLL_INTERVAL    = 50;   // ms between card-existence checks
  var MAX_ATTEMPTS     = 40;   // 2 s total before giving up
  var INJECT_THRESHOLD = 0.8;  // Fire when last card is 80% visible

  // ── State ───────────────────────────────────────────────────────────────────
  var currentIndex = KEEP_CARDS; // next filterItems index to inject
  var isInjecting  = false;
  var cardTemplate = null;
  var filterItems  = [];
  var feedContainer = null;
  var sentinel      = null;      // last observed card
  var cardObserver  = null;

  // ──────────────────────────────────────────────────────────────────────────────
  // PHASE 1: Wait for Webflow CMS, trim feed to KEEP_CARDS
  // ──────────────────────────────────────────────────────────────────────────────

  function pollForCards(callback) {
    var attempts = 0;
    var timer = setInterval(function () {
      var cards = document.querySelectorAll('.card_feed_item');
      attempts++;
      if (cards.length > 0) {
        clearInterval(timer);
        callback(cards);
      } else if (attempts >= MAX_ATTEMPTS) {
        clearInterval(timer);
        console.warn('[Hybrid] Timed out waiting for feed cards');
      }
    }, POLL_INTERVAL);
  }

  function init(cards) {
    console.log('[Hybrid] Initializing — ' + cards.length + ' cards in DOM');

    feedContainer = document.querySelector('.card_feed');

    var removed = 0;
    cards.forEach(function (card, index) {
      if (index >= KEEP_CARDS) {
        card.remove();
        removed++;
      }
    });

    var remaining = document.querySelectorAll('.card_feed_item').length;
    console.log('[Hybrid] Removed ' + removed + ' cards, ' + remaining + ' remaining');

    window.sooonHybridReady = true;
    console.log('[Hybrid] Phase 1 complete — feed trimmed to ' + remaining + ' cards');

    setupInfiniteScroll();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PHASE 2: Infinite scroll injection from filter list data
  // ──────────────────────────────────────────────────────────────────────────────

  function setupInfiniteScroll() {
    if (!feedContainer) {
      console.warn('[Hybrid] Phase 2: feed container missing');
      return;
    }

    // Index filter items
    document.querySelectorAll('.stacked-list2_item[data-target-slug]').forEach(function (el) {
      filterItems.push(el);
    });
    console.log('[Hybrid] Phase 2: indexed ' + filterItems.length + ' filter items');

    if (!filterItems.length) {
      console.warn('[Hybrid] Phase 2: no filter items — infinite scroll disabled');
      return;
    }

    // Clone first card as reusable template
    var firstCard = feedContainer.querySelector('.card_feed_item');
    if (!firstCard) {
      console.warn('[Hybrid] Phase 2: no card to use as template');
      return;
    }
    cardTemplate = firstCard.cloneNode(true);
    console.log('[Hybrid] Phase 2: template cloned');

    // Single reusable observer — re-anchored after each injection
    cardObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) injectNextCard();
      });
    }, { threshold: INJECT_THRESHOLD });

    observeLastCard();
    console.log('[Hybrid] Phase 2: infinite scroll ready');
  }

  function observeLastCard() {
    if (!cardObserver) return;
    var cards = feedContainer.querySelectorAll('.card_feed_item');
    if (!cards.length) return;

    var last = cards[cards.length - 1];
    if (last === sentinel) return;

    if (sentinel) cardObserver.unobserve(sentinel);
    cardObserver.observe(last);
    sentinel = last;
    console.log('[Hybrid] Observer anchored to card ' + cards.length);
  }

  function injectNextCard() {
    if (isInjecting) return;
    if (currentIndex >= filterItems.length) {
      console.log('[Hybrid] End of events (' + filterItems.length + ' total)');
      if (cardObserver) cardObserver.disconnect();
      return;
    }

    isInjecting = true;
    var filterItem = filterItems[currentIndex];
    var slug = filterItem.getAttribute('data-target-slug') || '';
    console.log('[Hybrid] Injecting card ' + (currentIndex + 1) + '/' + filterItems.length + ' — slug: ' + slug);

    try {
      var card = buildCard(filterItem);
      feedContainer.appendChild(card);
      currentIndex++;
      observeLastCard();
    } catch (err) {
      console.error('[Hybrid] Injection error at index ' + currentIndex + ':', err);
    }

    isInjecting = false;
  }

  function buildCard(filterItem) {
    var clone = cardTemplate.cloneNode(true);

    // Strip injected audio — sooon-core.js MutationObserver will re-inject
    // fresh <audio> elements using the data-audio-url-* attributes we set below.
    clone.querySelectorAll('audio').forEach(function (el) { el.remove(); });
    clone.removeAttribute('data-audio-injected');

    replaceCardData(clone, filterItem);
    return clone;
  }

  function replaceCardData(clone, filterItem) {
    var slug      = filterItem.getAttribute('data-target-slug')  || '';
    var artist1   = filterItem.getAttribute('data-artist-1')     || '';
    var artist2   = filterItem.getAttribute('data-artist-2')     || '';
    var artist3   = filterItem.getAttribute('data-artist-3')     || '';
    var audio1    = filterItem.getAttribute('data-audio-url-1')  || '';
    var audio2    = filterItem.getAttribute('data-audio-url-2')  || '';
    var audio3    = filterItem.getAttribute('data-audio-url-3')  || '';
    var video1    = filterItem.getAttribute('data-video-url-1')  || '';
    var video2    = filterItem.getAttribute('data-video-url-2')  || '';
    var video3    = filterItem.getAttribute('data-video-url-3')  || '';
    var venue     = filterItem.getAttribute('data-venue-name')   || '';
    var city      = filterItem.getAttribute('data-venue-city')   || '';
    var ticket    = filterItem.getAttribute('data-ticket-link')  || '';
    var date      = filterItem.getAttribute('data-date')         || '';

    // ── Root card attributes (sooon-core reads data-audio-url-* for injection) ──
    clone.setAttribute('data-event-slug',  slug);
    clone.setAttribute('data-audio-url-1', audio1);
    clone.setAttribute('data-audio-url-2', audio2);
    clone.setAttribute('data-audio-url-3', audio3);
    clone.setAttribute('data-video-url-1', video1);
    clone.setAttribute('data-video-url-2', video2);
    clone.setAttribute('data-video-url-3', video3);
    clone.setAttribute('data-venue-name',  venue);
    clone.setAttribute('data-venue-city',  city);
    clone.setAttribute('data-ticket-link', ticket);
    clone.setAttribute('data-date',        date);

    // ── Slug references inside the card ──
    clone.querySelectorAll('[data-event-slug]').forEach(function (el) {
      el.setAttribute('data-event-slug', slug);
    });

    // ── Artist sections (1–3) — update name, hide sections with no artist ──
    var artistNames = [artist1, artist2, artist3];
    for (var i = 1; i <= 3; i++) {
      var name = artistNames[i - 1];
      clone.querySelectorAll('[data-artist-id="' + i + '"]').forEach(function (el) {
        if (el.matches('audio, video')) return; // handled separately below

        var titleEl = el.querySelector('.artist-title');
        if (titleEl && name) titleEl.textContent = name;

        if (!name) el.style.display = 'none';
      });
    }

    // ── Venue & city text ──
    var venueEl = clone.querySelector('.event_location-venue');
    if (venueEl) venueEl.textContent = venue;

    var cityEl = clone.querySelector('.event_location-city');
    if (cityEl) cityEl.textContent = city;

    // ── Date text ──
    var dateEl = clone.querySelector('.date_detailed');
    if (dateEl) dateEl.textContent = date;

    // ── Ticket links — replace href on external / non-hash anchor tags ──
    if (ticket) {
      clone.querySelectorAll('a[href]').forEach(function (a) {
        var href = a.getAttribute('href') || '';
        if (href && href !== '#' && !href.startsWith('/') && !href.startsWith('javascript')) {
          a.setAttribute('href', ticket);
        }
      });
    }

    // ── Video elements ──
    var videoUrls = [video1, video2, video3];
    clone.querySelectorAll('video[data-artist-id]').forEach(function (vid) {
      var id = parseInt(vid.getAttribute('data-artist-id'), 10);
      if (id >= 1 && id <= 3 && videoUrls[id - 1]) vid.src = videoUrls[id - 1];
    });

    // ── Remove lazy-loading — card is being injected near the viewport ──
    clone.querySelectorAll('[loading="lazy"]').forEach(function (el) {
      el.removeAttribute('loading');
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PUBLIC API (used by sooon-core.js filter click handler)
  // ──────────────────────────────────────────────────────────────────────────────
  window.sooonHybridFeed = {
    getIndex:  function () { return currentIndex; },
    getTotal:  function () { return filterItems.length; },
    loadMore:  function () { injectNextCard(); },
    injectCard: function (slug) {
      // Inject everything in order up to and including the requested slug
      var targetIdx = -1;
      for (var i = 0; i < filterItems.length; i++) {
        if (filterItems[i].getAttribute('data-target-slug') === slug) {
          targetIdx = i;
          break;
        }
      }
      if (targetIdx < 0 || targetIdx < currentIndex) return;
      while (currentIndex <= targetIdx) injectNextCard();
    }
  };

  // ── Entry point ──────────────────────────────────────────────────────────────
  console.log('[Hybrid] Waiting for Webflow CMS cards...');
  pollForCards(init);
})();
