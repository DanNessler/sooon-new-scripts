# sooon Project Context

**Last Updated:** 2026-02-19 (v5.2 — bookmarks feature)
**Project Type:** Mobile-first concert discovery platform
**Stack:** Webflow CMS + Custom JavaScript

---

## Project Overview

Mobile-first concert discovery platform with full-screen snap-scroll feed, audio previews, event sharing, and bookmarking. Full-screen snap-scroll feed where users swipe through events with audio previews.

### Environment

**Production:**
- URL: https://sooon-new.webflow.io
- Site ID: `6944209ecd50132eb772fc5b`
- Home Page ID: `694420a0cd50132eb772fd2b`
- Team ID: `62a297825ce2ea0165ddd074`

**Designer:**
- URL: https://sooon-new.design.webflow.com

**Repository:**
- GitHub: https://github.com/DanNessler/sooon-new-scripts
- Branch: main
- CDN: cdn.jsdelivr.net/gh/DanNessler/sooon-new-scripts@main/scripts/

---

## Core Constraints

1. **Webflow only** — No React/Vue/framework rewrites
2. **iOS Safari primary target** — Most difficult constraint
3. **Finsweet Attributes v2** — For filtering/CMS interactions
4. **Client-First naming** — Aligned, not dogmatic
5. **Stability over cleverness** — Small, safe improvements
6. **CDN Delivery** — Scripts served via jsDelivr from GitHub

---

## CMS Collections

### Events (694464b1f05b9efbbd9a6d0f)

**Fields:**
- `name` (PlainText, required) — Event title
- `slug` (PlainText, required) — URL slug
- `date` (DateTime) — Event date
- `artist-1`, `artist-2`, `artist-3` (PlainText) — Up to 3 artists per event
- `artist-1-img`, `artist-2-img`, `artist-3-img` (Image) — Artist visuals
- `audio-url`, `audio-url---artist-2`, `audio-url---artist-3` (Link) — Audio preview URLs
- `artist-1-video-hack-temp` (Link) — Temporary video URL field
- `venue-name` (PlainText) — Venue name
- `venue-city` (PlainText) — City name (plain text)
- `venue-city-ref` (Reference → Support_List_Cities) — City reference for filtering
- `ticket-link` (Link) — Ticket purchase URL
- `external-event-id-2` (PlainText) — External ID

**Relationships:**
- References `Support_List_Cities` via `venue-city-ref` field

**Slug Format:**
- Pattern: `YYYY-MM-DD-{artist-name}-{venue-identifier}`
- Example: `2026-01-16-baze-le-singe-37a80`

### Support_List_Cities (6978fd1a463cc054d41c88f6)

**Fields:**
- `name` (PlainText, required) — City name
- `slug` (PlainText, required) — URL slug

**Purpose:**
- Used for Finsweet filter dropdown (location filter)
- Referenced by Events collection via `venue-city-ref`

---

## Finsweet Attributes v2 Setup

### Main List
- `fs-list-instance="events"` — Main CMS list identifier
- `fs-list-element="list"` — Collection list wrapper
- `fs-list-element="items-count"` — Total items counter
- `fs-list-element="results-count"` — Filtered results counter
- `fs-list-element="clear"` — Clear filters button
- `fs-list-element="filters"` — Filter form element

### Filtering
- `fs-list-field="city"` — City checkbox filters (uses venue-city-ref)
- `fs-list-field="event_date"` — Date radio filters
- `fs-list-operator="equal"` — Exact match operator
- `fs-list-operator="greater-equal"` — Date range operator
- `fs-list-element="facet-count"` — Shows count per filter option

### Date Filters (Custom Logic)
Custom date values injected via JavaScript:
- `data-date-role="today"` — Today's events
- `data-date-role="tomorrow"` — Tomorrow's events
- `data-date-role="next-month-start"` — Next month & later

Implementation in sooon-core.js (date filtering section):
```javascript
// Dynamically sets filter values based on current date
// Values: today, tomorrow, next-month-start
// Format: YYYY-MM-DD
```

### Sorting
- `fs-cmssort-field="IDENTIFIER"` — Sort field (appears in list view)

