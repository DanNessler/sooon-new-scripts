# Kombinat2026 Festival Landing Page — Scripts Context

**Last Updated:** 2026-03-03 (v1.0 — Simplified variant of main sooon platform)
**Project Type:** Festival landing page (single artist, manual Finsweet filters)
**Stack:** Webflow CMS + Custom JavaScript

> Simplified variant of main sooon platform — single artist only, manual Finsweet filters.
> Based on sooon v5.5. Artist switcher, dynamic date filter injection, city reference filters,
> and API/hybrid feed removed. All other features are identical.

---

## Project Overview

Festival landing page for Kombinat2026. Mobile-first snap-scroll feed of events, audio previews, event sharing, bookmarking, and modal features. One artist per event.

### Environment

**Production:**
- Site ID: `6944209ecd50132eb772fc5b`
- Page ID: `69a568d070341387645537aa`
- Page Name: Kombinat2026

**CMS Collection:**
- Kombinat2026 (ID: `69a568fed64b2710c46ee559`)

**Repository:**
- GitHub: https://github.com/DanNessler/sooon-new-scripts
- Branch: main
- CDN: cdn.jsdelivr.net/gh/DanNessler/sooon-new-scripts@{COMMIT_HASH}/scripts-kombinat/

---

## Core Constraints

1. **Webflow only** — No React/Vue/framework rewrites
2. **iOS Safari primary target** — Most difficult constraint
3. **Finsweet Attributes v2** — For filtering/CMS interactions (manual text-based filters only)
4. **Stability over cleverness** — Small, safe improvements
5. **CDN Delivery** — Scripts served via jsDelivr from GitHub

---

## CMS Collection Fields (Kombinat2026)

- `name` (PlainText, required) — Event title
- `slug` (PlainText, required) — URL slug
- `date` (DateTime) — Event date
- `artist-1` (PlainText) — Single artist name
- `artist-1-img` (Image) — Artist visual
- `audio-url` (Link) — Audio preview URL
- `venue-name` (PlainText) — Venue name
- `venue-city` (PlainText) — City name
- `ticket-link` (Link) — Ticket purchase URL

---

## What's Different from Main sooon Platform

### REMOVED:
- **Artist switcher** — One artist per event; no `data-artist-id`, no `.artist-trigger` logic
- **Dynamic date filter injection** — Manual Finsweet text-based filters used instead
- **City reference filters** — Manual Finsweet text-based filters used instead
- **Hybrid card loading / API feed** — Purely Webflow CMS-driven
- **sooon-api.js** — Not needed

### KEPT (identical to main):
- Intro screen + onboarding flow
- Snap-scroll card feed with audio
- Modal features (share, map, calendar export)
- Bookmarks + favourites list
- Asset loading optimization (eager 1 card, lazy rest)
- Deep link navigation
- Filter-to-feed linking
- Card feed empty state

---

## Finsweet Attributes v2 Setup

Uses manual text-based filters (not CMS reference or JS-injected date values):
- `fs-list-instance="events"` — Main CMS list identifier
- `fs-list-element="list"` — Collection list wrapper
- `fs-list-element="filters"` — Filter form element
- Date and city filters use plain text values set in Webflow designer

---

## localStorage Keys

All keys namespaced to `kombinat_` to avoid conflicts with the main sooon platform:

| Key | Values | Purpose |
|---|---|---|
| `kombinat_onboarding_seen` | `"1"` / null | Whether intro has been dismissed |
| `kombinat_audio_enabled` | `"1"` / `"0"` | Audio on/off preference |
| `kombinat_bookmarks` | JSON array | Bookmarked event slugs |

---

## Console Log Prefixes

| Prefix | Script |
|---|---|
| `[Kombinat-Critical]` | sooon-critical.js |
| `[Kombinat-Core]` | sooon-core.js |
| `[Kombinat-Share]` | event-features.js (share + deep link) |
| `[Kombinat-Map]` | event-features.js (map) |
| `[Kombinat-Calendar]` | event-features.js (calendar) |
| `[Kombinat-Bookmarks]` | sooon-bookmarks.js |

---

## Scripts

### Load Order

**Head (Webflow Page Settings → Custom Code → `<head>`):**

```html
<!-- Styles -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/DanNessler/sooon-new-scripts@{COMMIT_HASH}/scripts-kombinat/sooon-styles.css">
```

**Before `</body>` (Webflow Page Settings → Custom Code → Before `</body>`):**

```html
<!-- Critical: intro screen works immediately -->
<script src="https://cdn.jsdelivr.net/gh/DanNessler/sooon-new-scripts@{COMMIT_HASH}/scripts-kombinat/sooon-critical.js"></script>

<!-- Deferred: loads in background while user sees intro -->
<script src="https://cdn.jsdelivr.net/gh/DanNessler/sooon-new-scripts@{COMMIT_HASH}/scripts-kombinat/sooon-core.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/DanNessler/sooon-new-scripts@{COMMIT_HASH}/scripts-kombinat/event-features.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/DanNessler/sooon-new-scripts@{COMMIT_HASH}/scripts-kombinat/sooon-bookmarks.js" defer></script>
```

**IMPORTANT:** Always use a commit hash (e.g., `@fe504b4`), NOT `@main`. jsDelivr caches `@main` unpredictably.

### Files

```
scripts-kombinat/
├── PROJECT.md              ← This file
├── sooon-critical.js       ← Intro screen only (blocking)
├── sooon-core.js           ← Feed/audio/modals/filters (deferred)
├── event-features.js       ← Share + map + calendar (deferred)
├── sooon-bookmarks.js      ← Bookmarks + favourites list (deferred)
└── sooon-styles.css        ← Custom styles
```

