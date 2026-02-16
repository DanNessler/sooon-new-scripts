# sooon Project Context

**Last Updated:** 2026-02-16
**Project Type:** Mobile-first concert discovery platform
**Stack:** Webflow CMS + Custom JavaScript

---

## Project Overview

Mobile-first concert discovery platform with full-screen snap-scroll feed, audio previews, and event sharing. Full-screen snap-scroll feed where users swipe through events with audio previews.

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

Implementation in sooon-footer.js (lines 616-647):
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
- `[data-event-slug-source="true"]` — Event slug (for deep links)
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
- **Default: ON** (`DEFAULT_AUDIO_ENABLED = true`)

### Flow
1. User lands → Check `sooon_onboarding_seen` in localStorage
2. If first visit → Show onboarding, audio state set but not playing
3. User clicks "Discover Shows" → Unlock iOS audio, play first visible card
4. Scroll → Audio switches based on 60% visibility threshold
5. Toggle audio → Updates localStorage, updates all UI, restarts current audio if turning ON

### Multi-Artist Switching
- Cards can have up to 3 artists with separate audio tracks
- Clicking `.artist-trigger` switches active artist
- Pauses all audios in card, plays selected artist's audio (if enabled)
- Updates `.is-active` class on visual and title elements

### Audio State Sync
All audio UI is synchronized via `updateAudioUI()`:
- Intro toggle button (`.is-on` class)
- Feed card buttons (`.is-hidden` on icons)
- Text label (ON/OFF)

### Must Survive
- Fast scrolling
- Filter jumps
- Modal open/close
- Multi-artist switching
- Audio toggle on/off

---

## Current Scripts

### 1. sooon-footer.js ✅ PRODUCTION
**Loaded:** `<body>` end (before `</body>`)
**Status:** Active, comprehensive
**Lines:** 648

**Part 1: Sequential Asset Loader (lines 1-161)**
- **Waits for Webflow CMS** to populate cards (polls until cards.length > 1)
- **Eager loads** first 3 cards (`EAGER_CARDS = 3`)
- **Defers images/videos/audio** on cards beyond #3
  - Stores `src` in `data-src` attribute
  - Replaces with data URI placeholder
  - Skips SVG placeholders (case-insensitive "placeholder" check)
- **Lazy loads** deferred assets when card enters viewport
  - `IntersectionObserver` with `rootMargin: "200% 0px"`
  - Restores `src` from `data-src`
- **Onboarding aware:** Waits for "Discover Shows" click on first visit

**Part 2: General Feed & Audio (lines 163-648)**

**Features:**
- **Onboarding flow** (first visit vs returning visitor)
- **Audio state management** (localStorage, default ON)
- **Modal scroll lock** (compatible with Webflow IX)
  - Adds `.is-locked` to body on modal open
  - Removes on modal close
  - Works with `.modal-open-button`, `.modal-open-hitarea`, `.modal-close-button`
- **Audio UI sync** (intro toggle + all feed buttons)
- **Audio intersection observer** (60% threshold)
- **Audio toggle handlers** (intro + feed buttons via delegation)
  - Manual restart of current card audio when toggling ON
- **iOS audio unlock** (on first click/touch)
- **Scroll animations** (data-animate elements with delays/thresholds)
- **Universal artist switcher** (multi-artist cards)
- **Filter-to-feed linking** (clicks `.stacked-list2_item[data-target-slug]`)
- **Dynamic date filtering** (injects today/tomorrow/next-month values)

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

### 2. sooon-head.js ⚠️ EMPTY
**Status:** Not in use (file is empty)
**Note:** Asset loading logic is in sooon-footer.js instead

---

### 3. event-share.js ✅ WORKING
**Status:** Production-ready
**Current Commit:** `eed1235`
**Purpose:** Event sharing with deep link navigation

**Features:**
- Native Web Share API integration (mobile) with clipboard fallback (desktop)
- Extracts event data from open modal (artist, venue, city, date, slug)
- Generates shareable deep links: `#event-{slug}`
- Auto-navigation to events from deep links with retry logic
- Customizable share text via Webflow data attributes