---

## Site Structure & Key Classes

### Main Views

**1. Feed View** (`.card_feed`)
- Full viewport CMS items
- CSS `scroll-snap-type: y mandatory`
- Audio plays at ~60% viewport intersection
- Snap-scroll behavior

**2. Filter View** (`.filter_screen`)
- Overlay list view
- Location & date filtering via Finsweet
- Clicking item jumps to feed card & closes filter
- Uses `.stacked-list2_item[data-target-slug]` for linking

**3. Event Modal** (`.event_modal_scope`)
- Opens on top of feed via Webflow IX
- Artist info, venue, dates, ticket link
- Background scroll locked via JS (iOS focus)
- Share button inside modal

### Feed Card Classes
- `.card_feed` — Feed container
- `.card_feed_item` — Individual event card
- `[data-feed-slug="true"]` — Slug reference for filter jump
- `[data-event-slug]` — Slug attribute for scroll targeting

### Modal Classes
- `.event_modal_scope` — Modal container (gets `.is-open` via Webflow IX)
- `.event_modal` — Inner modal wrapper
- `.event_modal_hero_artist_content` — Artist hero section
- `.artist-title.is-active` — Active artist name
- `.event_location-venue` — Venue name
- `.event_location-city` — City name
- `.date_detailed` — Full date string
- `[data-event-slug-source="true"]` — Event slug (for deep links & bookmarks)
- `.modal-open-button` — Opens modal
- `.modal-open-hitarea` — Invisible click area to open modal
- `.modal-close-button` — Closes modal

### Audio Classes
- `audio.track-audio, audio.sooon-audio` — Audio elements
- `[data-sooon-audio-toggle="true"]` — Audio on/off toggle (intro)
- `[data-sooon-audio-label="true"]` — Audio status label (ON/OFF)
- `.audio-on-off_button` — Feed card audio toggle button
- `.audio-on-icon` — Audio ON icon
- `.audio-off-icon` — Audio OFF icon

### Artist Switcher Classes (Multi-Artist Cards)
- `.artist-trigger` — Clickable trigger to switch artist
- `.artist-visual` — Artist visual element
- `.artist-title` — Artist title element
- `[data-artist-id="1|2|3"]` — Artist identifier (1, 2, or 3)
- `.is-active` — Active state class

### Bookmark Classes & Selectors
- `[data-bookmark-action="toggle"]` — Bookmark toggle button (inside modal)
- `.bookmark-icon-inactive` — Icon shown when NOT bookmarked
- `.bookmark-icon-active` — Icon shown when bookmarked
- `.bookmark-indicator` — Dot indicator on feed cards (visible when bookmarked)
- `[data-event-slug-source="true"]` — Slug source (shared with share/map/calendar features)
- `[data-feed-slug="true"]` — Fallback slug source on feed cards
- `[data-favourites-list="container"]` — Favourites tab container
- `[data-favourites-template="true"]` — Hidden clone source for favourites list items
- `[data-favourites-empty="true"]` — Empty state message in favourites tab
- `[data-fav-artist]`, `[data-fav-venue]`, `[data-fav-date]`, `[data-fav-city]` — Text targets in favourites clone

### Onboarding Classes
- `[data-sooon-onboarding="screen"]` or `.intro-screen` — Onboarding overlay
- `[data-sooon-onboarding-confirm="true"]` — "Discover Shows" button
- `.button-toggle-circle` — Toggle button circle element
- `.is-on` — Toggle active state
- `.is-hidden` — Hidden state

### Animation Classes
- `[data-animate="true"]` — Elements to animate
- `.anim-start-in` — Initial state (offscreen)
- `.anim-start-out` — Exit state
- `data-delay-in` — Entrance delay (ms)
- `data-delay-out` — Exit delay (ms)
- `data-exit-threshold` — Exit threshold percentage

### Body States
- `.is-locked` — Scroll lock (modal open or onboarding)

---

## Audio Logic (Critical)

