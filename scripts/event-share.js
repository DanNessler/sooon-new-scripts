//  Event Share Functionality for sooon
//  Handles native sharing with deep links to specific events

(function() {
  'use strict';

  console.log('[Event Share] Script loaded');

  // Configuration
  const config = {
    modalScope: '.event_modal_scope',
    shareButton: '[data-share-action="event-share"]',

    // Modal data selectors (scoped to modal)
    activeArtist: '.artist-title.is-active',
    venue: '.event_location-venue',
    city: '.event_location-city',
    date: '.date_detailed',
    slugSource: '[data-event-slug-source="true"]',

    // Feed card selectors
    feedCard: '.card_feed_item',
    feedSlug: '[data-feed-slug="true"]'
  };

  /**
   * Extract event data from the currently open modal
   * Returns object with all event details or null if modal not found
   */
  function getEventData() {
    console.log('[Event Share] Extracting event data from modal...');

    const modal = document.querySelector(config.modalScope);
    if (!modal) {
      console.warn('[Event Share] Modal not found');
      return null;
    }

    // Extract each piece of data with defensive checks
    const activeArtistEl = modal.querySelector(config.activeArtist);
    const venueEl = modal.querySelector(config.venue);
    const cityEl = modal.querySelector(config.city);
    const dateEl = modal.querySelector(config.date);
    const slugSourceEl = modal.querySelector(config.slugSource);

    // Get slug from element textContent (Finsweet CMS binds it here)
    const slug = slugSourceEl ? slugSourceEl.textContent.trim() : null;

    const data = {
      artist: activeArtistEl ? activeArtistEl.textContent.trim() : '',
      venue: venueEl ? venueEl.textContent.trim() : '',
      city: cityEl ? cityEl.textContent.trim() : '',
      date: dateEl ? dateEl.textContent.trim() : '',
      slug: slug
    };

    console.log('[Event Share] Extracted data:', data);

    // Validate that we have minimum required data
    if (!data.artist || !data.slug) {
      console.warn('[Event Share] Missing required data (artist or slug)');
      return null;
    }

    return data;
  }

  /**
   * Build share text from template
   * Replaces placeholders with actual event data
   */
  function buildShareText(data, template) {
    console.log('[Event Share] Building share text...');

    // Get template from button or use default
    const shareTemplate = template ||
      'Check out {artist-1} at {venue-name}, {venue-city} on {date}! 🤘🫶 via sooon';

    // Replace placeholders with actual data
    let shareText = shareTemplate
      .replace('{artist-1}', data.artist)
      .replace('{venue-name}', data.venue)
      .replace('{venue-city}', data.city)
      .replace('{date}', data.date);

    console.log('[Event Share] Share text:', shareText);
    return shareText;
  }

  /**
   * Build deep link URL to specific event
   * Format: [current-url]#event-[slug]
   */
  function buildDeepLink(slug) {
    const baseUrl = window.location.origin + window.location.pathname;
    const deepLink = `${baseUrl}#event-${slug}`;
    console.log('[Event Share] Deep link:', deepLink);
    return deepLink;
  }

  /**
   * Attempt native Web Share API
   * Falls back to clipboard if not supported
   */
  async function shareEvent(shareText, deepLink) {
    console.log('[Event Share] Attempting to share...');

    // Check if Web Share API is supported
    if (navigator.share) {
      try {
        await navigator.share({
          text: shareText,
          url: deepLink
        });
        console.log('[Event Share] Shared successfully via Web Share API');
        return true;
      } catch (error) {
        // User cancelled or share failed
        if (error.name !== 'AbortError') {
          console.warn('[Event Share] Web Share API failed:', error);
        } else {
          console.log('[Event Share] Share cancelled by user');
        }
        return false;
      }
    } else {
      // Fallback to clipboard
      console.log('[Event Share] Web Share API not supported, using clipboard fallback');
      return await copyToClipboard(shareText + '\n' + deepLink);
    }
  }

  /**
   * Fallback: Copy text to clipboard
   */
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      console.log('[Event Share] Copied to clipboard successfully');

      // Optional: Show user feedback (you can customize this)
      alert('Link copied to clipboard!');
      return true;
    } catch (error) {
      console.error('[Event Share] Clipboard copy failed:', error);

      // Last resort: manual copy fallback
      return manualCopyFallback(text);
    }
  }

  /**
   * Manual copy fallback for older browsers
   */
  function manualCopyFallback(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (success) {
        console.log('[Event Share] Manual copy successful');
        alert('Link copied to clipboard!');
        return true;
      }
    } catch (error) {
      console.error('[Event Share] Manual copy failed:', error);
      document.body.removeChild(textarea);
    }

    return false;
  }

  /**
   * Navigate to event in feed via deep link hash
   * Scrolls to the matching feed card
   */
  function navigateToEvent(slug) {
    console.log('[Event Share] Navigating to event:', slug);

    // Find the feed card with matching slug
    const feedCards = document.querySelectorAll(config.feedCard);
    let targetCard = null;

    feedCards.forEach(card => {
      const slugEl = card.querySelector(config.feedSlug);
      if (slugEl && slugEl.textContent.trim() === slug) {
        targetCard = card;
      }
    });

    if (!targetCard) {
      console.warn('[Event Share] Feed card not found for slug:', slug);
      return;
    }

    console.log('[Event Share] Found target card, scrolling...');

    // Scroll to the card
    targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Clear hash after scroll completes (give scroll time to finish)
    setTimeout(() => {
      history.replaceState(null, '', window.location.pathname);
      console.log('[Event Share] Hash cleared');
    }, 1000);
  }

  /**
   * Handle deep link on page load
   * Check if URL has #event-[slug] and navigate to it
   */
  function handleDeepLinkOnLoad() {
    const hash = window.location.hash;

    if (hash.startsWith('#event-')) {
      const slug = hash.replace('#event-', '');
      console.log('[Event Share] Deep link detected on load:', slug);

      // Wait for CMS to populate, then navigate
      // Using similar pattern to sequential asset loader
      setTimeout(() => {
        navigateToEvent(slug);
      }, 500);
    }
  }

  /**
   * Main share button click handler
   */
  function handleShareClick(e) {
    e.preventDefault();
    e.stopPropagation();

    console.log('[Event Share] Share button clicked');

    // Get the share button to access its template
    const shareBtn = e.target.closest(config.shareButton);
    const template = shareBtn ? shareBtn.getAttribute('data-share-template') : null;

    // Extract event data from modal
    const eventData = getEventData();
    if (!eventData) {
      console.error('[Event Share] Failed to extract event data');
      return;
    }

    // Build share content
    const shareText = buildShareText(eventData, template);
    const deepLink = buildDeepLink(eventData.slug);

    // Attempt to share
    shareEvent(shareText, deepLink);
  }

  /**
   * Initialize event listeners
   */
  function init() {
    console.log('[Event Share] Initializing...');

    // Handle deep link on page load
    handleDeepLinkOnLoad();

    // Use event delegation for share button (handles dynamically loaded modals)
    document.addEventListener('click', function(e) {
      const shareBtn = e.target.closest(config.shareButton);
      if (!shareBtn) return;

      handleShareClick(e);
    });

    console.log('[Event Share] Initialized successfully');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded
    init();
  }

})();
