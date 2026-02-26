/**
 * sooon-hybrid-feed.js — Phase 1 + Phase 2 (DEBUG BUILD)
 *
 * Phase 1: Webflow loads all CMS cards; we trim the DOM to KEEP_CARDS.
 * Phase 2: Inject cards on-demand from filter list data as user scrolls.
 *
 * Integration notes:
 * - sooon-core.js MutationObserver auto-handles audio injection for appended cards
 * - sooon-core.js audioObserver auto-handles play/pause for appended cards
 * - Modals use event delegation — no rebinding needed
 * - sooon-bookmarks.js uses MutationObserver — auto-detects new cards
 */
(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────────────
  var KEEP_CARDS       = 5;
  var POLL_INTERVAL    = 50;
  var MAX_ATTEMPTS     = 40;
  var INJECT_THRESHOLD = 0.5;   // Lowered from 0.8 — snap-scroll can skip 0.8

  // ── State ───────────────────────────────────────────────────────────────────
  var currentIndex  = KEEP_CARDS;
  var isInjecting   = false;
  var cardTemplate  = null;
  var filterItems   = [];
  var feedContainer = null;
  var sentinel      = null;
  var cardObserver  = null;

  // ──────────────────────────────────────────────────────────────────────────────
  // DIAGNOSTICS
  // ──────────────────────────────────────────────────────────────────────────────

  function inspectDOM() {
    console.log('[Hybrid] ══ DOM INSPECTION ══');

    var feed = document.querySelector('.card_feed');
    var feedCards = document.querySelectorAll('.card_feed_item');
    var filterList = document.querySelector('.stacked-list2_list');
    var filterAll = document.querySelectorAll('.stacked-list2_item');
    var filterWithSlug = document.querySelectorAll('.stacked-list2_item[data-target-slug]');

    console.log('[Hybrid] .card_feed found:', !!feed);
    console.log('[Hybrid] .card_feed_item count:', feedCards.length);
    console.log('[Hybrid] .stacked-list2_list found:', !!filterList);

    if (filterList) {
      var cs = window.getComputedStyle(filterList);
      console.log('[Hybrid] Filter list display:', cs.display,
                  '| visibility:', cs.visibility,
                  '| height:', cs.height);

      // Walk up and check for hidden parents
      var el = filterList.parentElement;
      var depth = 0;
      while (el && depth < 6) {
        var pcs = window.getComputedStyle(el);
        if (pcs.display === 'none' || pcs.visibility === 'hidden') {
          console.warn('[Hybrid] ⚠ Filter list ancestor is hidden:',
                       el.tagName, el.className, '| display:', pcs.display);
        }
        el = el.parentElement;
        depth++;
      }
    }

    console.log('[Hybrid] .stacked-list2_item total:', filterAll.length);
    console.log('[Hybrid] .stacked-list2_item[data-target-slug]:', filterWithSlug.length);

    if (filterWithSlug.length > 0) {
      var first = filterWithSlug[0];
      var sixth = filterWithSlug[5];
      console.log('[Hybrid] Filter item #0 attrs:', {
        slug:    first.getAttribute('data-target-slug'),
        artist1: first.getAttribute('data-artist-1'),
        venue:   first.getAttribute('data-venue-name'),
        audio1:  first.getAttribute('data-audio-url-1') ? '✓ present' : '✗ missing'
      });
      if (sixth) {
        console.log('[Hybrid] Filter item #5 (card 6) attrs:', {
          slug:    sixth.getAttribute('data-target-slug'),
          artist1: sixth.getAttribute('data-artist-1'),
          venue:   sixth.getAttribute('data-venue-name'),
          audio1:  sixth.getAttribute('data-audio-url-1') ? '✓ present' : '✗ missing'
        });
      } else {
        console.warn('[Hybrid] ⚠ No 6th filter item (index 5) — filter list has fewer than 6 items');
      }
    }

    if (feed) {
      var fcs = window.getComputedStyle(feed);
      console.log('[Hybrid] .card_feed overflow-y:', fcs.overflowY,
                  '| height:', fcs.height,
                  '| scroll-snap-type:', fcs.scrollSnapType || 'none');
    }

    console.log('[Hybrid] ══ END INSPECTION ══');
  }

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

    inspectDOM();
    setupInfiniteScroll();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PHASE 2: Infinite scroll injection from filter list data
  // ──────────────────────────────────────────────────────────────────────────────

  function setupInfiniteScroll() {
    console.log('[Hybrid] ── Setting up infinite scroll ──');

    if (!feedContainer) {
      console.warn('[Hybrid] Phase 2: feed container missing — aborting');
      return;
    }

    // Index filter items
    document.querySelectorAll('.stacked-list2_item[data-target-slug]').forEach(function (el) {
      filterItems.push(el);
    });
    console.log('[Hybrid] Filter items indexed:', filterItems.length);

    if (!filterItems.length) {
      console.warn('[Hybrid] ⚠ No filter items found — infinite scroll disabled');
      console.warn('[Hybrid] ⚠ Possible causes: filter list not in DOM yet, ' +
                   'missing data-target-slug attributes, or wrong selector');
      return;
    }

    // Clone first card as template
    var firstCard = feedContainer.querySelector('.card_feed_item');
    if (!firstCard) {
      console.warn('[Hybrid] ⚠ No card to use as template');
      return;
    }
    cardTemplate = firstCard.cloneNode(true);
    console.log('[Hybrid] Template cloned from first card');
    console.log('[Hybrid] Template slug:', firstCard.getAttribute('data-event-slug'));

    // Setup IntersectionObserver
    // Note: root:null = viewport. If .card_feed is the scroll container, change
    // root to feedContainer. Log will tell us which is correct.
    cardObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        console.log('[Hybrid] Observer fired — isIntersecting:', entry.isIntersecting,
                    '| ratio:', entry.intersectionRatio.toFixed(2),
                    '| target:', entry.target.getAttribute('data-event-slug') || entry.target.className);
        if (entry.isIntersecting) {
          console.log('[Hybrid] ✓ Threshold reached — calling injectNextCard()');
          injectNextCard();
        }
      });
    }, { threshold: INJECT_THRESHOLD });  // root:null = viewport

    observeLastCard();

    // Scroll fallback: fires when near the bottom of the feed, regardless of
    // whether IntersectionObserver works (covers snap-scroll edge cases on iOS)
    setupScrollFallback();

    console.log('[Hybrid] Phase 2 ready — observer threshold:', INJECT_THRESHOLD);
  }

  function observeLastCard() {
    if (!cardObserver) return;
    var cards = feedContainer.querySelectorAll('.card_feed_item');
    if (!cards.length) return;

    var last = cards[cards.length - 1];
    if (last === sentinel) {
      console.log('[Hybrid] Observer: already watching last card — no change');
      return;
    }

    if (sentinel) cardObserver.unobserve(sentinel);
    cardObserver.observe(last);
    sentinel = last;
    console.log('[Hybrid] Observer anchored to card', cards.length,
                '| slug:', last.getAttribute('data-event-slug'));
  }

  function setupScrollFallback() {
    // Determine the actual scroll container:
    // - If .card_feed scrolls internally, listen on it
    // - Otherwise listen on window
    var scrollTarget = window;
    if (feedContainer) {
      var fcs = window.getComputedStyle(feedContainer);
      if (fcs.overflowY === 'scroll' || fcs.overflowY === 'auto') {
        scrollTarget = feedContainer;
        console.log('[Hybrid] Scroll fallback: listening on .card_feed (internal scroll)');
      } else {
        console.log('[Hybrid] Scroll fallback: listening on window');
      }
    }

    var fallbackFired = false;
    scrollTarget.addEventListener('scroll', function () {
      if (currentIndex >= filterItems.length) return;

      var cards = document.querySelectorAll('.card_feed_item');
      if (!cards.length) return;
      var lastCard = cards[cards.length - 1];
      var rect = lastCard.getBoundingClientRect();

      // Fire when last card top enters the lower 30% of the viewport
      var triggerLine = window.innerHeight * 1.3;
      if (rect.top < triggerLine) {
        if (!fallbackFired) {
          console.log('[Hybrid] ↕ Scroll fallback triggered — last card rect.top:',
                      Math.round(rect.top), '< trigger:', Math.round(triggerLine));
          fallbackFired = true;
          setTimeout(function () { fallbackFired = false; }, 500); // debounce
          injectNextCard();
        }
      }
    }, { passive: true });
  }

  function injectNextCard() {
    console.log('[Hybrid] injectNextCard() — index:', currentIndex,
                '| total:', filterItems.length,
                '| isInjecting:', isInjecting);

    if (isInjecting) {
      console.log('[Hybrid] Skipped — injection already in progress');
      return;
    }
    if (currentIndex >= filterItems.length) {
      console.log('[Hybrid] End of events (' + filterItems.length + ' total)');
      if (cardObserver) cardObserver.disconnect();
      return;
    }

    isInjecting = true;

    var filterItem = filterItems[currentIndex];
    var slug = filterItem.getAttribute('data-target-slug') || '(no slug)';
    console.log('[Hybrid] Reading filter item #' + currentIndex + ' — slug:', slug);
    console.log('[Hybrid] Filter item data:', {
      artist1: filterItem.getAttribute('data-artist-1') || '✗',
      venue:   filterItem.getAttribute('data-venue-name') || '✗',
      city:    filterItem.getAttribute('data-venue-city') || '✗',
      audio1:  filterItem.getAttribute('data-audio-url-1') ? '✓' : '✗',
      date:    filterItem.getAttribute('data-date') || '✗'
    });

    try {
      var card = buildCard(filterItem);
      console.log('[Hybrid] Card built — appending to feed');
      feedContainer.appendChild(card);
      currentIndex++;
      console.log('[Hybrid] ✓ Card appended — feed now has',
                  document.querySelectorAll('.card_feed_item').length,
                  'cards | nextIndex:', currentIndex);
      observeLastCard();
    } catch (err) {
      console.error('[Hybrid] ✗ Injection error at index', currentIndex, ':', err);
    }

    isInjecting = false;
  }

  function buildCard(filterItem) {
    var clone = cardTemplate.cloneNode(true);
    // Strip injected audio — sooon-core.js MutationObserver re-injects
    // fresh <audio> from the data-audio-url-* attrs we set in replaceCardData.
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

    // ── Root card attributes ──
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

    // ── Slug references inside card ──
    clone.querySelectorAll('[data-event-slug]').forEach(function (el) {
      el.setAttribute('data-event-slug', slug);
    });

    // ── Artist sections ──
    var artistNames = [artist1, artist2, artist3];
    for (var i = 1; i <= 3; i++) {
      var name = artistNames[i - 1];
      clone.querySelectorAll('[data-artist-id="' + i + '"]').forEach(function (el) {
        if (el.matches('audio, video')) return;
        var titleEl = el.querySelector('.artist-title');
        if (titleEl && name) titleEl.textContent = name;
        if (!name) el.style.display = 'none';
      });
    }

    // ── Venue, city, date ──
    var venueEl = clone.querySelector('.event_location-venue');
    if (venueEl) venueEl.textContent = venue;

    var cityEl = clone.querySelector('.event_location-city');
    if (cityEl) cityEl.textContent = city;

    var dateEl = clone.querySelector('.date_detailed');
    if (dateEl) dateEl.textContent = date;

    // ── Ticket links ──
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

    // ── Remove lazy-loading ──
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