### Rules
- **Only one audio plays at a time** (globally enforced)
- Starts when card is **60% visible** in viewport (IntersectionObserver threshold: 0.6)
- Stops when card leaves view
- Respects **iOS autoplay restrictions** (unlocked on user gesture)
- Stored in `localStorage`: `sooon_audio_enabled` ("1" or "0")
- **Default: ON** (`DEFAULT_AUDIO_ENABLED = true`) — except deep link first visitors (OFF)

### Flow
1. User lands → Check `sooon_onboarding_seen` in localStorage
2. **Deep link first visit** (`#event-{slug}` + never visited) → Skip intro, audio OFF, go to event
3. **Regular first visit** (no deep link) → Show onboarding, audio ON, wait for "Discover Shows"
4. **Returning visitor** → Skip intro, use saved audio preference
5. User clicks "Discover Shows" → Unlock iOS audio, play first visible card
6. Scroll → Audio switches based on 60% visibility threshold
7. Toggle audio → Updates localStorage, updates all UI, restarts current audio if turning ON

### Multi-Artist Switching
- Cards can have up to 3 artists with separate audio tracks
- Clicking `.artist-trigger` switches active artist
- Pauses all audios in card, plays selected artist's audio (if enabled)
- Updates `.is-active` class on visual and title elements

### Audio State Sync (Split Architecture)
- **sooon-critical.js** manages intro toggle UI via `syncToggleUI()` (`.is-on` class, ON/OFF label)
- **sooon-core.js** manages feed button UI via `updateFeedButtonsUI()` (`.is-hidden` on icons)
- Coordination: intro toggle dispatches `sooon:audio-changed` event, core.js listens and syncs
- Both read/write `sooon_audio_enabled` in localStorage

### Must Survive
- Fast scrolling
- Filter jumps
- Modal open/close
- Multi-artist switching
- Audio toggle on/off

---

## Current Scripts (v5.2 — Split Architecture + Bookmarks)

Scripts are split into tiers for fast intro screen loading.

### Load Order (Webflow Before `</body>` tag)
```html
<!-- Critical: intro screen works immediately -->
<script src="https://cdn.jsdelivr.net/gh/DanNessler/sooon-new-scripts@{COMMIT_HASH}/scripts/sooon-critical.js"></script>

<!-- Deferred: loads in background while user sees intro -->
<script src="https://cdn.jsdelivr.net/gh/DanNessler/sooon-new-scripts@{COMMIT_HASH}/scripts/sooon-core.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/DanNessler/sooon-new-scripts@{COMMIT_HASH}/scripts/event-features.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/DanNessler/sooon-new-scripts@{COMMIT_HASH}/scripts/sooon-bookmarks.js" defer></script>
```

**IMPORTANT:** Always use a commit hash (e.g., `@fe504b4`), NOT `@main`. jsDelivr caches `@main` unpredictably — even purging via `purge.jsdelivr.net` is unreliable. Commit hash URLs are immutable and always correct.

### Coordination Between Scripts
- **sooon-critical.js** sets `localStorage` + `window.sooonIntroReady = true` when intro is dismissed (or skipped for deep link first visitors)
- **sooon-core.js** reads `localStorage` on init, listens for `sooon:audio-changed` custom event from intro toggle. Sets `window.sooonFeedReady = true` after feed initialization (cards loaded + assets processed)
- Both files attach independent click handlers to "Discover Shows" button (critical = state, core = audio)
- **event-features.js** deep link navigation polls `window.sooonFeedReady` before scrolling. Share/map/calendar features are independent (event delegation, only triggers in modals)
- **sooon-bookmarks.js** is fully independent — no cross-script flags needed

### Deep Link Flow (Cross-Script)
```
sooon-critical.js (blocking):
  → Detects #event-{slug} + first visit
  → Skips intro, sets audio OFF, marks onboarding seen
  → Sets window.sooonIntroReady = true

sooon-core.js (deferred):
  → Reads onboarding_seen = '1' → calls start() immediately
  → Polls for CMS cards → init() → sets window.sooonFeedReady = true

event-features.js (deferred):
  → Detects #event-{slug} hash
  → Polls window.sooonFeedReady (100ms intervals, 10s max)
  → Finds card via data-event-slug attribute
  → Removes is-locked, scrolls instantly, verifies position
```

---

