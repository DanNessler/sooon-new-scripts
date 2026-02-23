#!/usr/bin/env node
/**
 * import-events.js
 *
 * Automated event importer: beta.sooon.live/api/feed.json → Webflow CMS
 *
 * Usage:
 *   WEBFLOW_API_TOKEN=<token> node scripts/import-events.js
 *
 * Behaviour:
 *   - Fetches all events from the API feed
 *   - Auto-creates any cities that don't exist in Webflow yet
 *   - Creates new events (detected by external-event-id-2)
 *   - Updates existing events if key fields have changed
 *   - Leaves events in Webflow even if they disappear from the API
 *   - Processes in batches of 10 with 1 s delay between batches
 */

'use strict';

const https = require('https');

// ─── Configuration ────────────────────────────────────────────────────────────

const API_URL             = 'https://beta.sooon.live/api/feed.json';
const API_BASE            = 'https://beta.sooon.live';

const EVENTS_COLLECTION   = '694464b1f05b9efbbd9a6d0f';
const CITIES_COLLECTION   = '6978fd1a463cc054d41c88f6';
const LOCALE_ID           = '694464b16ad64d6f0f45c543';

const BATCH_SIZE          = 10;
const BATCH_DELAY_MS      = 1000;   // between batches
const PAGINATION_DELAY_MS = 250;    // between pagination fetches

// Fields compared when deciding whether to update an existing event
const UPDATE_FIELDS = [
  'date',
  'venue-name',
  'venue-city',
  'ticket-link',
  'artist-1',
  'artist-2',
  'artist-3',
  'audio-url',
  'audio-url---artist-2',
  'audio-url---artist-3',
];

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Fix relative image URLs from the API (/_astro/... or /path/...)
 * by prepending the API base URL.
 */
