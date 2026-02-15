# sooon Project Context

**Last Updated:** 2026-02-15
**Project Type:** Mobile-first concert discovery platform
**Stack:** Webflow CMS + Custom JavaScript

---

## Project Overview

Mobile-first concert discovery platform with full-screen snap-scroll feed, audio previews, and event sharing. Built entirely on Webflow with custom JavaScript for enhanced functionality.

### Live URLs
- **Production:** https://sooon-new.webflow.io/
- **Repository:** https://github.com/DanNessler/sooon-new-scripts
- **Branch:** main

### Webflow Details
- **Site ID:** `6944209ecd50132eb772fc5b`
- **Page ID:** `694420a0cd50132eb772fd2b`

---

## Key Technical Constraints

1. **Webflow Only** - No external frameworks (React, Vue, etc.)
2. **iOS Safari Primary** - Mobile-first, optimized for iOS Safari
3. **Finsweet Attributes v2** - Used for CMS filtering and interactions
4. **Client-First Class Structure** - Following Client-First naming conventions
5. **CDN Delivery** - Scripts served via jsDelivr from GitHub

---

## Current Custom Scripts

### 1. event-share.js ✅ WORKING
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
modalScope: '.event_modal_scope'           // Parent container with event data
shareButton: '[data-share-action="event-share"]'
activeArtist: '.event_modal_hero_artist_content .heading-h2-4xl'
venue: '.event_location-venue'
city: '.event_location-city'
date: '.date_detailed'
slugSource: '[data-event-slug-source="true"]'
feedCard: '.card_feed_item'
```

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

### 2. sooon-footer.js
**Purpose:** Audio control, modal scroll lock, filter navigation
**Status:** In production (needs documentation)

**Known functionality:**
- Audio preview controls
- Modal scroll lock behavior
- Filter navigation handling

---

### 3. sooon-head.js
**Purpose:** Asset loader, eager card limiting
**Status:** In production (needs documentation)

**Known functionality:**
- Asset loading optimization
- Limit eager-loaded cards for performance

---

### 4. sooon-styles.css
**Purpose:** Custom styles
**Status:** In production (needs documentation)

---

## Project Architecture

### DOM Structure (Event Cards)
```
.event_modal_scope                    // Container for each event
  └── .card_feed_item                 // Feed card (visible in scroll)
      └── [data-event-slug-source]    // Hidden element with unique slug
  └── .event_modal                    // Modal overlay (hidden by default)
      └── .is-open                    // Class added when modal opens
      └── .event_modal_hero_artist_content
          └── .heading-h2-4xl         // Artist name in modal
```

### Data Flow
1. **CMS (Webflow)** → Populates event data in DOM
2. **Finsweet Attributes** → Handles filtering, sorting, pagination
3. **Custom Scripts** → Add interactivity (audio, share, navigation)

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
   git push
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
- **Cache Duration:** ~5-10 minutes
- **Bypass:** Use commit hash in URL (not `@main`)
- **Format:** `https://cdn.jsdelivr.net/gh/DanNessler/sooon-new-scripts@{COMMIT_HASH}/scripts/{filename}.js`

---

## CMS Structure (Inferred)

### Event Collection
Based on selectors used in scripts:
- Artist name (displayed in `.heading-h2-4xl`)
- Venue name (`.event_location-venue`)
- City (`.event_location-city`)
- Date (`.date_detailed`)
- Slug (unique identifier in `[data-event-slug-source]`)
- Audio preview (managed by sooon-footer.js)
- Event images/posters

### Slug Format
Pattern: `YYYY-MM-DD-{artist-name}-{venue-identifier}`
Example: `2026-01-16-baze-le-singe-37a80`

---

## Known Issues & Solutions

### ✅ RESOLVED: Event Share Extraction (2026-02-15)
**Problem:** Share always extracted first event (Knoppel), not the open modal.
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

## Debugging & Console Logs

All custom scripts use `[Script Name]` prefixes for logging.

### Event Share Logs

**Successful deep link navigation:**
```
[Event Share] Deep link detected on load: 2026-01-16-baze-le-singe-37a80
[Event Share] Navigation attempt 1/5
[Event Share] Approach 1 - Feed cards: 10
[Event Share] Approach 2 - Modal scopes: 10
[Event Share] Scope 1 slug: "2026-01-16-baze-le-singe-37a80"
[Event Share] ✅ MATCH found in scope 1
[Event Share] Found target element, scrolling...
```

**Failed navigation:**
```
[Event Share] ❌ NO MATCH FOUND
[Event Share] Searched for slug: {slug}
[Event Share] Total modal scopes: {count}
[Event Share] Total feed cards: {count}
```

---

## Dependencies

### External Libraries
- **Finsweet Attributes v2** - CMS filtering, sorting, dynamic lists
  - Used for: Event filtering by date, venue, artist
  - Loaded via Webflow or CDN

### Browser APIs Used
- **Web Share API** (navigator.share) - Native sharing on mobile
- **Clipboard API** (navigator.clipboard) - Fallback for desktop
- **History API** (history.replaceState) - Clean URLs after deep link navigation
- **IntersectionObserver** (possibly in sooon-head.js for lazy loading)
- **Audio API** (in sooon-footer.js for previews)

---

## Important File Paths

```
sooon-new-scripts/
├── scripts/
│   ├── PROJECT.md              ← This file (Claude's context)
│   ├── event-share.js          ← Event sharing + deep links
│   ├── sooon-footer.js         ← Audio, modals, filters
│   ├── sooon-head.js           ← Asset loading
│   ├── sooon-styles.css        ← Custom styles
│   └── test.js                 ← Testing (not in production?)
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

### Deep Link Navigation
- [ ] Open deep link in new incognito tab
- [ ] Page scrolls to correct event
- [ ] Hash is removed after navigation
- [ ] Works on slow connections (retry logic)
- [ ] Console shows successful match

### Cross-Browser Testing
- [ ] iOS Safari (primary)
- [ ] Chrome mobile
- [ ] Desktop Safari
- [ ] Desktop Chrome

---

## Next Priorities

*Update this section when starting new work*

**Current Status (2026-02-15):**
- ✅ Event share fully working
- ✅ Deep link navigation fully working
- 🔄 Ready for new features

**Possible Future Enhancements:**
- Document sooon-footer.js functionality
- Document sooon-head.js functionality
- Analytics tracking for shares
- Custom share images (Open Graph)
- Calendar export functionality
- Event reminders

---

## Information Needed for Future Work

**When starting a new feature, consider:**
1. Which script should this go in? (or new script?)
2. What Webflow elements/attributes are needed?
3. Does it need CMS data? Which fields?
4. Mobile vs. desktop considerations
5. Browser compatibility requirements
6. Impact on existing features
7. Console logging strategy

**Common Gotchas:**
- jsDelivr caching (always use commit hash, not @main)
- iOS Safari specific behaviors
- Webflow CMS load timing (need retry logic)
- Client-First class naming conventions
- Finsweet attribute conflicts

---

## Questions to Ask User

When starting fresh chat for new features:
1. Which script should this modify? (or create new?)
2. What Webflow elements exist? (selectors, structure)
3. What CMS fields are available?
4. Are there Finsweet attributes in use?
5. Mobile or desktop priority?
6. Any existing similar functionality to reference?
7. Should this be in production immediately or staged?

---

**Document Version:** 2.0
**Maintained By:** DanNessler + Claude
**Last Verified Working:** 2026-02-15