### 1. sooon-critical.js ✅ PRODUCTION (blocking, ~100 lines)
**Purpose:** Make intro screen interactive immediately (<1 second)
**Loaded:** Blocking `<script>` — runs before deferred scripts

**Features:**
- **Deep link first-visit detection** (`#event-{slug}` + no `sooon_onboarding_seen`)
  - Skips intro, sets audio OFF, marks onboarding as seen immediately
  - Returning visitors and regular first visitors unaffected
- Onboarding flow (check `sooon_onboarding_seen`, show/hide intro screen)
- Audio toggle on intro screen (`[data-sooon-audio-toggle="true"]`)
- "Discover Shows" button handler (`[data-sooon-onboarding-confirm="true"]`)
- localStorage read/write for `sooon_onboarding_seen` and `sooon_audio_enabled`
- iOS audio unlock on first user gesture
- Body scroll lock for intro screen (`.is-locked` class)
- Audio UI sync for intro toggle only (`.button-toggle-circle`, `.is-on`)
- Dispatches `sooon:audio-changed` custom event when toggle is clicked
- Sets `window.sooonIntroReady = true` when intro is dismissed or skipped

**Does NOT include:** Feed features, asset loading, modal logic, filters, animations

---

### 2. sooon-core.js ✅ PRODUCTION (deferred, ~400 lines)
**Purpose:** All feed functionality — loads in background while user sees intro

**Features:**
- **Sequential asset loader**
  - Waits for Webflow CMS to populate cards (polls until cards.length > 1)
  - Eager loads first 3 cards (`EAGER_CARDS = 3`)
  - Defers images/videos/audio on cards beyond #3 (`data-src` pattern)
  - Lazy loads via `IntersectionObserver` with `rootMargin: "200% 0px"`
  - Onboarding aware: waits for "Discover Shows" click on first visit
  - **Sets `window.sooonFeedReady = true`** after init completes (signals event-features.js)
- **Feed audio system**
  - Audio IntersectionObserver (60% threshold)
  - Audio play/pause logic (one at a time, globally enforced)
  - Feed card audio toggle buttons (`.audio-on-off_button` via delegation)
  - Feed audio UI sync (`.audio-on-icon`, `.audio-off-icon`, `.is-hidden`)
  - Listens for `sooon:audio-changed` event from sooon-critical.js
- **Modal scroll lock** (`.modal-open-button`, `.modal-open-hitarea`, `.modal-close-button`)
- **Scroll animations** (`[data-animate="true"]` with delays/thresholds)
- **Universal artist switcher** (multi-artist cards)
- **Filter-to-feed linking** (`.stacked-list2_item[data-target-slug]`)
- **Dynamic date filtering** (Finsweet integration, today/tomorrow/next-month)

**Key Configuration:**
```javascript
EAGER_CARDS = 3
LOAD_DISTANCE = '200%'
cardSelector = '.card_feed_item'
audioSelector = 'audio.track-audio, audio.sooon-audio'
audioObserver threshold = 0.6 (60% visible)
```

**localStorage Keys:**
- `sooon_onboarding_seen` — "1" if seen, null if first visit
- `sooon_audio_enabled` — "1" (ON) or "0" (OFF), default "1"

---

### 3. event-features.js ✅ PRODUCTION (deferred, ~580 lines)
**Purpose:** Combined event modal features — share, map, calendar export
**Structure:** 3 independent IIFEs, each with own config and event delegation

**Event Share:**
- Native Web Share API (mobile) with clipboard fallback (desktop)
- Deep link generation: `#event-{slug}`
- **Deep link navigation:** Waits for `window.sooonFeedReady`, uses `data-event-slug` attribute selector (same as filter-to-feed in sooon-core.js), instant scroll with verification + retry
- Slug cleaning: decodes URL encoding, strips appended share text
- Removes `is-locked` from body before scrolling
- Customizable share text via `data-share-template` attribute
- Button: `[data-share-action="event-share"]`

**Venue Map:**
- Google Maps URL: `https://maps.google.com/maps?q={venue},+{city}`
- Opens in new tab
- Button: `[data-map-action="open-venue"]`

