# Sooon Event Importer

Automated script that syncs events from `beta.sooon.live/api/feed.json` into the Webflow CMS for the sooon concert discovery platform.

---

## What it does

1. **Fetches** all events from the API feed
2. **Auto-creates** any cities that don't yet exist in Webflow
3. **Creates** new events (identified by `external-event-id-2`)
4. **Updates** existing events when key fields change (date, venue, artists, audio URLs, ticket link)
5. **Leaves** events in Webflow even if they're removed from the API feed
6. Processes in **batches of 10** with a 1-second delay between batches to stay within Webflow rate limits

---

## Collections

| Collection | Webflow ID |
|---|---|
| Events | `694464b1f05b9efbbd9a6d0f` |
| Cities | `6978fd1a463cc054d41c88f6` |
| Locale | `694464b16ad64d6f0f45c543` |

---

## Manual run

### Prerequisites

- Node.js 18 or later
- A Webflow API token with read/write access to the CMS

### Steps

```bash
# 1. Clone the repo (if you haven't already)
git clone https://github.com/DanNessler/sooon-new-scripts
cd sooon-new-scripts

# 2. Set your Webflow API token
export WEBFLOW_API_TOKEN=your_token_here

# 3. Run the importer
node scripts/import-events.js
```

### Sample output

```
=== Sooon Event Importer ===

Fetching events from API... 42 events found.
Fetching Webflow cities... 8 cities found.

Creating 2 missing city/cities:
  + Konstanz (konstanz)
  + Wil (wil)

Fetching Webflow events... 35 events found.

Processing 42 events in 5 batch(es):

Batch 1/5 (events 1–10):
  + Created:  Cara Rose
  = Skipped:  The Kooks
  ~ Updated:  Pina Palau & Solong
  ...

─────────────────────────────────────
Import complete:
  Created:  7
  Updated:  3
  Skipped:  32
  Total:    42
─────────────────────────────────────
```

---

## GitHub Actions (automated daily run)

The workflow at `.github/workflows/import-events.yml` runs the importer automatically every day at **6 AM UTC**.

### Setup

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `WEBFLOW_API_TOKEN`
4. Value: your Webflow API token
5. Click **Add secret**

That's it. The action runs on schedule automatically.

### Manual trigger

You can also run the action manually at any time:

1. Go to your GitHub repo → **Actions** tab
2. Select **Import Events to Webflow** from the left sidebar
3. Click **Run workflow** → **Run workflow**

---

## Field mapping

| Webflow field | Source |
|---|---|
| `name` | Artist names joined with ` & ` |
| `slug` | `data.slug` |
| `date` | `data.date` (converted to ISO 8601) |
| `venue-name` | `data.venue.name` |
| `venue-city` | `data.venue.city.name` |
| `venue-country-code` | `data.venue.city.countryCode` |
| `venue-city-ref` | City item ID looked up by `data.venue.city.slug` |
| `external-event-id-2` | `data.id` |
| `ticket-link` | `data.tickets[0].url` |
| `artist-1` | `data.artists[0].name` |
| `artist-1-id` | `data.artists[0].id` |
| `artist-1-img` | `data.artists[0].image.src` |
| `audio-url` | `data.artists[0].featuredTrack.previewUrl` |
| `artist-1-track-name` | `data.artists[0].featuredTrack.name` |
| `artist-1-track-apple-music-url` | `data.artists[0].featuredTrack.appleMusicUrl` |
| `artist-1-music-video-name` | `data.artists[0].featuredMusicVideo.name` |
| `artist-1-music-video-url` | `data.artists[0].featuredMusicVideo.previewUrl` |
| `video-link-hack` | `data.artists[0].featuredMusicVideo.previewUrl` |
| `artist-1-music-video-hls-url` | `data.artists[0].featuredMusicVideo.hlsPreviewUrl` |
| `artist-2` … `artist-2-music-video-hls-url` | Same pattern for `artists[1]` |
| `artist-3` … `artist-3-music-video-hls-url` | Same pattern for `artists[2]` |

**Notes:**
- Relative image URLs (e.g. `/_astro/...`) are automatically prefixed with `https://beta.sooon.live`
- Image fields and the city reference field are omitted (not set to `""`) when no value is available
- Events with only 1 or 2 artists leave the unused artist fields as empty strings

---

## Troubleshooting

### `Error: WEBFLOW_API_TOKEN environment variable is not set`

You forgot to export the token before running:
```bash
export WEBFLOW_API_TOKEN=your_token_here
node scripts/import-events.js
```

### `Webflow POST /collections/... → 400: ...`

The most common causes:
- **Duplicate slug** — an event with the same slug already exists (possibly under a different external ID). Check the Webflow CMS for a conflicting slug.
- **Invalid field value** — a field type mismatch. Check the Webflow CMS field types match what the script sends (PlainText, Link, Image, DateTime, Reference).
- **Missing required field** — `name` or `slug` is empty. This shouldn't happen with a well-formed API response, but check the event's data in the feed.

### `Webflow GET /collections/... → 401`

Your API token is invalid or expired. Generate a new one in Webflow → Account → API Access.

### `Webflow GET /collections/... → 429`

Webflow rate limit hit. The script already has a 1-second delay between batches. If this happens frequently, increase `BATCH_DELAY_MS` at the top of `scripts/import-events.js`.

### City not linked (events missing city filter)

This happens if the city creation step failed silently. Check the import output for any `✗ Failed to create city` lines. You can re-run the importer — it will retry the city creation and re-link events if needed.

### GitHub Action shows no changes pushed

The importer only modifies Webflow CMS data via the API. It doesn't commit anything to the repo, so the git status won't change. Check the Action logs for the import summary.