---

## Audio Logic

- Only one audio plays at a time (globally enforced)
- Starts when card is 60% visible (IntersectionObserver threshold: 0.6)
- Respects iOS autoplay restrictions (unlocked on user gesture)
- Default: ON (except deep link first visitors → OFF)

### Audio State Sync
- **sooon-critical.js** manages intro toggle UI, dispatches `sooon:audio-changed` event
- **sooon-core.js** listens for `sooon:audio-changed`, syncs feed button UI
- Both read/write `kombinat_audio_enabled` in localStorage

---

## Deployment Process

1. Edit scripts in `scripts-kombinat/`
2. `git add scripts-kombinat/`
3. `git commit -m "Description"`
4. `git push origin main`
5. `git log -1 --format="%h"` — get commit hash
6. Update all 4 script tags in Webflow (Kombinat2026 page → Settings → Custom Code → Before `</body>`)
7. Publish Webflow site
8. Test in incognito (cache bypass)

---

## Testing Checklist

### Core Feed
- [ ] Intro screen shows on first visit, skips on return
- [ ] Audio toggle on intro screen works (ON/OFF label + circle)
- [ ] "Discover Shows" button dismisses intro, starts audio
- [ ] Cards snap-scroll correctly
- [ ] Audio plays at 60% card visibility
- [ ] Only one audio at a time
- [ ] Audio toggle on feed cards works
- [ ] Audio state persists after refresh
- [ ] First card loads eagerly, rest lazy load

### Deep Link Navigation
- [ ] `#event-{slug}` — intro skipped for first-time deep link visitors
- [ ] Audio is OFF for first-time deep link visitors
- [ ] Page scrolls to correct event card
- [ ] Feed scroll works normally after navigation (not locked)
- [ ] Hash removed after navigation
- [ ] Works on slow connections (retry logic)

### Modal Features
- [ ] Share button — native share on mobile, clipboard fallback on desktop
- [ ] Map button — opens Google Maps with correct venue + city
- [ ] Calendar button — downloads .ics file with correct data
- [ ] Correct event data extracted from open modal (not always first event)

### Bookmarks
- [ ] Bookmark button in modal toggles icon state
- [ ] Dot indicator on feed cards
- [ ] Favourites list populates
- [ ] Empty state shown when no bookmarks
- [ ] Persists after refresh

### Filters
- [ ] Filters show/hide cards correctly
- [ ] Filter empty state shows when 0 results
- [ ] Clicking filter list item jumps to card + closes filter

---

## Known Gotchas

- **jsDelivr `@main` caching is unreliable** — always use commit hash URLs
- iOS Safari audio requires user gesture to unlock
- `behavior: 'instant'` required for programmatic scroll (scroll-snap conflict with smooth)
- `is-locked` body class can get stuck — always remove before programmatic scroll
- Finsweet v2 removes items from DOM (not `display: none`) — use `childList: true` in MutationObserver
- Slug sources: modal uses `[data-event-slug-source="true"]`, feed cards use that or `[data-feed-slug="true"]`

## Open Issues

### Filter screen: right dropdown list hidden behind left button on mobile (TODO)
- **Symptom:** On mobile, when the right dropdown (Time) is open, the left dropdown button (Location) appears on top of the open list
- **Root cause:** Webflow sets `position: relative` on `.w-dropdown` via its own stylesheet, making each wrapper the containing block for its own list. The left wrapper creates a stacking context that paints above the right list.
- **Attempts so far:**
  - Added `z-index: 200` to `dropdown2_dropdown-list` on tiny breakpoint — insufficient, list is still trapped inside its containing block
  - Removed `z-index: 10` from `dropdown2_component` on tiny — no effect
  - Removed `z-index: 10` from `mobile-left` combo class on tiny — no effect
  - Removed `z-index: 1` from `dropdown_button` on tiny — no effect
  - CSS: `.filter_screen .w-dropdown { position: static !important }` — broke Webflow dropdown JS positioning entirely
  - CSS: `.filter_screen .w-dropdown.w--open { z-index: 100 !important }` — no effect (commit `e4e86df`)
- **Suspected remaining cause:** Webflow's own JS may be setting inline `z-index` on `.w-dropdown` at open time, overriding our CSS. Or the stacking context chain from `filter_screen` (z-index: 600, position: fixed) is interfering in an unexpected way.
- **To investigate:** Inspect the live DOM in browser devtools while the right dropdown is open — check computed z-index and stacking context on `.w-dropdown`, `.w-dropdown-toggle`, and `.w-dropdown-list` elements, and look for any inline styles set by Webflow JS

### Intro toggle `is-on` class overridden by Webflow (TODO)
- **Symptom:** `.button-toggle-circle` has `is-on` permanently added back by Webflow's runtime after our script removes it, even with no IX2 interaction set on the element
- **Root cause (suspected):** A Webflow page-level interaction (Page Load / While Page is Loading trigger) targeting `.button-toggle-circle` or `.button-toggle` is setting `is-on` after our script runs — this does not happen on the main sooon page
- **Current workaround:** `syncToggleUI()` drives circle position via inline `style.left` / `style.right` instead of the `is-on` combo class, which overrides the CSS regardless of class state
- **To fix:** Check Webflow Designer → Interactions panel → Page Triggers for any load animation targeting this element. Remove or reconcile it so JS class toggling works as intended and the inline style workaround can be removed

---

**Document Version:** 1.0 (Kombinat2026)
**Maintained By:** DanNessler + Claude
**Last Verified Working:** 2026-03-03