**Calendar Export:**
- Generates .ics file from modal data (artist, venue, city, date)
- Parses EN + DE month names with fallback to native Date.parse
- Default time: 20:00–23:00 (configurable)
- Downloads as `event-{slug}.ics`
- Button: `[data-calendar-action="export"]`

**Shared Modal Pattern (all 3 features):**
- Finds `.event_modal.is-open`, traverses to parent `.event_modal_scope`
- Reads venue/city/artist/date/slug from scope

---

### 4. sooon-bookmarks.js ✅ PRODUCTION (deferred, ~360 lines)
**Purpose:** Event bookmarking with localStorage persistence and favourites list
**Console prefix:** `[Bookmarks]`

**Features:**
- **Toggle bookmark** — Click `[data-bookmark-action="toggle"]` inside open modal
- **Icon state** — Toggles `.is-hidden` on `.bookmark-icon-inactive` / `.bookmark-icon-active`
- **Feed card indicator** — Toggles `.is-hidden` on `.bookmark-indicator` dot per card
- **Favourites list population** — Clones `[data-favourites-template]` for each bookmarked slug into `.stacked-list2_list` inside `[data-favourites-list="container"]`
- **Modal open sync** — MutationObserver on `.event_modal` detects `is-open` class, syncs button icon state 100ms after open
- **Page load restore** — Polls for cards (50ms interval, max 40 attempts), then `syncAll()` restores all indicators from localStorage
- **Graceful degradation** — Works without localStorage (storage errors caught silently)

**Slug resolution:**
- Modal: `[data-event-slug-source="true"]` textContent inside `.event_modal_scope`
- Feed cards: `[data-event-slug-source="true"]` or `[data-feed-slug="true"]` inside `.event_modal_scope`

**localStorage Key:**
- `sooon_bookmarks` — JSON array of bookmarked slugs e.g. `["2026-01-16-baze-le-singe-37a80"]`

**Favourites list DOM structure expected:**
```
[data-favourites-list="container"]
  └─ .stacked-list2_list
      └─ [data-favourites-template].is-template  ← hidden clone source
  └─ [data-favourites-empty]                     ← empty state
```

**Favourites clone targets:** `[data-fav-artist]`, `[data-fav-venue]`, `[data-fav-date]`, `[data-fav-city]`

---

### Deprecated Scripts (replaced by split architecture)

| Old File | Replaced By | Status |
|---|---|---|
| `sooon-footer.js` | `sooon-critical.js` + `sooon-core.js` | Kept for reference |
| `event-share.js` | `event-features.js` (Event Share section) | Kept for reference |
| `venue-map.js` | `event-features.js` (Venue Map section) | Kept for reference |
| `calendar-export.js` | `event-features.js` (Calendar Export section) | Kept for reference |

---

### Other Files

**sooon-head.js** — Empty, not in use

**sooon-styles.css** — Custom global styles, in production

---

## Deployment Process

### Making Changes to Scripts

1. **Local Development:**
   ```bash
   cd /Users/ddrive/Documents/sooon-new-scripts
   # Edit scripts in /scripts/ directory
   ```

2. **Commit & Push:**
   ```bash
   git add scripts/[filename].js
   git commit -m "Description of changes"
   git push origin main
   ```

3. **Get Commit Hash:**
   ```bash
   git log -1 --format="%h"
   ```

4. **Update Webflow:**
   - Update all 4 script tags with new commit hash
   - Publish site
   - Test in incognito tab (cache bypass)

### CDN Caching
- **Provider:** jsDelivr
- **IMPORTANT: `@main` is unreliable** — jsDelivr caches the branch-to-commit resolution aggressively. Purging via `purge.jsdelivr.net` does NOT always work. **Always use commit hash for testing and production.**
- **Cache Duration:** Unpredictable for `@main` (can be hours). Commit hash URLs are immutable and always correct.
- **Format:** `https://cdn.jsdelivr.net/gh/DanNessler/sooon-new-scripts@{COMMIT_HASH}/scripts/{filename}.js`
- **Purge endpoint** (unreliable): `https://purge.jsdelivr.net/gh/DanNessler/sooon-new-scripts@main/scripts/{filename}.js`