function fixImageUrl(src) {
  if (!src) return '';
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  return API_BASE + (src.startsWith('/') ? src : '/' + src);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── HTTP Helpers ─────────────────────────────────────────────────────────────

/**
 * Fetch and parse JSON from a URL (HTTPS GET, follows one redirect).
 */
function fetchJson(urlStr) {
  return new Promise((resolve, reject) => {
    https.get(urlStr, res => {
      // Follow a single redirect
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchJson(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode} from ${urlStr}`));
        return;
      }
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON parse error from ${urlStr}: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Make an authenticated request to the Webflow v2 API.
 */
function webflowRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;

    const options = {
      hostname: 'api.webflow.com',
      path: `/v2${path}`,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(payload && {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        }),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 400) {
          let msg = data;
          try {
            const parsed = JSON.parse(data);
            msg = parsed.message || parsed.err || parsed.code || data;
          } catch { /* use raw data */ }
          reject(new Error(`Webflow ${method} ${path} → ${res.statusCode}: ${msg}`));
          return;
        }
        if (!data.trim()) {
          resolve({});
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON parse error from Webflow ${path}: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Webflow CMS Helpers ──────────────────────────────────────────────────────

/**
 * Fetch every item from a collection, handling offset pagination.
 */
async function fetchAllItems(collectionId, token) {
  const allItems = [];
  const limit = 100;
  let offset = 0;

  while (true) {
    const res = await webflowRequest(
      'GET',
      `/collections/${collectionId}/items?limit=${limit}&offset=${offset}`,
      null,
      token,
    );
    const batch = res.items || [];
    allItems.push(...batch);
    if (batch.length < limit) break; // last page
    offset += limit;
    await sleep(PAGINATION_DELAY_MS);
  }

  return allItems;
}

/**
 * Create a new published CMS item.
 */
function createItem(collectionId, fieldData, token) {
  return webflowRequest(
    'POST',
    `/collections/${collectionId}/items`,
    {
      isDraft: false,
      isArchived: false,
      cmsLocaleIds: [LOCALE_ID],
      fieldData,
    },
    token,
  );
}

/**
 * Update an existing CMS item (partial update, keeps other fields intact).
 */
function updateItem(collectionId, itemId, fieldData, token) {
  return webflowRequest(
    'PATCH',
    `/collections/${collectionId}/items/${itemId}`,
    {
      isDraft: false,
      isArchived: false,
      cmsLocaleIds: [LOCALE_ID],
      fieldData,
    },
    token,
  );
}

// ─── Field Mapping ────────────────────────────────────────────────────────────

/**
 * Map one API event object to the 37-field Webflow fieldData shape.
 *
 * @param {object} data        - API event's `data` property
 * @param {object} citySlugToId - map of city slug → Webflow city item ID
 */
function buildFieldData(data, citySlugToId) {
  const artists = data.artists || [];
  const a1      = artists[0] || {};
  const a2      = artists[1] || {};
  const a3      = artists[2] || {};

  const venue  = data.venue  || {};
  const city   = venue.city  || {};
  const cityId = citySlugToId[city.slug] || '';

  // Build event name from artist names (e.g. "Pina Palau & Solong")
  const name = artists.map(a => a.name).filter(Boolean).join(' & ') || data.slug || '';

  // First ticket URL (if any)
  const ticketUrl = data.tickets?.[0]?.url || '';

  const fields = {
    // ── Basic ─────────────────────────────────────────────────────────────────
    name,
    slug:                              data.slug              || '',
    date:                              data.date ? `${data.date}T00:00:00.000Z` : '',
    'venue-name':                      venue.name             || '',
    'venue-city':                      city.name              || '',
    'venue-country-code':              city.countryCode       || '',
    'external-event-id-2':             data.id                || '',
    'ticket-link':                     ticketUrl,

    // ── Artist 1 ──────────────────────────────────────────────────────────────
    'artist-1':                        a1.name                              || '',
    'artist-1-id':                     a1.id                                || '',
    'audio-url':                       a1.featuredTrack?.previewUrl         || '',
    'artist-1-track-name':             a1.featuredTrack?.name               || '',
    'artist-1-track-apple-music-url':  a1.featuredTrack?.appleMusicUrl      || '',
    'artist-1-music-video-name':       a1.featuredMusicVideo?.name          || '',
    'artist-1-music-video-url':        a1.featuredMusicVideo?.previewUrl    || '',
    'video-link-hack':                 a1.featuredMusicVideo?.previewUrl    || '',
    'artist-1-music-video-hls-url':    a1.featuredMusicVideo?.hlsPreviewUrl || '',

    // ── Artist 2 ──────────────────────────────────────────────────────────────
    'artist-2':                        a2.name                              || '',
    'artist-2-id':                     a2.id                                || '',
    'audio-url---artist-2':            a2.featuredTrack?.previewUrl         || '',
    'artist-2-track-name':             a2.featuredTrack?.name               || '',
    'artist-2-track-apple-music-url':  a2.featuredTrack?.appleMusicUrl      || '',
    'artist-2-music-video-name':       a2.featuredMusicVideo?.name          || '',
    'artist-2-music-video-url':        a2.featuredMusicVideo?.previewUrl    || '',
    'artist-2-music-video-hls-url':    a2.featuredMusicVideo?.hlsPreviewUrl || '',

    // ── Artist 3 ──────────────────────────────────────────────────────────────
    'artist-3':                        a3.name                              || '',
    'artist-3-id':                     a3.id                                || '',
    'audio-url---artist-3':            a3.featuredTrack?.previewUrl         || '',
    'artist-3-track-name':             a3.featuredTrack?.name               || '',
    'artist-3-track-apple-music-url':  a3.featuredTrack?.appleMusicUrl      || '',
    'artist-3-music-video-name':       a3.featuredMusicVideo?.name          || '',
    'artist-3-music-video-url':        a3.featuredMusicVideo?.previewUrl    || '',
    'artist-3-music-video-hls-url':    a3.featuredMusicVideo?.hlsPreviewUrl || '',
  };

  // ── Image fields (only set when a URL is available) ───────────────────────
  const img1 = fixImageUrl(a1.image?.src);
  const img2 = fixImageUrl(a2.image?.src);
  const img3 = fixImageUrl(a3.image?.src);
  if (img1) fields['artist-1-img'] = img1;
  if (img2) fields['artist-2-img'] = img2;
  if (img3) fields['artist-3-img'] = img3;

  // ── Reference field (only set when the city ID is known) ─────────────────
  if (cityId) fields['venue-city-ref'] = cityId;

  return fields;
}

/**
 * Return true if any of the key update-tracked fields have changed.
 */
function hasChanges(existingFieldData, incomingFieldData) {
  return UPDATE_FIELDS.some(
    f => (existingFieldData[f] ?? '') !== (incomingFieldData[f] ?? ''),
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // ── 0. Validate token ──────────────────────────────────────────────────────
  const token = process.env.WEBFLOW_API_TOKEN;
  if (!token) {
    console.error('Error: WEBFLOW_API_TOKEN environment variable is not set.');
    console.error('Set it with: export WEBFLOW_API_TOKEN=<your-token>');
    process.exit(1);
  }

  console.log('=== Sooon Event Importer ===\n');

  // ── 1. Fetch events from the API ───────────────────────────────────────────
  process.stdout.write('Fetching events from API... ');
  const rawFeed   = await fetchJson(API_URL);
  const apiEvents = rawFeed
    .filter(e => e.type === 'MusicEvent' && e.data?.id)
    .map(e => e.data);
  console.log(`${apiEvents.length} events found.`);

  if (apiEvents.length === 0) {
    console.log('Nothing to import. Exiting.');
    return;
  }

  // ── 2. Fetch existing Webflow cities ───────────────────────────────────────
  process.stdout.write('Fetching Webflow cities... ');
  const existingCities = await fetchAllItems(CITIES_COLLECTION, token);
  const citySlugToId   = Object.fromEntries(
    existingCities.map(c => [c.fieldData?.slug, c.id]),
  );
  console.log(`${existingCities.length} cities found.`);

  // ── 3. Create any missing cities ───────────────────────────────────────────
  const requiredSlugs = [...new Set(
    apiEvents.map(e => e.venue?.city?.slug).filter(Boolean),
  )];
  const missingSlugs = requiredSlugs.filter(s => !citySlugToId[s]);

  if (missingSlugs.length > 0) {
    console.log(`\nCreating ${missingSlugs.length} missing city/cities:`);
    for (const slug of missingSlugs) {
      const event = apiEvents.find(e => e.venue?.city?.slug === slug);
      const city  = event.venue.city;
      try {
        const res          = await createItem(CITIES_COLLECTION, { name: city.name, slug }, token);
        citySlugToId[slug] = res.id;
        console.log(`  + ${city.name} (${slug})`);
      } catch (err) {
        console.error(`  ✗ Failed to create city "${city.name}": ${err.message}`);
      }
      await sleep(BATCH_DELAY_MS);
    }
  }

  // ── 4. Fetch existing Webflow events ───────────────────────────────────────
  process.stdout.write('\nFetching Webflow events... ');
  const existingEvents = await fetchAllItems(EVENTS_COLLECTION, token);
  const externalIdToItem = Object.fromEntries(
    existingEvents
      .filter(e => e.fieldData?.['external-event-id-2'])
      .map(e => [e.fieldData['external-event-id-2'], e]),
  );
  console.log(`${existingEvents.length} events found.`);

  // ── 5. Process events in batches ───────────────────────────────────────────
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors  = 0;

  const totalBatches = Math.ceil(apiEvents.length / BATCH_SIZE);
  console.log(`\nProcessing ${apiEvents.length} events in ${totalBatches} batch(es):\n`);

  for (let i = 0; i < apiEvents.length; i += BATCH_SIZE) {
    const batch    = apiEvents.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const rangeEnd = Math.min(i + BATCH_SIZE, apiEvents.length);
    console.log(`Batch ${batchNum}/${totalBatches} (events ${i + 1}–${rangeEnd}):`);

    for (const data of batch) {
      const fieldData = buildFieldData(data, citySlugToId);
      const existing  = externalIdToItem[data.id];

      try {
        if (existing) {
          if (hasChanges(existing.fieldData, fieldData)) {
            await updateItem(EVENTS_COLLECTION, existing.id, fieldData, token);
            console.log(`  ~ Updated:  ${fieldData.name}`);
            updated++;
          } else {
            console.log(`  = Skipped:  ${fieldData.name}`);
            skipped++;
          }
        } else {
          await createItem(EVENTS_COLLECTION, fieldData, token);
          console.log(`  + Created:  ${fieldData.name}`);
          created++;
        }
      } catch (err) {
        console.error(`  ✗ Error:    ${fieldData.name} — ${err.message}`);
        errors++;
      }
    }

    // Wait between batches (not after the last one)
    if (i + BATCH_SIZE < apiEvents.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  // ── 6. Summary ─────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────');
  console.log('Import complete:');
  console.log(`  Created:  ${created}`);
  console.log(`  Updated:  ${updated}`);
  console.log(`  Skipped:  ${skipped}`);
  if (errors > 0) {
    console.log(`  Errors:   ${errors}`);
  }
  console.log(`  Total:    ${apiEvents.length}`);
  console.log('─────────────────────────────────────');

  if (errors > 0) process.exit(1);
}

main().catch(err => {
  console.error(`\nFatal error: ${err.message}`);
  process.exit(1);
});
