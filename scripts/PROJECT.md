# sooon Project Context

**Last Updated:** 2026-02-16 (v5.0 — script split refactor)
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

## Current Scripts (v5.0 — Split Architecture)

Scripts are split into 3 priority tiers for fast intro screen loading.

### Load Order (Webflow Before `</body>` tag)
```html
<!-- Critical: intro screen works immediately -->
<script src="https://cdn.jsdelivr.net/gh/DanNessler/sooon-new-scripts@main/scripts/sooon-critical.js"></script>

<!-- Deferred: loads in background while user sees intro -->
<script src="https://cdn.jsdelivr.net/gh/DanNessler/sooon-new-scripts@main/scripts/sooon-core.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/DanNessler/sooon-new-scripts@main/scripts/event-features.js" defer></script>
```

### Coordination Between Scripts
- **sooon-critical.js** sets `localStorage` + `window.sooonIntroReady = true` when intro is dismissed
- **sooon-core.js** reads `localStorage` on init, listens for `sooon:audio-changed` custom event from intro toggle
- Both files attach independent click handlers to "Discover Shows" button (critical = state, core = audio)
- **event-features.js** is fully independent (event delegation, only triggers in modals)

---

### 1. sooon-critical.js ✅ PRODUCTION (blocking, ~80 lines)
**Purpose:** Make intro screen interactive immediately (<1 second)
**Loaded:** Blocking `<script>` — runs before deferred scripts

**Features:**
- Onboarding flow (check `sooon_onboarding_seen`, show/hide intro screen)
- Audio toggle on intro screen (`[data-sooon-audio-toggle="true"]`)
- "Discover Shows" button handler (`[data-sooon-onboarding-confirm="true"]`)
- localStorage read/write for `sooon_onboarding_seen` and `sooon_audio_enabled`
- iOS audio unlock on first user gesture
- Body scroll lock for intro screen (`.is-locked` class)
- Audio UI sync for intro toggle only (`.button-toggle-circle`, `.is-on`)
- Dispatches `sooon:audio-changed` custom event when toggle is clicked

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

### 3. event-features.js ✅ PRODUCTION (deferred, ~640 lines)
**Purpose:** Combined event modal features — share, map, calendar export
**Structure:** 3 independent IIFEs, each with own config and event delegation

**Event Share:**
- Native Web Share API (mobile) with clipboard fallback (desktop)
- Deep link generation: `#event-{slug}`
- Auto-navigation from deep links with exponential backoff retry (5 attempts)
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
│   ├── sooon-critical.js       ← NEW: Intro screen only (blocking, ~80 lines)
│   ├── sooon-core.js           ← NEW: Feed/audio/modals/filters (deferred, ~400 lines)
│   ├── event-features.js       ← NEW: Combined share+map+calendar (deferred, ~640 lines)
│   ├── sooon-footer.js         ← DEPRECATED: replaced by critical + core
│   ├── event-share.js          ← DEPRECATED: merged into event-features.js
│   ├── venue-map.js            ← DEPRECATED: merged into event-features.js
│   ├── calendar-export.js      ← DEPRECATED: merged into event-features.js
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

### Calendar Export Feature
- [ ] Click calendar button on different events
- [ ] Verify correct data extracted (artist, venue, city, date, slug)
- [ ] .ics file downloads with correct filename (event-{slug}.ics)
- [ ] Calendar app opens/imports the .ics file
- [ ] Event title format: "{artist} live at {venue}"
- [ ] Location field: "{venue}, {city}"
- [ ] Description includes all artists joined with +
- [ ] Start time defaults to 20:00, end 23:00
- [ ] Multi-artist events show all artists in description
- [ ] Works on iOS Safari (primary)
- [ ] Works on desktop browsers

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
- [ ] Intro screen interactive in <2 seconds
- [ ] sooon-critical.js loads and runs before deferred scripts
- [ ] Feed ready when user clicks "Discover Shows"
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
- ✅ Calendar export (.ics download) working
- ✅ Scripts split into 3-tier loading for fast intro screen
- 🔄 Ready for new features

**Planned Enhancements:**
- Bookmarking feature
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

**Document Version:** 5.0
**Maintained By:** DanNessler + Claude
**Last Verified Working:** 2026-02-16