### Rollback Strategy
- Keep old inline code commented in Webflow for 24h
- Test on mobile Safari before removing backup
- Can revert by changing commit hash in script URL

---

## Dependencies

### External Libraries
- **Finsweet Attributes v2** - CMS filtering, sorting, dynamic lists
  - Used for: Event filtering by city, date
  - Filter combinations
  - Result counts
  - Loaded via Webflow or CDN

### Browser APIs Used
- **IntersectionObserver** - Audio playback trigger (60% threshold), lazy loading (200% rootMargin)
- **Web Share API** (navigator.share) - Native sharing on mobile
- **Clipboard API** (navigator.clipboard) - Fallback for desktop sharing
- **History API** (history.replaceState) - Clean URLs after deep link navigation
- **localStorage** - Onboarding state, audio preferences, bookmarks
- **Audio API** - Preview playback
- **MutationObserver** - Modal open detection (bookmarks)

### Browser Support
- **Primary:** iOS Safari (most restrictive)
- **Secondary:** Chrome mobile, Desktop Safari, Desktop Chrome
- **iOS Audio Restrictions:** Handled via user gesture unlock

---

## Known Issues & Solutions

### ✅ RESOLVED: Event Share Extraction (2026-02-15)
**Problem:** Share always extracted first event (Knoppel), not the open modal.
**Root Cause:** Selectors finding feed card elements instead of modal elements.
**Solution:** Changed selector from `.event_modal_scope.is-open` to `.event_modal.is-open`, then traverse to parent scope.
**Commit:** `cb6dbd8`

### ✅ RESOLVED: Deep Link Navigation v1 (2026-02-15)
**Problem:** Deep links didn't scroll to event cards.
**Root Causes:**
1. CMS not loaded when script ran (timing issue)
2. Hash included share text: `#event-{slug}%20{share-text}`
3. Single selector attempt for feed cards

**Solutions:**
- Retry logic with exponential backoff (300ms → 4800ms, 5 attempts)
- Extract slug using regex: `/^[a-zA-Z0-9-]+/`
- Try both `.event_modal_scope` and `.card_feed_item` selectors
- Added comprehensive console logging

**Commits:** `6e0a00e`, `eed1235`

### ✅ RESOLVED: Deep Link Race Condition + Wrong Card + Locked Feed (2026-02-16)
**Problems:**
1. Deep link navigation ran before feed was initialized (race condition between deferred scripts)
2. Scrolled to wrong event card (textContent search matched wrong elements)
3. Feed scroll locked after deep link navigation (`is-locked` stuck on body)
4. `smooth` scroll fought with CSS `scroll-snap`, landing on adjacent cards

**Root Causes:**
- `event-features.js` and `sooon-core.js` both load with `defer` and executed independently
- `navigateToEvent()` searched by iterating modal scopes and comparing `textContent` — fragile
- No `is-locked` removal before scrolling
- `behavior: 'smooth'` + `block: 'center'` incompatible with scroll-snap

**Solutions:**
- **sooon-core.js**: Sets `window.sooonFeedReady = true` after feed init completes
- **event-features.js**: Polls `sooonFeedReady` (100ms intervals, 10s max) before navigating
- `navigateToEvent()` now uses direct attribute selector: `.card_feed_item[data-event-slug="{slug}"]`
- Removes `is-locked` class before scrolling
- Uses `behavior: 'instant'` + `block: 'start'` to work with scroll-snap
- Verifies scroll position after 200ms, retries once if missed
- 150ms settle delay after feed ready before first scroll attempt

**Commits:** `fc1d5d5`, `a0ee3f2`

### ✅ RESOLVED: Deep Link First-Time Visitors (2026-02-16)
**Problem:** First-time visitors opening a shared deep link saw the intro screen, blocking navigation to the shared event.

**Solution (sooon-critical.js):**
- Detects `#event-{slug}` hash + no `sooon_onboarding_seen` in localStorage
- Skips intro screen entirely, sets audio OFF (no autoplay surprise for shared links)
- Marks onboarding as seen immediately so `sooon-core.js` initializes feed without waiting
- Regular first visitors (no deep link) still see intro with audio ON

