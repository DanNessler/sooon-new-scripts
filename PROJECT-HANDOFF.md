# sooon Scripts — Handoff Document

**Status:** ✅ ALL FEATURES WORKING
**Last Updated:** 2026-02-16
**Architecture:** v5.1 (3-tier split + deep link coordination)

---

## Project Overview

Event discovery platform with share, deep link, venue map, and calendar export features. Scripts are split into 3 priority tiers served via jsDelivr CDN.

### Repository
- **GitHub:** `DanNessler/sooon-new-scripts`
- **Branch:** `main`
- **Scripts:** `scripts/sooon-critical.js`, `scripts/sooon-core.js`, `scripts/event-features.js`

### Webflow
- **Live URL:** `https://sooon-new.webflow.io/`
- **Site ID:** `6944209ecd50132eb772fc5b`

### Current Script Tags (in Webflow before `</body>`)
```html
<script src="https://cdn.jsdelivr.net/gh/DanNessler/sooon-new-scripts@{COMMIT_HASH}/scripts/sooon-critical.js"></script>
<script src="https://cdn.jsdelivr.net/gh/DanNessler/sooon-new-scripts@{COMMIT_HASH}/scripts/sooon-core.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/DanNessler/sooon-new-scripts@{COMMIT_HASH}/scripts/event-features.js" defer></script>
```

**IMPORTANT:** Always use a commit hash (e.g., `@a0ee3f2`), NOT `@main`. jsDelivr caches `@main` unpredictably.

---

## Script Architecture

### 1. sooon-critical.js (blocking, ~100 lines)
Runs immediately. Handles intro screen and deep link first-visit detection.

- Detects `#event-{slug}` + first visit → skips intro, audio OFF
- Regular first visit → shows intro, audio ON
- Returning visitor → skips intro, saved audio preference
- Sets `window.sooonIntroReady = true`

### 2. sooon-core.js (deferred, ~400 lines)
Feed functionality. Loads in background.

- Asset loading (eager first 3, lazy rest)
- Audio system (IntersectionObserver, 60% threshold)
- Modal scroll lock, animations, artist switcher
- Filter-to-feed linking, date filters
- Sets `window.sooonFeedReady = true` after init

### 3. event-features.js (deferred, ~580 lines)
Modal features. 3 independent IIFEs.

- **Event Share:** Web Share API + clipboard fallback, deep link generation
- **Deep Link Navigation:** Polls `sooonFeedReady`, uses `data-event-slug` attribute, instant scroll
- **Venue Map:** Google Maps URL from modal data
- **Calendar Export:** .ics file generation and download

---

## Deep Link Flow

```
User opens: https://sooon-new.webflow.io/#event-{slug}

sooon-critical.js:
  → First visit? Skip intro, audio OFF, mark seen
  → Returning? Skip intro, saved preference

sooon-core.js:
  → onboarding_seen = '1' → start() immediately
  → Poll for CMS cards → init → sooonFeedReady = true

event-features.js:
  → Poll sooonFeedReady (100ms, max 10s)
  → Find .card_feed_item[data-event-slug="{slug}"]
  → Remove is-locked, scroll instant, verify position
  → Clear hash from URL
```

---

## Key Selectors

| Purpose | Selector |
|---|---|
| Feed card | `.card_feed_item` |
| Feed card slug | `.card_feed_item[data-event-slug="{slug}"]` |
| Open modal | `.event_modal.is-open` |
| Modal scope | `.event_modal_scope` |
| Slug source | `[data-event-slug-source="true"]` |
| Share button | `[data-share-action="event-share"]` |
| Map button | `[data-map-action="open-venue"]` |
| Calendar button | `[data-calendar-action="export"]` |

---

## Deployment

1. Edit scripts locally
2. `git add` + `git commit` + `git push`
3. Get commit hash: `git log -1 --format="%h"`
4. Update Webflow script tags with new hash
5. Publish Webflow site
6. Test in incognito

---

## Debugging

Console log prefixes:
- `[Critical]` — sooon-critical.js
- `[Core]` — sooon-core.js
- `[Event Share]` — event-features.js (share + deep link)
- `[Venue Map]` — event-features.js (map)
- `[Calendar Export]` — event-features.js (calendar)

### Expected deep link console output:
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

**Document Version:** 2.0
**Maintained By:** DanNessler + Claude
