/**
 * sooon-api.js — API client + feed renderer
 *
 * Replaces Webflow CMS collection list with direct API rendering.
 * Loads 20 events at a time with infinite scroll.
 *
 * Requires: sooon-core.js (loaded after this file)
 */

// ============================================================
// API CLIENT
// ============================================================

class SooonAPI {
  constructor() {
    this._url = 'https://beta.sooon.live/api/feed.json';
    this._cache = null;
    this._cacheTime = null;
    this._cacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  async fetchEvents() {
    if (this._cache && (Date.now() - this._cacheTime < this._cacheDuration)) {
      console.log('[API] Using cached data');
      return this._cache;
    }

    console.log('[API] Fetching events...');
    const response = await fetch(this._url);

    if (!response.ok) {
      throw new Error(`[API] HTTP ${response.status}`);
    }

    const raw = await response.json();
    this._cache = this._normalize(raw);
    this._cacheTime = Date.now();

    console.log(`[API] Fetched ${this._cache.length} events`);
    return this._cache;
  }

  // Maps raw API shape { type: 'MusicEvent', data: {...} } to a flat object
  _normalize(raw) {
    const items = Array.isArray(raw) ? raw : (raw.events || []);

    return items
      .filter(item => item.type === 'MusicEvent' && item.data)
      .map(item => {
        const d       = item.data;
        const artists = d.artists || [];
        const a1      = artists[0] || {};
        const a2      = artists[1] || {};
        const a3      = artists[2] || {};
        const venue   = d.venue   || {};
        const city    = venue.city || {};

        return {
          slug:        d.slug || `event-${d.id}`,
          externalId:  d.id,
          date:        d.date || '',
          ticketLink:  d.tickets?.[0]?.url || '',

          artist1:      a1.name || '',
          artist1Id:    a1.id   || '',
          artist1Image: a1.image?.src || '',
          audioUrl1:    a1.featuredTrack?.previewUrl      || '',
          videoUrl1:    a1.featuredMusicVideo?.previewUrl || '',

          artist2:      a2.name || '',
          artist2Id:    a2.id   || '',
          artist2Image: a2.image?.src || '',
          audioUrl2:    a2.featuredTrack?.previewUrl      || '',
          videoUrl2:    a2.featuredMusicVideo?.previewUrl || '',

          artist3:      a3.name || '',
          artist3Id:    a3.id   || '',
          artist3Image: a3.image?.src || '',
          audioUrl3:    a3.featuredTrack?.previewUrl      || '',
          videoUrl3:    a3.featuredMusicVideo?.previewUrl || '',

          venueName:    venue.name    || '',
          venueCity:    city.name     || '',
          venueSlug:    city.slug     || '',
          venueCountry: city.countryCode || '',
        };
      });
  }

  async getPage(page = 0, pageSize = 20) {
    const events = await this.fetchEvents();
    const start  = page * pageSize;
    const end    = start + pageSize;

    return {
      events:  events.slice(start, end),
      total:   events.length,
      hasMore: end < events.length,
      page,
    };
  }

  async filterEvents(filters = {}) {
    let filtered = await this.fetchEvents();

    if (filters.city) {
      const q = filters.city.toLowerCase();
      filtered = filtered.filter(e => e.venueCity?.toLowerCase() === q);
    }
    if (filters.from) {
      filtered = filtered.filter(e => new Date(e.date) >= new Date(filters.from));
    }
    if (filters.to) {
      filtered = filtered.filter(e => new Date(e.date) <= new Date(filters.to));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(e =>
        e.artist1?.toLowerCase().includes(q) ||
        e.artist2?.toLowerCase().includes(q) ||
        e.artist3?.toLowerCase().includes(q) ||
        e.venueName?.toLowerCase().includes(q) ||
        e.venueCity?.toLowerCase().includes(q)
      );
    }

    return filtered;
  }

  async getCities() {
    const events = await this.fetchEvents();
    const cities = new Set();
    events.forEach(e => { if (e.venueCity) cities.add(e.venueCity); });
    return Array.from(cities).sort();
  }
}

window.sooonAPI = new SooonAPI();


// ============================================================
// CARD HTML BUILDER
//
// Generates .card_feed_item markup that sooon-core.js expects.
//
// NOTE: This template produces the minimum structure needed for
// audio injection, artist switching, and scroll animations.
// If your Webflow modals are driven by Webflow Interactions
// (IX), copy the actual Webflow card HTML from DevTools into
// this function and replace text content with template literals.
// ============================================================

function createEventCardHTML(event) {
  // Build per-artist blocks
  const artists = [
    { id: 1, name: event.artist1, image: event.artist1Image },
    { id: 2, name: event.artist2, image: event.artist2Image },
    { id: 3, name: event.artist3, image: event.artist3Image },
  ].filter(a => a.name);

  const visuals = artists.map((a, i) => `
      <div class="artist-visual${i === 0 ? ' is-active' : ''}" data-artist-id="${a.id}">
        <img src="${a.image || ''}" alt="${a.name}" loading="${i === 0 ? 'eager' : 'lazy'}">
      </div>`).join('');

  const titles = artists.map((a, i) => `
      <div class="artist-title${i === 0 ? ' is-active' : ''}" data-artist-id="${a.id}">${a.name}</div>`).join('');

  const triggers = artists.length > 1
    ? artists.map(a => `
      <button class="artist-trigger" data-artist-id="${a.id}" type="button" aria-label="Switch to ${a.name}"></button>`).join('')
    : '';

  // Human-readable date: "2026-02-25" → "25 February 2026"
  let displayDate = event.date;
  try {
    const d = new Date(event.date + 'T00:00:00');
    displayDate = d.toLocaleDateString('en-CH', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (_) {}

  return `
  <div class="card_feed_item w-dyn-item"
       data-event-slug="${event.slug}"
       data-audio-url-1="${event.audioUrl1}"
       data-audio-url-2="${event.audioUrl2}"
       data-audio-url-3="${event.audioUrl3}"
       data-video-url-1="${event.videoUrl1}"
       data-venue-city="${event.venueCity}">

    <div class="card_feed_background-image-wrapper">
      ${visuals}
    </div>

    <div class="card_feed_content">
      ${titles}
      ${triggers}

      <div class="card_feed_event-details">
        <p class="event_location-venue">${event.venueName}</p>
        <p class="event_location-city">${event.venueCity}</p>
        <p class="date_detailed">${displayDate}</p>
      </div>

      <div class="card_feed_actions">
        ${event.ticketLink
          ? `<a href="${event.ticketLink}" target="_blank" rel="noopener noreferrer" class="ticket-link">Tickets</a>`
          : ''}
        <button class="audio-on-off_button" type="button" aria-label="Toggle audio">
          <span class="audio-on-icon"></span>
          <span class="audio-off-icon is-hidden"></span>
        </button>
        <button class="modal-open-button modal-open-hitarea" type="button" aria-label="Event details"></button>
      </div>
    </div>

    <!-- Required by event-features.js for share/calendar/map -->
    <span data-event-slug-source="true" style="display:none">${event.slug}</span>
  </div>`;
}


// ============================================================
// FEED INITIALIZATION
// ============================================================

let _currentPage  = 0;
let _isLoadingMore = false;

async function initFeedWithAPI() {
  console.log('[API] Initializing feed...');

  const feedContainer = document.querySelector('.card_feed');
  if (!feedContainer) {
    console.warn('[API] .card_feed not found — skipping');
    return;
  }

  try {
    const { events, total, hasMore } = await window.sooonAPI.getPage(0, 20);
    console.log(`[API] Rendering ${events.length} of ${total} events`);

    // Replace Webflow CMS placeholder items
    feedContainer.innerHTML = '';

    const fragment = document.createDocumentFragment();
    events.forEach(event => {
      const tmp = document.createElement('div');
      tmp.innerHTML = createEventCardHTML(event).trim();
      fragment.appendChild(tmp.firstElementChild);
    });
    feedContainer.appendChild(fragment);

    if (hasMore) {
      _setupInfiniteScroll(feedContainer);
    }

    window.sooonFeedReady = true;
    console.log('[API] Feed ready');

  } catch (err) {
    console.error('[API] Feed init failed:', err);
  }
}


// ============================================================
// INFINITE SCROLL
// ============================================================

function _setupInfiniteScroll(container) {
  const sentinel = document.createElement('div');
  sentinel.className = 'sooon-load-sentinel';
  sentinel.style.cssText = 'height:1px;pointer-events:none';
  container.appendChild(sentinel);

  const observer = new IntersectionObserver(async (entries) => {
    if (!entries[0].isIntersecting || _isLoadingMore) return;

    _isLoadingMore = true;
    _currentPage++;

    try {
      const { events, hasMore } = await window.sooonAPI.getPage(_currentPage, 20);

      const fragment = document.createDocumentFragment();
      events.forEach(event => {
        const tmp = document.createElement('div');
        tmp.innerHTML = createEventCardHTML(event).trim();
        fragment.appendChild(tmp.firstElementChild);
      });
      sentinel.before(fragment);

      console.log(`[API] Loaded page ${_currentPage} (+${events.length} events)`);

      if (!hasMore) {
        sentinel.remove();
        observer.disconnect();
        console.log('[API] All events loaded');
      }
    } catch (err) {
      console.error('[API] Load more failed:', err);
    } finally {
      _isLoadingMore = false;
    }
  }, { rootMargin: '500px 0px' });

  observer.observe(sentinel);
}


// ============================================================
// BOOT
// ============================================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFeedWithAPI);
} else {
  initFeedWithAPI();
}