**Commit:** `9438c40`

### ✅ RESOLVED: jsDelivr CDN Caching (2026-02-16)
**Problem:** Code changes pushed to GitHub weren't reflected on the live site. jsDelivr's `@main` branch resolution was cached for hours, even after purging.

**Solution:** Always use commit hash in script URLs (e.g., `@a0ee3f2`) instead of `@main`. Commit hash URLs are immutable and always serve the correct version.

### ✅ RESOLVED: Bookmarks DOM + Slug Targeting (2026-02-19)
**Problems:**
1. Favourites list DOM targeting incorrect (wrong container/list selectors)
2. Slug extraction misaligned with actual Webflow DOM structure
3. Feed card bookmark indicator dot not showing on page load

**Solutions:**
- Scoped template search inside `.stacked-list2_list`, empty state as sibling in container
- Slug extracted from `[data-event-slug-source="true"]` or `[data-feed-slug="true"]` textContent
- `updateFeedIndicators()` iterates `.card_feed_item` and finds `.bookmark-indicator` dot per card

**Commits:** `6aafa1d`, `90efc3e`, `5d9d103`

---

## Important File Paths

```
sooon-new-scripts/
├── scripts/
│   ├── PROJECT.md              ← This file (Claude's context)
│   ├── sooon-critical.js       ← Intro screen only (blocking, ~100 lines)
│   ├── sooon-core.js           ← Feed/audio/modals/filters (deferred, ~400 lines)
│   ├── event-features.js       ← Combined share+map+calendar (deferred, ~580 lines)
│   ├── sooon-bookmarks.js      ← Bookmarks + favourites list (deferred, ~360 lines)
│   ├── sooon-footer.js         ← DEPRECATED: replaced by critical + core
│   ├── event-share.js          ← DEPRECATED: merged into event-features.js
│   ├── venue-map.js            ← DEPRECATED: merged into event-features.js
│   ├── calendar-export.js      ← DEPRECATED: merged into event-features.js
│   ├── sooon-head.js           ← Empty (not in use)
│   ├── sooon-styles.css        ← Custom styles
│   └── test.js                 ← Testing (not in production)
└── README.md                   ← Basic repo info
```

---

## Console Log Prefixes

| Prefix | Script |
|---|---|
| `[Critical]` | sooon-critical.js |
| `[Core]` | sooon-core.js |
| `[Event Share]` | event-features.js (share + deep link) |
| `[Venue Map]` | event-features.js (map) |
| `[Calendar Export]` | event-features.js (calendar) |
| `[Bookmarks]` | sooon-bookmarks.js |

### Expected deep link console output (first-time visitor):
```
[Critical] Deep link detected, first visit - skipping intro, audio OFF
[Core] Feed initialization complete, ready for deep links
[Event Share] Deep link detected, slug: 2026-01-16-baze-le-singe-37a80
[Event Share] Waiting for feed initialization...
[Event Share] Feed ready, navigating to event
[Event Share] Navigation attempt 1/3
[Event Share] Found target card, scrolling...
[Event Share] Scroll successful, card in viewport
[Event Share] Hash cleared
```

---

## Testing Checklist

### Bookmarks Feature
- [ ] Click bookmark button in modal — icon switches to active state
- [ ] Close and reopen modal — icon persists (from localStorage)
- [ ] Feed card dot indicator shows for bookmarked events on page load
- [ ] Favourites list populates with bookmarked events
- [ ] Empty state shown when no bookmarks
- [ ] Bookmark removed: icon reverts, dot hides, favourites list updates
- [ ] Works across multiple events
- [ ] Persists after page refresh

### Event Share Feature
- [ ] Click share button on different events
- [ ] Verify correct data extracted (not always first event)
- [ ] Test share dialog opens on mobile
- [ ] Test clipboard copy on desktop
- [ ] Verify deep link format is correct
- [ ] Test on iOS Safari (primary)

