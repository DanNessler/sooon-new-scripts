//  event-features.js — Event modal features (deferred)
//  Combined: Share, Venue Map, Calendar Export


// ========================================================
// EVENT SHARE
// ========================================================
(function() {
  'use strict';

  const config = {
    shareButton: '[data-share-action="event-share"]',
    activeArtist: '.event_modal_hero_artist_content .heading-h2-4xl',
    venue: '.event_location-venue',
    city: '.event_location-city',
    date: '.date_detailed',
    slugSource: '[data-event-slug-source="true"]',
  };

  function getEventData() {
    const openModal = document.querySelector('.event_modal.is-open');
    if (!openModal) return null;

    const scope = openModal.closest('.event_modal_scope');
    if (!scope) return null;

    const slug = scope.querySelector(config.slugSource);
    const data = {
      artist: (openModal.querySelector(config.activeArtist) || { textContent: '' }).textContent.trim(),
      venue:  (scope.querySelector(config.venue) || { textContent: '' }).textContent.trim(),
      city:   (scope.querySelector(config.city)  || { textContent: '' }).textContent.trim(),
      date:   (scope.querySelector(config.date)  || { textContent: '' }).textContent.trim(),
      slug:   slug ? slug.textContent.trim() : null,
    };

    if (!data.artist || !data.slug) return null;
    return data;
  }

  function buildShareText(data, template) {
    return (template || 'Check out {artist-1} at {venue-name}, {venue-city} on {date}! 🤘🫶 via sooon')
      .replace('{artist-1}', data.artist)
      .replace('{venue-name}', data.venue)
      .replace('{venue-city}', data.city)
      .replace('{date}', data.date);
  }

  function buildDeepLink(slug) {
    return window.location.origin + window.location.pathname + '#event-' + slug;
  }

  async function shareEvent(shareText, deepLink) {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText, url: deepLink });
        return true;
      } catch (err) {
        if (err.name !== 'AbortError') console.warn('[Event Share] Share failed:', err);
        return false;
      }
    }
    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(shareText + '\n' + deepLink);
      alert('Link copied to clipboard!');
      return true;
    } catch (_) {
      // execCommand fallback
      const ta = document.createElement('textarea');
      ta.value = shareText + '\n' + deepLink;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); alert('Link copied to clipboard!'); } catch(_) {}
      document.body.removeChild(ta);
      return false;
    }
  }

  function navigateToEvent(slug) {
    const card = document.querySelector('.card_feed_item[data-event-slug="' + CSS.escape(slug) + '"]');
    if (!card) return false;

    document.body.classList.remove('is-locked');
    card.scrollIntoView({ behavior: 'instant', block: 'start' });

    setTimeout(function() {
      const rect = card.getBoundingClientRect();
      if (rect.top < -50 || rect.top >= window.innerHeight) {
        card.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
      history.replaceState(null, '', window.location.pathname);
      console.log('[Event Share] Hash cleared');
    }, 200);

    return true;
  }

  function handleDeepLinkOnLoad() {
    const hash = window.location.hash;
    if (!hash.startsWith('#event-')) return;

    const slug = decodeURIComponent(hash.replace('#event-', '')).split(/[\s%]/)[0];
    if (!slug) return;

    console.log('[Event Share] Deep link detected, slug:', slug);

    let waited = 0;
    const MAX_WAIT = 10000;

    function waitForFeed() {
      if (window.sooonFeedReady) {
        console.log('[Event Share] Feed ready, navigating to event');
        setTimeout(navigate, 150);
      } else if (waited >= MAX_WAIT) {
        console.warn('[Event Share] Feed not ready after 10s, attempting anyway');
        navigate();
      } else {
        waited += 100;
        setTimeout(waitForFeed, 100);
      }
    }

    function navigate() {
      let attempts = 0;
      function attempt() {
        attempts++;
        console.log('[Event Share] Navigation attempt ' + attempts + '/3');
        if (!navigateToEvent(slug) && attempts < 3) {
          setTimeout(attempt, 500 * Math.pow(2, attempts - 1));
        }
      }
      attempt();
    }

    console.log('[Event Share] Waiting for feed initialization...');
    waitForFeed();
  }

  function init() {
    handleDeepLinkOnLoad();

    document.addEventListener('click', function(e) {
      const btn = e.target.closest(config.shareButton);
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();

      const data = getEventData();
      if (!data) { console.error('[Event Share] Failed to extract event data'); return; }

      shareEvent(buildShareText(data, btn.getAttribute('data-share-template')), buildDeepLink(data.slug));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


// ========================================================
// VENUE MAP
// ========================================================
(function() {
  'use strict';

  function getVenueData() {
    const openModal = document.querySelector('.event_modal.is-open');
    if (!openModal) return null;

    const scope = openModal.closest('.event_modal_scope');
    if (!scope) return null;

    const venue = (scope.querySelector('.event_location-venue') || { textContent: '' }).textContent.trim();
    const city  = (scope.querySelector('.event_location-city')  || { textContent: '' }).textContent.trim();

    return venue ? { venue, city } : null;
  }

  document.addEventListener('click', function(e) {
    if (!e.target.closest('[data-map-action="open-venue"]')) return;
    e.preventDefault();
    e.stopPropagation();

    const data = getVenueData();
    if (!data) { console.error('[Venue Map] Failed to extract venue data'); return; }

    const query = encodeURIComponent(data.city ? data.venue + ', ' + data.city : data.venue);
    window.open('https://maps.google.com/maps?q=' + query, '_blank');
  });
})();


// ========================================================
// CALENDAR EXPORT
// ========================================================
(function() {
  'use strict';

  const CONFIG = {
    calendarButton: '[data-calendar-action="export"]',
    activeArtist:   '.event_modal_hero_artist_content .heading-h2-4xl',
    activeArtistAlt:'.artist-title.is-active',
    allArtists:     '.artist-title',
    venue:          '.event_location-venue',
    city:           '.event_location-city',
    date:           '.text-weight-bold',
    dateWrapper:    '.event_modal_detail_content_left_wrapper',
    slugSource:     '[data-event-slug-source="true"]',
    defaultStartHour:     20,
    defaultStartMinute:   0,
    defaultDurationHours: 3,
    prodId:  '-//sooon//Event Calendar//EN',
    baseUrl: 'https://sooon-new.webflow.io/'
  };

  const MONTH_MAP = {
    january:0, february:1, march:2, april:3, may:4, june:5,
    july:6, august:7, september:8, october:9, november:10, december:11,
    januar:0, februar:1, 'märz':2, mai:4, juni:5, juli:6,
    oktober:9, dezember:11
  };

  function getOpenModalScope() {
    const openModal = document.querySelector('.event_modal.is-open');
    if (!openModal) return null;
    const scope = openModal.closest('.event_modal_scope');
    return scope ? { openModal, scope } : null;
  }

  function getActiveArtist(openModal) {
    const el = openModal.querySelector(CONFIG.activeArtist) || openModal.querySelector(CONFIG.activeArtistAlt);
    return el ? el.textContent.trim() : '';
  }

  function getAllArtists(scope) {
    const names = [];
    scope.querySelectorAll(CONFIG.allArtists).forEach(function(el) {
      const name = el.textContent.trim();
      if (name && names.indexOf(name) === -1) names.push(name);
    });
    return names;
  }

  function getEventData() {
    const modal = getOpenModalScope();
    if (!modal) return null;

    const { openModal, scope } = modal;
    let activeArtist = getActiveArtist(openModal);
    let allArtists = getAllArtists(scope);
    if (!allArtists.length && activeArtist) allArtists = [activeArtist];
    if (!activeArtist && allArtists.length) activeArtist = allArtists[0];

    let dateText = '';
    const wrapper = scope.querySelector(CONFIG.dateWrapper);
    if (wrapper) {
      const dateEl = wrapper.querySelector(CONFIG.date);
      if (dateEl) dateText = dateEl.textContent.trim();
    }
    if (!dateText) {
      const fallback = scope.querySelector('.date_detailed');
      if (fallback) dateText = fallback.textContent.trim();
    }

    const slugEl = scope.querySelector(CONFIG.slugSource);
    return {
      activeArtist,
      allArtists,
      venue:    (scope.querySelector(CONFIG.venue) || { textContent: '' }).textContent.trim(),
      city:     (scope.querySelector(CONFIG.city)  || { textContent: '' }).textContent.trim(),
      dateText,
      slug:     slugEl ? slugEl.textContent.trim() : '',
    };
  }

  function parseDate(dateText) {
    if (!dateText) return null;
    const cleaned = dateText.replace(/\./g, '').replace(/,/g, '').replace(/\s+/g, ' ').trim();

    let match = cleaned.match(/(\d{1,2})\s+([a-zA-Zä]+)\s+(\d{4})/);
    if (match) {
      const month = MONTH_MAP[match[2].toLowerCase()];
      if (month !== undefined) return new Date(parseInt(match[3]), month, parseInt(match[1]));
    }
    match = cleaned.match(/([a-zA-Zä]+)\s+(\d{1,2})\s+(\d{4})/);
    if (match) {
      const month = MONTH_MAP[match[1].toLowerCase()];
      if (month !== undefined) return new Date(parseInt(match[3]), month, parseInt(match[2]));
    }
    const native = new Date(cleaned);
    return isNaN(native.getTime()) ? null : native;
  }

  function fmtICS(date, h, min) {
    return date.getFullYear()
      + String(date.getMonth() + 1).padStart(2, '0')
      + String(date.getDate()).padStart(2, '0')
      + 'T' + String(h).padStart(2, '0') + String(min).padStart(2, '0') + '00';
  }

  function escapeICS(t) {
    return (t || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,');
  }

  function generateICS(data) {
    const eventDate = parseDate(data.dateText) || new Date();
    const dtStart = fmtICS(eventDate, CONFIG.defaultStartHour, CONFIG.defaultStartMinute);
    const dtEnd   = fmtICS(eventDate, CONFIG.defaultStartHour + CONFIG.defaultDurationHours, CONFIG.defaultStartMinute);
    const summary  = data.activeArtist ? data.activeArtist + ' live at ' + data.venue : data.venue || 'sooon Event';
    const location = data.city ? data.venue + ', ' + data.city : data.venue;
    const artistLine = data.allArtists.length ? data.allArtists.join(' + ') : data.activeArtist;
    const description = artistLine + ' live at ' + data.venue
      + '  Check the playing times on the venue`s website, enjoy the show and find more events on https://sooon-new.webflow.io';

    return [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:' + CONFIG.prodId, 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'UID:' + data.slug + '@sooon.live',
      'DTSTART:' + dtStart, 'DTEND:' + dtEnd,
      'SUMMARY:' + escapeICS(summary),
      'LOCATION:' + escapeICS(location),
      'DESCRIPTION:' + escapeICS(description),
      'URL:' + CONFIG.baseUrl + '#event-' + data.slug,
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
  }

  function downloadICS(icsContent, slug) {
    try {
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'event-' + (slug || 'sooon') + '.ics';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(function() { document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
    } catch (err) {
      console.error('[Calendar Export] Download failed:', err);
    }
  }

  document.addEventListener('click', function(e) {
    if (!e.target.closest(CONFIG.calendarButton)) return;
    e.preventDefault();
    e.stopPropagation();

    const data = getEventData();
    if (!data || (!data.activeArtist && !data.venue)) {
      console.error('[Calendar Export] No event data found');
      return;
    }
    downloadICS(generateICS(data), data.slug);
  });

})();
