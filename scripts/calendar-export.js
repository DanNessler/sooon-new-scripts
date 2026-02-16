//  Calendar Export Functionality for sooon
//  Generates downloadable .ics calendar file from event modal data

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
   * Same pattern as event-share.js and venue-map.js
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
   * Tries primary selector first, then fallback
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
   * Returns array of artist name strings
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

    // If allArtists is empty but we have an active artist, use it
    if (allArtists.length === 0 && activeArtist) {
      allArtists = [activeArtist];
    }

    // If no active artist but we have allArtists, use the first one
    if (!activeArtist && allArtists.length > 0) {
      activeArtist = allArtists[0];
    }

    var venueEl = modalScope.querySelector(CONFIG.venue);
    var cityEl = modalScope.querySelector(CONFIG.city);
    var slugSourceEl = modalScope.querySelector(CONFIG.slugSource);

    // Find date text - look inside the date wrapper first, then fall back
    var dateText = '';
    var dateWrapper = modalScope.querySelector(CONFIG.dateWrapper);
    if (dateWrapper) {
      var dateEl = dateWrapper.querySelector(CONFIG.date);
      if (dateEl) {
        dateText = dateEl.textContent.trim();
      }
    }
    // Fallback: try .date_detailed (used by event-share.js)
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

    // Clean up: remove dots, extra spaces, commas
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
   * Format: YYYYMMDDTHHMMSS (local time, no timezone suffix)
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
   * ICS requires escaping commas, semicolons, and backslashes
   * Newlines must be literal \n (escaped as \\n in the ICS spec)
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

    // Parse the event date
    var eventDate = parseDate(data.dateText);

    if (!eventDate) {
      console.warn('[Calendar Export] Date parsing failed, using today as fallback');
      eventDate = new Date();
    }

    // Build start and end times
    var dtStart = formatICSDateTime(eventDate, CONFIG.defaultStartHour, CONFIG.defaultStartMinute);
    var endHour = CONFIG.defaultStartHour + CONFIG.defaultDurationHours;
    var dtEnd = formatICSDateTime(eventDate, endHour, CONFIG.defaultStartMinute);

    // Build event title
    var summary = data.activeArtist
      ? data.activeArtist + ' live at ' + data.venue
      : data.venue || 'sooon Event';

    // Build location
    var location = data.venue;
    if (data.city) {
      location += ', ' + data.city;
    }

    // Build event URL
    var url = CONFIG.baseUrl + '#event-' + data.slug;

    // Build description
    var artistLine = data.allArtists.length > 0
      ? data.allArtists.join(' + ')
      : data.activeArtist || '';

    var description = artistLine
      + ' live at ' + data.venue
      + ' – Check the playing times on the venue`s website, enjoy the show and find more events on http://www.sooon.live';

    // Generate UID for the event
    var uid = data.slug + '@sooon.live';

    // Build ICS content
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

    // Extract event data from open modal
    var eventData = getEventData();

    if (!eventData) {
      console.error('[Calendar Export] Failed to extract event data - is the modal open?');
      return;
    }

    if (!eventData.activeArtist && !eventData.venue) {
      console.error('[Calendar Export] No artist or venue found, cannot create calendar event');
      return;
    }

    // Generate ICS file content
    var icsContent = generateICS(eventData);

    // Trigger download
    downloadICS(icsContent, eventData.slug);
  }

  /**
   * Initialize event listeners
   */
  function init() {
    console.log('[Calendar Export] Initializing...');

    // Use event delegation for calendar button (handles dynamically loaded modals)
    document.addEventListener('click', function(e) {
      var calBtn = e.target.closest(CONFIG.calendarButton);
      if (!calBtn) return;

      handleCalendarClick(e);
    });

    console.log('[Calendar Export] Initialized successfully');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
