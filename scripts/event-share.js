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
    activeArtist: '.event_modal_hero_artist_content .heading-h2-4xl',
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

    // Find the .event_modal element with .is-open class
    const openModal = document.querySelector('.event_modal.is-open');

    if (!openModal) {
      console.warn('[Event Share] No .event_modal.is-open found');
      return null;
    }

    // Get the parent .event_modal_scope (contains all event data)
    const modalScope = openModal.closest('.event_modal_scope');

    if (!modalScope) {
      console.warn('[Event Share] Could not find parent .event_modal_scope');
      return null;
    }

    console.log('[Event Share] Found open modal and its scope');

    // Extract artist from within the modal
    const activeArtistEl = openModal.querySelector(config.activeArtist);

    // Extract other data from the modal scope (feed card footer/header)
    const venueEl = modalScope.querySelector(config.venue);
    const cityEl = modalScope.querySelector(config.city);
    const dateEl = modalScope.querySelector(config.date);
    const slugSourceEl = modalScope.querySelector(config.slugSource);

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
    console.log('[Event Share] Looking for slug:', slug);

    // Try both approaches: feed cards AND modal scopes

    // Approach 1: Look in feed cards
    const feedCards = document.querySelectorAll(config.feedCard);
    console.log('[Event Share] Approach 1 - Feed cards (.card_feed_item):', feedCards.length);

    // Approach 2: Look in modal scopes (feed cards might be modal scopes)
    const modalScopes = document.querySelectorAll(config.modalScope);
    console.log('[Event Share] Approach 2 - Modal scopes (.event_modal_scope):', modalScopes.length);

    let targetCard = null;
    let targetScope = null;

    // Try finding in modal scopes first (more reliable)
    modalScopes.forEach((scope, index) => {
      const slugEl = scope.querySelector(config.slugSource);

      if (slugEl) {
        const cardSlug = slugEl.textContent.trim();

        if (index < 3) {
          console.log(`[Event Share] Scope ${index} slug: "${cardSlug}"`);
        }

        if (cardSlug === slug) {
          targetScope = scope;
          console.log('[Event Share] ✅ MATCH found in scope', index);
          console.log('[Event Share] Matching slug:', cardSlug);
        }
      } else if (index < 3) {
        console.warn(`[Event Share] Scope ${index} has no slug element with selector:`, config.slugSource);
      }
    });

    // If found in modal scope, find the corresponding feed card to scroll to
    if (targetScope) {
      targetCard = targetScope.querySelector(config.feedCard);
      if (!targetCard) {
        // Maybe the scope IS the card
        targetCard = targetScope;
      }
    }

    // Fallback: try feed cards with both selectors
    if (!targetCard) {
      console.log('[Event Share] Not found in scopes, trying feed cards...');

      feedCards.forEach((card, index) => {
        let slugEl = card.querySelector(config.feedSlug);
        if (!slugEl) {
          slugEl = card.querySelector(config.slugSource);
        }

        if (slugEl) {
          const cardSlug = slugEl.textContent.trim();

          if (index < 3) {
            console.log(`[Event Share] Feed card ${index} slug: "${cardSlug}"`);
          }

          if (cardSlug === slug) {
            targetCard = card;
            console.log('[Event Share] ✅ MATCH found in feed card', index);
          }
        } else if (index < 3) {
          console.warn(`[Event Share] Feed card ${index} has no slug element`);
        }
      });
    }

    if (!targetCard) {
      console.error('[Event Share] ❌ NO MATCH FOUND');
      console.error('[Event Share] Searched for slug:', slug);
      console.error('[Event Share] Total modal scopes:', modalScopes.length);
      console.error('[Event Share] Total feed cards:', feedCards.length);
      return false;
    }

    console.log('[Event Share] Found target element, scrolling...');

    // Scroll to the card with some offset for better visibility
    targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Clear hash after scroll completes
    setTimeout(() => {
      history.replaceState(null, '', window.location.pathname);
      console.log('[Event Share] Hash cleared');
    }, 1000);

    return true;
  }

  /**
   * Handle deep link on page load
   * Check if URL has #event-[slug] and navigate to it
   * Retries with exponential backoff if feed cards aren't loaded yet
   */
  function handleDeepLinkOnLoad() {
    const hash = window.location.hash;

    if (hash.startsWith('#event-')) {
      const slug = hash.replace('#event-', '');
      console.log('[Event Share] Deep link detected on load:', slug);

      // Retry navigation with exponential backoff
      let attempts = 0;
      const maxAttempts = 5;
      const baseDelay = 300;

      function attemptNavigation() {
        attempts++;
        console.log(`[Event Share] Navigation attempt ${attempts}/${maxAttempts}`);

        const success = navigateToEvent(slug);

        if (!success && attempts < maxAttempts) {
          // Exponential backoff: 300ms, 600ms, 1200ms, 2400ms, 4800ms
          const delay = baseDelay * Math.pow(2, attempts - 1);
          console.log(`[Event Share] Retrying in ${delay}ms...`);

          setTimeout(attemptNavigation, delay);
        } else if (!success) {
          console.error('[Event Share] Failed to navigate after', maxAttempts, 'attempts');
        }
      }

      // Start first attempt after initial delay
      setTimeout(attemptNavigation, baseDelay);
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