**Key Selectors:**
```javascript
modalScope: '.event_modal_scope'
shareButton: '[data-share-action="event-share"]'
activeArtist: '.event_modal_hero_artist_content .heading-h2-4xl'
venue: '.event_location-venue'
city: '.event_location-city'
date: '.date_detailed'
slugSource: '[data-event-slug-source="true"]'
feedCard: '.card_feed_item'
```

**Share Button:**
- ID: `e852186a-5748-aafa-a5e2-0a6f63638aaf`
- Attribute: `data-share-action="event-share"`

**Recent Fixes (2026-02-15):**
- Fixed modal data extraction (was always reading first event)
- Fixed deep link navigation (timing + slug extraction issues)
- Added retry logic with exponential backoff (5 attempts)
- Handle URL-encoded share text in hash

**Webflow Integration:**
```html
<script src="https://cdn.jsdelivr.net/gh/DanNessler/sooon-new-scripts@eed1235/scripts/event-share.js"></script>
```

**Custom Share Text:**
Add to share button in Webflow:
- Attribute: `data-share-template`
- Placeholders: `{artist-1}`, `{venue-name}`, `{venue-city}`, `{date}`

---

### 4. venue-map.js ✅ WORKING
**Status:** Production-ready
**Current Commit:** `1624a45`
**Purpose:** Opens venue location in Google Maps from event modals

**Features:**
- Extracts venue name and city from currently open modal
- Builds Google Maps search URL: `https://maps.google.com/maps?q={venue},+{city}`
- Opens map in new tab via `window.open`
- Event delegation for CMS-generated modal buttons

**Key Selectors:**
```javascript
modalScope: '.event_modal_scope'
mapButton: '[data-map-action="open-venue"]'
venue: '.event_location-venue'
city: '.event_location-city'
```

**Map Button:**
- Attribute: `data-map-action="open-venue"`

**Modal Data Extraction:**
- Same pattern as event-share.js: finds `.event_modal.is-open`, traverses to parent `.event_modal_scope`
- Reads `.event_location-venue` and `.event_location-city` from scope

**Webflow Integration:**
```html
<script src="https://cdn.jsdelivr.net/gh/DanNessler/sooon-new-scripts@1624a45/scripts/venue-map.js"></script>
```

---

### 5. sooon-styles.css
**Purpose:** Custom global styles
**Status:** In production (needs documentation)

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
   - Update script tag with new commit hash
   - Publish site
   - Test in incognito tab (cache bypass)

### CDN Caching
- **Provider:** jsDelivr
- **Cache Duration:** ~1 hour (jsDelivr), ~5-10 minutes for updates
- **Bypass:** Use commit hash in URL (not `@main`)
- **Force refresh:** Add `?v=2` query param to script URL
- **Format:** `https://cdn.jsdelivr.net/gh/DanNessler/sooon-new-scripts@{COMMIT_HASH}/scripts/{filename}.js`

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
- **localStorage** - Onboarding state, audio preferences
- **Audio API** - Preview playback

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

### ✅ RESOLVED: Deep Link Navigation (2026-02-15)
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

---

## Important File Paths

```
sooon-new-scripts/
├── scripts/
│   ├── PROJECT.md              ← This file (Claude's context)
│   ├── event-share.js          ← Event sharing + deep links (eed1235)
│   ├── venue-map.js            ← View on Map from modals (1624a45)
│   ├── sooon-footer.js         ← Main functionality (asset loading, audio, modals, filters)
│   ├── sooon-head.js           ← Empty (not in use)
│   ├── sooon-styles.css        ← Custom styles
│   └── test.js                 ← Testing (not in production)
├── PROJECT-HANDOFF.md          ← Detailed handoff docs
├── SIMPLE-TEST-GUIDE.md        ← Testing instructions
├── diagnostic-deep-link.js     ← Diagnostic tool
└── README.md                   ← Basic repo info
```

---

