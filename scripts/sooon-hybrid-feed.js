/**
 * sooon-hybrid-feed.js
 * Loads 3 cards from Webflow, injects the rest from filter list on scroll/click.
 * Requires: Webflow feed collection list limited to 3 items.
 * The existing MutationObserver in sooon-core.js auto-handles audio/lazy-load
 * for every card appended to .card_feed — no changes needed there.
 */
(function () {
  'use strict';

  var CONFIG = {
    INITIAL_CARDS: 3,
    CARDS_PER_BATCH: 5,
    LOAD_THRESHOLD: '400px'
  };

  var filterItems = [];     // [{slug, element}] ordered as in filter list
  var injectedSlugs = new Set();
  var currentIndex = CONFIG.INITIAL_CARDS;  // filter items already covered by Webflow cards
  var cardTemplate = null;
  var feedContainer = null;

  // ── Wait for Webflow CMS to render at least one card ──
  function waitForTemplate(callback) {
    var attempts = 0;
    var check = setInterval(function () {
      var card = document.querySelector('.card_feed_item');
      attempts++;
      if (card || attempts > 60) {
        clearInterval(check);
        callback(!!card);
      }
    }, 50);
  }

  // ── Clone the first feed card as a reusable template ──
  function extractTemplate() {
    var firstCard = feedContainer.querySelector('.card_feed_item');
    if (!firstCard) {
      console.warn('[Hybrid] No feed card found — cannot extract template');
      return false;
    }
    cardTemplate = firstCard.cloneNode(true);
    cardTemplate.removeAttribute('data-audio-injected');
    console.log('[Hybrid] Template extracted from first card');
    return true;
  }

  // ── Index all filter list items ──
  function indexFilterItems() {
    var items = document.querySelectorAll('.stacked-list2_item[data-target-slug]');
    items.forEach(function (item) {
      filterItems.push({
        slug: item.getAttribute('data-target-slug'),
        element: item
      });
    });
    console.log('[Hybrid] Indexed ' + filterItems.length + ' events from filter list');
  }

  // ── Record slugs of the initial Webflow-loaded cards ──
  function markExistingCards() {
    feedContainer.querySelectorAll('.card_feed_item[data-event-slug]').forEach(function (card) {
      var slug = card.getAttribute('data-event-slug');
      if (slug) injectedSlugs.add(slug);
    });
  }

  // ── Build a card DOM node for a given slug ──
  function createCard(slug) {
    if (!cardTemplate) return null;

    var card = cardTemplate.cloneNode(true);
    card.setAttribute('data-event-slug', slug);
    card.removeAttribute('data-audio-injected');

    // If there's already a real card for this slug (e.g. one of the initial 3),
    // copy its CMS data-attributes (audio URLs, city, etc.) onto the clone.
    var source = feedContainer.querySelector('.card_feed_item[data-event-slug="' + slug + '"]');
    if (source) {
      Array.from(source.attributes).forEach(function (attr) {
        if (attr.name.startsWith('data-')) card.setAttribute(attr.name, attr.value);
      });
    }

    injectedSlugs.add(slug);
    return card;
  }

  // ── Append next CARDS_PER_BATCH items from the filter list ──
  function injectNextBatch(count) {
    count = count || CONFIG.CARDS_PER_BATCH;
    if (currentIndex >= filterItems.length) {
      console.log('[Hybrid] All cards loaded');
      return;
    }

    var end = Math.min(currentIndex + count, filterItems.length);
    console.log('[Hybrid] Injecting cards ' + (currentIndex + 1) + '–' + end);

    for (var i = currentIndex; i < end; i++) {
      var slug = filterItems[i].slug;
      if (injectedSlugs.has(slug)) continue;
      var card = createCard(slug);
      if (card) feedContainer.appendChild(card);
    }

    currentIndex = end;
    window.dispatchEvent(new CustomEvent('hybrid-batch-loaded'));
  }

  // ── Inject a specific card by slug (used by filter click handler) ──
  // Also injects everything between currentIndex and the target so
  // the feed stays ordered.
  function injectCardBySlug(slug) {
    if (injectedSlugs.has(slug)) return; // already present

    var targetIdx = -1;
    for (var i = 0; i < filterItems.length; i++) {
      if (filterItems[i].slug === slug) { targetIdx = i; break; }
    }
    if (targetIdx < 0) return; // slug not in filter list at all

    // Inject from currentIndex up to and including the target
    var end = Math.min(targetIdx + 1, filterItems.length);
    for (var j = currentIndex; j < end; j++) {
      var s = filterItems[j].slug;
      if (injectedSlugs.has(s)) continue;
      var card = createCard(s);
      if (card) feedContainer.appendChild(card);
    }
    currentIndex = Math.max(currentIndex, end);
    window.dispatchEvent(new CustomEvent('hybrid-batch-loaded'));
  }

  // ── Observe the last card in the feed; inject more as it nears viewport ──
  function setupScrollObserver() {
    var sentinel = null;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && currentIndex < filterItems.length) {
          injectNextBatch();
        }
      });
    }, { rootMargin: CONFIG.LOAD_THRESHOLD });

    function reanchor() {
      var cards = feedContainer.querySelectorAll('.card_feed_item');
      if (!cards.length) return;
      var last = cards[cards.length - 1];
      if (last !== sentinel) {
        if (sentinel) observer.unobserve(sentinel);
        observer.observe(last);
        sentinel = last;
      }
    }

    reanchor();
    window.addEventListener('hybrid-batch-loaded', reanchor);
  }

  // ── Main init ──
  function init() {
    feedContainer = document.querySelector('.card_feed');
    if (!feedContainer) {
      console.warn('[Hybrid] .card_feed not found');
      return;
    }

    waitForTemplate(function (hasCard) {
      if (!hasCard) {
        console.warn('[Hybrid] No feed cards rendered by Webflow — aborting');
        return;
      }
      extractTemplate();
      indexFilterItems();
      markExistingCards();
      setupScrollObserver();
      console.log('[Hybrid] Ready — ' + filterItems.length + ' total events, '
        + injectedSlugs.size + ' pre-loaded by Webflow');
    });
  }

  // ── Public API ──
  window.sooonHybridFeed = {
    getLoadedCount: function () { return currentIndex; },
    getTotalCount:  function () { return filterItems.length; },
    loadMore:       function () { injectNextBatch(); },
    injectCard:     injectCardBySlug
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
