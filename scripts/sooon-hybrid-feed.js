/**
 * sooon-hybrid-feed.js — Phase 1
 * Trims the feed to the first 5 cards after Webflow CMS populates.
 * Proves that fewer DOM nodes = faster load before Phase 2 (dynamic injection).
 */
(function () {
  'use strict';

  var KEEP_CARDS = 5;
  var POLL_INTERVAL = 50;
  var MAX_ATTEMPTS = 40;

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
  }

  console.log('[Hybrid] Waiting for Webflow CMS cards...');
  pollForCards(init);
})();
