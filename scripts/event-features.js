//  event-features.js — Event modal features (deferred, loads last)
//  Combined: Share, Venue Map, Calendar Export
//  Only needed after user opens an event modal.


// ========================================================
// EVENT SHARE
// Handles native sharing with deep links to specific events
// ========================================================
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
   * Uses data-event-slug attribute on feed cards (same as filter-to-feed in sooon-core.js)
   */
  function navigateToEvent(slug) {
    console.log('[Event Share] Navigating to event, slug:', slug);

    // Direct attribute selector (matches filter-to-feed pattern in sooon-core.js)
    const targetCard = document.querySelector('.card_feed_item[data-event-slug="' + CSS.escape(slug) + '"]');

    if (!targetCard) {
      const totalCards = document.querySelectorAll('.card_feed_item').length;
      console.error('[Event Share] No feed card found for slug:', slug);
      console.log('[Event Share] Total feed cards in DOM:', totalCards);
      return false;
    }

    console.log('[Event Share] Found target card, scrolling...');

    // Ensure body is not locked (deep link visitors skip intro)
    document.body.classList.remove('is-locked');

    // Instant scroll — smooth scroll fights with CSS scroll-snap and lands on wrong card
    targetCard.scrollIntoView({ behavior: 'instant', block: 'start' });

    // Verify scroll landed correctly, retry once if missed
    setTimeout(function() {
      var rect = targetCard.getBoundingClientRect();
      var inViewport = rect.top >= -50 && rect.top < window.innerHeight;

      if (inViewport) {
        console.log('[Event Share] Scroll successful, card in viewport');
      } else {
        console.warn('[Event Share] Scroll missed target, retrying...');
        targetCard.scrollIntoView({ behavior: 'instant', block: 'start' });
      }

      // Clear hash after navigation
      history.replaceState(null, '', window.location.pathname);
      console.log('[Event Share] Hash cleared');
    }, 200);

    return true;
  }

  /**
   * Handle deep link on page load
   * Check if URL has #event-[slug] and navigate to it
   * Retries with exponential backoff if feed cards aren't loaded yet
   */
  function handleDeepLinkOnLoad() {
    const hash = window.location.hash;
    if (!hash.startsWith('#event-')) return;

    // Clean slug: decode URL encoding, strip any share text after the slug
    const rawSlug = hash.replace('#event-', '');
    const slug = decodeURIComponent(rawSlug).split(/[\s%]/)[0];

    if (!slug) {
      console.warn('[Event Share] Could not extract slug from hash:', hash);
      return;
    }

    console.log('[Event Share] Deep link detected, slug:', slug);
    console.log('[Event Share] Original hash:', hash);

    // Wait for sooon-core.js feed initialization before navigating
    var waitTime = 0;
    var maxWait = 10000; // 10 seconds max
    var pollInterval = 100;

    function waitForFeedReady() {
      if (window.sooonFeedReady) {
        console.log('[Event Share] Feed ready, navigating to event');
        // Small delay for scroll-snap and observers to settle
        setTimeout(startNavigation, 150);
      } else if (waitTime >= maxWait) {
        console.warn('[Event Share] Feed not ready after 10s, attempting anyway');
        startNavigation();
      } else {
        waitTime += pollInterval;
        setTimeout(waitForFeedReady, pollInterval);
      }
    }

    function startNavigation() {
      var attempts = 0;
      var maxAttempts = 3;
      var baseDelay = 500;

      function attemptNavigation() {
        attempts++;
        console.log('[Event Share] Navigation attempt ' + attempts + '/' + maxAttempts);

        var success = navigateToEvent(slug);

        if (!success && attempts < maxAttempts) {
          var delay = baseDelay * Math.pow(2, attempts - 1);
          console.log('[Event Share] Retrying in ' + delay + 'ms...');
          setTimeout(attemptNavigation, delay);
        } else if (!success) {
          console.error('[Event Share] Failed to navigate after ' + maxAttempts + ' attempts');
        }
      }

      attemptNavigation();
    }

    console.log('[Event Share] Waiting for feed initialization...');
    waitForFeedReady();
  }

  /**
   * Main share button click handler
   */
  function handleShareClick(e) {
    e.preventDefault();
    e.stopPropagation();

    console.log('[Event Share] Share button clicked');

    const shareBtn = e.target.closest(config.shareButton);
    const template = shareBtn ? shareBtn.getAttribute('data-share-template') : null;

    const eventData = getEventData();
    if (!eventData) {
      console.error('[Event Share] Failed to extract event data');
      return;
    }

    const shareText = buildShareText(eventData, template);
    const deepLink = buildDeepLink(eventData.slug);

    shareEvent(shareText, deepLink);
  }

  /**
   * Initialize event listeners
   */
  function init() {
    console.log('[Event Share] Initializing...');

    handleDeepLinkOnLoad();

    document.addEventListener('click', function(e) {
      const shareBtn = e.target.closest(config.shareButton);
      if (!shareBtn) return;
      handleShareClick(e);
    });

    console.log('[Event Share] Initialized successfully');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();


// ========================================================
// VENUE MAP
// Opens venue location in Google Maps from event modals
// ========================================================
(function() {
  'use strict';

  console.log('[Venue Map] Script loaded');

  // Configuration
  const config = {
    modalScope: '.event_modal_scope',
    mapButton: '[data-map-action="open-venue"]',

    // Modal data selectors (scoped to modal scope)
    venue: '.event_location-venue',
    city: '.event_location-city'
  };

  /**
   * Extract venue data from the currently open modal
   * Returns object with venue and city or null if not found
   */
  function getVenueData() {
    console.log('[Venue Map] Extracting venue data from modal...');

    const openModal = document.querySelector('.event_modal.is-open');

    if (!openModal) {
      console.warn('[Venue Map] No .event_modal.is-open found');
      return null;
    }

    const modalScope = openModal.closest(config.modalScope);

    if (!modalScope) {
      console.warn('[Venue Map] Could not find parent .event_modal_scope');
      return null;
    }

    console.log('[Venue Map] Found open modal and its scope');

    const venueEl = modalScope.querySelector(config.venue);
    const cityEl = modalScope.querySelector(config.city);

    const data = {
      venue: venueEl ? venueEl.textContent.trim() : '',
      city: cityEl ? cityEl.textContent.trim() : ''
    };

    console.log('[Venue Map] Extracted data:', data);

    if (!data.venue) {
      console.warn('[Venue Map] Missing venue name');
      return null;
    }

    return data;
  }

  /**
   * Build Google Maps URL from venue data
   * Format: https://maps.google.com/maps?q={venue},+{city}
   */
  function buildMapsUrl(data) {
    let query = data.venue;
    if (data.city) {
      query += ', ' + data.city;
    }

    const encoded = encodeURIComponent(query);
    const url = 'https://maps.google.com/maps?q=' + encoded;

    console.log('[Venue Map] Maps URL:', url);
    return url;
  }

  /**
   * Handle map button click
   */
  function handleMapClick(e) {
    e.preventDefault();
    e.stopPropagation();

    console.log('[Venue Map] Map button clicked');

    const venueData = getVenueData();
    if (!venueData) {
      console.error('[Venue Map] Failed to extract venue data');
      return;
    }

    const mapsUrl = buildMapsUrl(venueData);

    console.log('[Venue Map] Opening maps...');
    window.open(mapsUrl, '_blank');
  }

  /**
   * Initialize event listeners
   */
  function init() {
    console.log('[Venue Map] Initializing...');

    document.addEventListener('click', function(e) {
      const mapBtn = e.target.closest(config.mapButton);
      if (!mapBtn) return;
      handleMapClick(e);
    });

    console.log('[Venue Map] Initialized successfully');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();


// ========================================================
// CALENDAR EXPORT
// Generates downloadable .ics calendar file from event modal data
// ========================================================
(function() {
  'use strict';

  console.log('[Calendar Export] Script loaded');

  // Configuration
  const CONFIG = {
    // Modal selectors
    modalScope: '.event_modal_scope',
    calendarButton: '[data-calendar-action="export"]',

    // Modal data selectors (scoped to modal scope)
    activeArtist: '.event_modal_hero_artist_content .heading-h2-4xl',
    activeArtistAlt: '.artist-title.is-active',
    allArtists: '.artist-title',
    venue: '.event_location-venue',
    city: '.event_location-city',
    date: '.text-weight-bold',
    dateWrapper: '.event_modal_detail_content_left_wrapper',
    slugSource: '[data-event-slug-source="true"]',

    // Defaults
    defaultStartHour: 20,
    defaultStartMinute: 0,
    defaultDurationHours: 3,

    // ICS metadata
    prodId: '-//sooon//Event Calendar//EN',
    baseUrl: 'https://sooon-new.webflow.io/'
  };

  // Month name mapping for date parsing (EN + DE)
  const MONTH_MAP = {
    'january': 0, 'february': 1, 'march': 2, 'april': 3,
    'may': 4, 'june': 5, 'july': 6, 'august': 7,
    'september': 8, 'october': 9, 'november': 10, 'december': 11,
    'januar': 0, 'februar': 1, 'märz': 2, 'april': 3,
    'mai': 4, 'juni': 5, 'juli': 6, 'august': 7,
    'september': 8, 'oktober': 9, 'november': 10, 'dezember': 11
  };

  /**
   * Find the currently open modal scope
   */
  function getOpenModalScope() {
    const openModal = document.querySelector('.event_modal.is-open');

    if (!openModal) {
      console.warn('[Calendar Export] No .event_modal.is-open found');
      return null;
    }

    const modalScope = openModal.closest(CONFIG.modalScope);

    if (!modalScope) {
      console.warn('[Calendar Export] Could not find parent .event_modal_scope');
      return null;
    }

    return { openModal: openModal, modalScope: modalScope };
  }

  /**
   * Extract the active artist name from the modal
   */
  function getActiveArtist(openModal) {
    var el = openModal.querySelector(CONFIG.activeArtist);
    if (el && el.textContent.trim()) {
      return el.textContent.trim();
    }

    el = openModal.querySelector(CONFIG.activeArtistAlt);
    if (el && el.textContent.trim()) {
      return el.textContent.trim();
    }

    return '';
  }

  /**
   * Extract all artist names from the modal scope
   */
  function getAllArtists(modalScope) {
    var elements = modalScope.querySelectorAll(CONFIG.allArtists);
    var artists = [];

    elements.forEach(function(el) {
      var name = el.textContent.trim();
      if (name && artists.indexOf(name) === -1) {
        artists.push(name);
      }
    });

    return artists;
  }

  /**
   * Extract all event data from the currently open modal
   */
  function getEventData() {
    console.log('[Calendar Export] Extracting event data from modal...');

    var modal = getOpenModalScope();
    if (!modal) return null;

    var openModal = modal.openModal;
    var modalScope = modal.modalScope;

    console.log('[Calendar Export] Found open modal and its scope');

    var activeArtist = getActiveArtist(openModal);
    var allArtists = getAllArtists(modalScope);

    if (allArtists.length === 0 && activeArtist) {
      allArtists = [activeArtist];
    }

    if (!activeArtist && allArtists.length > 0) {
      activeArtist = allArtists[0];
    }

    var venueEl = modalScope.querySelector(CONFIG.venue);
    var cityEl = modalScope.querySelector(CONFIG.city);
    var slugSourceEl = modalScope.querySelector(CONFIG.slugSource);

    // Find date text
    var dateText = '';
    var dateWrapper = modalScope.querySelector(CONFIG.dateWrapper);
    if (dateWrapper) {
      var dateEl = dateWrapper.querySelector(CONFIG.date);
      if (dateEl) {
        dateText = dateEl.textContent.trim();
      }
    }
    // Fallback: try .date_detailed
    if (!dateText) {
      var dateFallback = modalScope.querySelector('.date_detailed');
      if (dateFallback) {
        dateText = dateFallback.textContent.trim();
      }
    }

    var data = {
      activeArtist: activeArtist,
      allArtists: allArtists,
      venue: venueEl ? venueEl.textContent.trim() : '',
      city: cityEl ? cityEl.textContent.trim() : '',
      dateText: dateText,
      slug: slugSourceEl ? slugSourceEl.textContent.trim() : ''
    };

    console.log('[Calendar Export] Extracted data:', data);

    if (!data.activeArtist) {
      console.warn('[Calendar Export] No artist name found');
    }
    if (!data.slug) {
      console.warn('[Calendar Export] No event slug found');
    }

    return data;
  }

  /**
   * Parse a date string into a Date object
   * Handles formats like "15 February 2026", "15. Februar 2026", etc.
   */
  function parseDate(dateText) {
    if (!dateText) {
      console.warn('[Calendar Export] No date text to parse');
      return null;
    }

    console.log('[Calendar Export] Parsing date:', dateText);

    var cleaned = dateText.replace(/\./g, '').replace(/,/g, '').replace(/\s+/g, ' ').trim();

    // Try pattern: DD MonthName YYYY
    var match = cleaned.match(/(\d{1,2})\s+([a-zA-Zä]+)\s+(\d{4})/);
    if (match) {
      var day = parseInt(match[1], 10);
      var monthStr = match[2].toLowerCase();
      var year = parseInt(match[3], 10);
      var month = MONTH_MAP[monthStr];

      if (month !== undefined) {
        var date = new Date(year, month, day);
        console.log('[Calendar Export] Parsed date:', date.toDateString());
        return date;
      } else {
        console.warn('[Calendar Export] Unknown month name:', match[2]);
      }
    }

    // Try pattern: MonthName DD YYYY (US format)
    match = cleaned.match(/([a-zA-Zä]+)\s+(\d{1,2})\s+(\d{4})/);
    if (match) {
      var monthStr2 = match[1].toLowerCase();
      var day2 = parseInt(match[2], 10);
      var year2 = parseInt(match[3], 10);
      var month2 = MONTH_MAP[monthStr2];

      if (month2 !== undefined) {
        var date2 = new Date(year2, month2, day2);
        console.log('[Calendar Export] Parsed date (US format):', date2.toDateString());
        return date2;
      }
    }

    // Try native Date.parse as last resort
    var nativeParsed = new Date(cleaned);
    if (!isNaN(nativeParsed.getTime())) {
      console.log('[Calendar Export] Parsed date (native):', nativeParsed.toDateString());
      return nativeParsed;
    }

    console.warn('[Calendar Export] Could not parse date:', dateText);
    return null;
  }

  /**
   * Format a Date object to ICS date-time string
   * Format: YYYYMMDDTHHMMSS
   */
  function formatICSDateTime(date, hours, minutes) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    var h = String(hours).padStart(2, '0');
    var min = String(minutes).padStart(2, '0');
    return y + m + d + 'T' + h + min + '00';
  }

  /**
   * Escape text for ICS format
   */
  function escapeICS(text) {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,');
  }

  /**
   * Generate .ics file content from event data
   */
  function generateICS(data) {
    console.log('[Calendar Export] Generating .ics content...');

    var eventDate = parseDate(data.dateText);

    if (!eventDate) {
      console.warn('[Calendar Export] Date parsing failed, using today as fallback');
      eventDate = new Date();
    }

    var dtStart = formatICSDateTime(eventDate, CONFIG.defaultStartHour, CONFIG.defaultStartMinute);
    var endHour = CONFIG.defaultStartHour + CONFIG.defaultDurationHours;
    var dtEnd = formatICSDateTime(eventDate, endHour, CONFIG.defaultStartMinute);

    var summary = data.activeArtist
      ? data.activeArtist + ' live at ' + data.venue
      : data.venue || 'sooon Event';

    var location = data.venue;
    if (data.city) {
      location += ', ' + data.city;
    }

    var url = CONFIG.baseUrl + '#event-' + data.slug;

    var artistLine = data.allArtists.length > 0
      ? data.allArtists.join(' + ')
      : data.activeArtist || '';

    var description = artistLine
      + ' live at ' + data.venue
      + '  Check the playing times on the venue`s website, enjoy the show and find more events on http://www.sooon.live';

    var uid = data.slug + '@sooon.live';

    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:' + CONFIG.prodId,
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'UID:' + uid,
      'DTSTART:' + dtStart,
      'DTEND:' + dtEnd,
      'SUMMARY:' + escapeICS(summary),
      'LOCATION:' + escapeICS(location),
      'DESCRIPTION:' + escapeICS(description),
      'URL:' + url,
      'END:VEVENT',
      'END:VCALENDAR'
    ];

    var icsContent = lines.join('\r\n');

    console.log('[Calendar Export] ICS content generated');
    console.log('[Calendar Export] DTSTART:', dtStart);
    console.log('[Calendar Export] DTEND:', dtEnd);
    console.log('[Calendar Export] SUMMARY:', summary);
    console.log('[Calendar Export] LOCATION:', location);

    return icsContent;
  }

  /**
   * Trigger browser download of the .ics file
   */
  function downloadICS(icsContent, slug) {
    var filename = 'event-' + (slug || 'sooon') + '.ics';

    console.log('[Calendar Export] Downloading:', filename);

    try {
      var blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      var url = URL.createObjectURL(blob);

      var link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();

      // Cleanup
      setTimeout(function() {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      console.log('[Calendar Export] Download triggered successfully');
      return true;
    } catch (error) {
      console.error('[Calendar Export] Download failed:', error);
      return false;
    }
  }

  /**
   * Handle calendar export button click
   */
  function handleCalendarClick(e) {
    e.preventDefault();
    e.stopPropagation();

    console.log('[Calendar Export] Export button clicked');

    var eventData = getEventData();

    if (!eventData) {
      console.error('[Calendar Export] Failed to extract event data - is the modal open?');
      return;
    }

    if (!eventData.activeArtist && !eventData.venue) {
      console.error('[Calendar Export] No artist or venue found, cannot create calendar event');
      return;
    }

    var icsContent = generateICS(eventData);

    downloadICS(icsContent, eventData.slug);
  }

  /**
   * Initialize event listeners
   */
  function init() {
    console.log('[Calendar Export] Initializing...');

    document.addEventListener('click', function(e) {
      var calBtn = e.target.closest(CONFIG.calendarButton);
      if (!calBtn) return;
      handleCalendarClick(e);
    });

    console.log('[Calendar Export] Initialized successfully');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();


// ========================================================
// MODAL VIDEO INJECTION
// Injects video elements when a modal opens, reading URLs
// from data-video-url-* attributes on the feed card.
// Videos are never in the Webflow template — created on demand.
// ========================================================
(function() {
  'use strict';

  console.log('[Event Features] Video injection script loaded');

  /**
   * Inject video elements into the modal for the given scope.
   * data-video-url-1/2/3 are read from .card_feed_item inside the scope.
   */
  function injectVideoForModal(modalScope) {
    if (modalScope.dataset.videoInjected === 'true') return;

    console.log('[Event Features] Injecting video for modal');

    var card = modalScope.querySelector('.card_feed_item');
    if (!card) {
      console.warn('[Event Features] No .card_feed_item found in modal scope');
      return;
    }

    var openModal = modalScope.querySelector('.event_modal');

    for (var i = 1; i <= 3; i++) {
      var videoUrl = card.getAttribute('data-video-url-' + i);
      if (!videoUrl || videoUrl === '') continue;

      // Prefer an existing .artist-visual[data-artist-id] container in the modal,
      // fall back to the modal element itself
      var container = (openModal && openModal.querySelector('.artist-visual[data-artist-id="' + i + '"]'))
        || openModal
        || modalScope;

      var video = document.createElement('video');
      video.className = 'artist-video';
      video.setAttribute('data-artist-id', String(i));
      video.controls = false;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;

      var source = document.createElement('source');
      source.src = videoUrl;
      source.type = 'video/mp4';

      video.appendChild(source);
      container.appendChild(video);
    }

    modalScope.dataset.videoInjected = 'true';
  }

  /**
   * Watch all .event_modal elements for the is-open class being added.
   * When detected, inject videos into the parent .event_modal_scope.
   */
  function watchForModalOpen() {
    var modals = document.querySelectorAll('.event_modal');

    if (!modals.length) {
      console.warn('[Event Features] No .event_modal elements found for video injection');
      return;
    }

    modals.forEach(function(modal) {
      new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            if (modal.classList.contains('is-open')) {
              var modalScope = modal.closest('.event_modal_scope');
              if (modalScope) {
                injectVideoForModal(modalScope);
              }
            }
          }
        });
      }).observe(modal, { attributes: true, attributeFilter: ['class'] });
    });

    console.log('[Event Features] Video injection observer active for', modals.length, 'modals');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchForModalOpen);
  } else {
    watchForModalOpen();
  }

})();