### Deep Link Navigation
- [ ] Open deep link in new incognito tab (first-time visitor)
- [ ] Intro screen is skipped for deep link first visitors
- [ ] Audio is OFF for deep link first visitors
- [ ] Page scrolls to correct event card
- [ ] Feed scroll works normally after navigation (not locked)
- [ ] Hash is removed after navigation
- [ ] Works on slow connections (retry logic with feed ready wait)
- [ ] Returning visitor with deep link: uses saved audio preference, skips intro
- [ ] Regular first visitor (no deep link): sees intro, audio ON

### Venue Map Feature
- [ ] Click map button on different events
- [ ] Verify correct venue + city extracted (not first event)
- [ ] Google Maps opens in new tab with correct search query
- [ ] Works when city is missing (venue-only query)

### Calendar Export Feature
- [ ] Click calendar button on different events
- [ ] Verify correct data extracted (artist, venue, city, date, slug)
- [ ] .ics file downloads with correct filename (event-{slug}.ics)
- [ ] Calendar app opens/imports the .ics file
- [ ] Multi-artist events show all artists in description

### Audio Functionality
- [ ] Audio plays on scroll (60% visibility)
- [ ] Only one audio plays at a time
- [ ] Audio toggle works (intro + feed buttons)
- [ ] State persists in localStorage
- [ ] Multi-artist switching works
- [ ] iOS audio unlock works on first tap

### Filter & Navigation
- [ ] City filters work
- [ ] Date filters work (today/tomorrow/next month)
- [ ] Clicking filter item jumps to feed card
- [ ] Filter closes after selection
- [ ] Result counts update correctly

### Performance
- [ ] Intro screen interactive in <2 seconds
- [ ] First 3 cards load eagerly, rest lazy load
- [ ] No jank on fast scrolling

---

## Next Priorities

**Current Status (2026-02-19):**
- ✅ Event share fully working
- ✅ Deep link navigation with feed-ready synchronization
- ✅ Deep link first-visit handling (skip intro, audio OFF)
- ✅ Venue map links fully working
- ✅ Audio system robust and tested
- ✅ Asset loading optimized
- ✅ Calendar export (.ics download) working
- ✅ Scripts split into 3-tier loading for fast intro screen
- ✅ Cross-script coordination via `window.sooonFeedReady` flag
- ✅ Bookmarks with localStorage persistence + favourites list
- 🔄 Ready for new features

**Planned Enhancements:**
- Integration of further info via .json endpoint and make.com automation
- Better UX (animation, interaction, etc.)
- More specific filters

---

## Information Needed for Future Work

**When starting a new feature, consider:**
1. Which script should this go in? (or new script?)
2. What Webflow elements/attributes are needed?
3. Does it need CMS data? Which fields?
4. Mobile vs. desktop considerations
5. Browser compatibility requirements (iOS Safari restrictions?)
6. Impact on existing features (audio, modals, filters, bookmarks, etc.)
7. Console logging strategy (use `[Script Name]` prefix)
8. localStorage keys needed?
9. Finsweet attribute interactions?
10. Does it need to survive onboarding/modal/filter flows?

**Common Gotchas:**
- **jsDelivr `@main` caching is unreliable** — always use commit hash URLs for testing and production. Purge endpoint doesn't reliably clear the branch resolution cache.
- iOS Safari audio restrictions (need user gesture to unlock)
- Webflow CMS load timing (need retry logic or wait for cards via `window.sooonFeedReady`)
- **Scroll-snap + smooth scroll conflict** — use `behavior: 'instant'` for programmatic scrolling on snap containers
- **`is-locked` body class** can get stuck — always remove before programmatic scrolling
- Cross-script timing: deferred scripts execute independently, use window flags for coordination
- Client-First class naming conventions
- Finsweet attribute conflicts
- Modal scroll lock interactions
- Audio state synchronization (multiple UI elements)
- Multi-artist card complexity
- **Slug sources differ by context** — modal uses `[data-event-slug-source="true"]`, feed cards use that or `[data-feed-slug="true"]`
- **MutationObserver scope** — bookmark button state only syncs when modal has `.is-open`; page-load state goes through `updateFeedIndicators()`

---

**Document Version:** 5.2
**Maintained By:** DanNessler + Claude
**Last Verified Working:** 2026-02-19