## Testing Checklist

### Event Share Feature
- [ ] Click share button on different events
- [ ] Verify correct data extracted (not always first event)
- [ ] Test share dialog opens on mobile
- [ ] Test clipboard copy on desktop
- [ ] Verify deep link format is correct
- [ ] Test on iOS Safari (primary)

### Deep Link Navigation
- [ ] Open deep link in new incognito tab
- [ ] Page scrolls to correct event
- [ ] Hash is removed after navigation
- [ ] Works on slow connections (retry logic)
- [ ] Console shows successful match

### Venue Map Feature
- [ ] Click map button on different events
- [ ] Verify correct venue + city extracted (not first event)
- [ ] Google Maps opens in new tab with correct search query
- [ ] Works when city is missing (venue-only query)
- [ ] Test on iOS Safari (opens Maps app or Google Maps)
- [ ] Test on desktop (opens Google Maps in browser)

### Audio Functionality
- [ ] Audio plays on scroll (60% visibility)
- [ ] Only one audio plays at a time
- [ ] Audio toggle works (intro + feed buttons)
- [ ] State persists in localStorage
- [ ] Multi-artist switching works
- [ ] Audio respects onboarding flow
- [ ] iOS audio unlock works on first tap

### Filter & Navigation
- [ ] City filters work
- [ ] Date filters work (today/tomorrow/next month)
- [ ] Clicking filter item jumps to feed card
- [ ] Filter closes after selection
- [ ] Result counts update correctly

### Modal Behavior
- [ ] Modal opens on card click
- [ ] Background scroll locked
- [ ] Modal closes on X button
- [ ] Correct event data shown
- [ ] Share button works from modal

### Performance
- [ ] First 3 cards load eagerly
- [ ] Remaining cards lazy load
- [ ] Images/videos defer correctly
- [ ] Lazy load triggers at 200% rootMargin
- [ ] No jank on fast scrolling

### Cross-Browser Testing
- [ ] iOS Safari (primary)
- [ ] Chrome mobile
- [ ] Desktop Safari
- [ ] Desktop Chrome

---

## Next Priorities

*Update this section when starting new work*

**Current Status (2026-02-16):**
- ✅ Event share fully working
- ✅ Deep link navigation fully working
- ✅ Venue map links fully working
- ✅ Audio system robust and tested
- ✅ Asset loading optimized
- 🔄 Ready for new features

**Planned Enhancements:**
- Bookmarking feature
- Add-to-calendar feature
- Integration of further info via .json endpoint and make.com automation
- General performance optimization
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
6. Impact on existing features (audio, modals, filters, etc.)
7. Console logging strategy (use `[Script Name]` prefix)
8. localStorage keys needed?
9. Finsweet attribute interactions?
10. Does it need to survive onboarding/modal/filter flows?

**Common Gotchas:**
- jsDelivr caching (always use commit hash for testing, not @main)
- iOS Safari audio restrictions (need user gesture to unlock)
- Webflow CMS load timing (need retry logic or wait for cards)
- Client-First class naming conventions
- Finsweet attribute conflicts
- Modal scroll lock interactions
- Audio state synchronization (multiple UI elements)
- Multi-artist card complexity

**Performance Considerations:**
- Asset loading strategy (eager vs lazy)
- IntersectionObserver thresholds
- Event delegation vs direct listeners
- localStorage reads/writes
- Query selector performance
- Scroll event handling

---

## Questions to Ask User

When starting fresh chat for new features:
1. Which script should this modify? (or create new?)
2. What Webflow elements exist? (selectors, structure, Webflow IX?)
3. What CMS fields are available?
4. Are there Finsweet attributes in use?
5. Mobile or desktop priority?
6. Any existing similar functionality to reference?
7. Should this be in production immediately or staged?
8. Does it interact with audio system?
9. Does it need scroll lock or modal handling?
10. localStorage persistence needed?

---

**Document Version:** 4.0
**Maintained By:** DanNessler + Claude
**Last Verified Working:** 2026-02-16
