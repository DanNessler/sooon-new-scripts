# Deep Link Navigation — Technical Test Plan

**Last Updated:** 2026-02-16
**Architecture:** v5.1 (3-script coordination)

---

## How Deep Link Navigation Works

### Cross-Script Coordination
1. **sooon-critical.js** (blocking): Detects `#event-{slug}` + first visit → skips intro, audio OFF, marks onboarding seen
2. **sooon-core.js** (deferred): Reads `onboarding_seen = '1'` → starts immediately → polls for CMS cards → `init()` → sets `window.sooonFeedReady = true`
3. **event-features.js** (deferred): Polls `sooonFeedReady` every 100ms (max 10s) → finds card via `data-event-slug` attribute → instant scroll → verify → clean hash

### Navigation Function
```javascript
// Uses direct attribute selector (same as filter-to-feed in sooon-core.js)
const targetCard = document.querySelector('.card_feed_item[data-event-slug="' + CSS.escape(slug) + '"]');

// Removes body lock, scrolls instantly (smooth fights scroll-snap)
document.body.classList.remove('is-locked');
targetCard.scrollIntoView({ behavior: 'instant', block: 'start' });

// Verifies scroll position after 200ms, retries once if missed
```

### Slug Extraction
```javascript
// From: #event-2026-01-16-baze-le-singe-37a80%20Check%20out%20this%20show
// decodeURIComponent → "2026-01-16-baze-le-singe-37a80 Check out this show"
// .split(/[\s%]/)[0] → "2026-01-16-baze-le-singe-37a80"
```

---

## Test Scenarios

### 1. First-Time Visitor + Deep Link
- Open in incognito: `https://sooon-new.webflow.io/#event-{valid-slug}`
- **Expected:** No intro, audio OFF, correct card, feed scrollable

### 2. First-Time Visitor + No Deep Link
- Open in incognito: `https://sooon-new.webflow.io/`
- **Expected:** Intro shown, audio ON, "Discover Shows" works

### 3. Returning Visitor + Deep Link
- Visit site first, dismiss intro, then open deep link
- **Expected:** No intro, saved audio pref, correct card

### 4. Returning Visitor + No Deep Link
- Normal visit after previous session
- **Expected:** No intro, saved audio pref, feed loads normally

### 5. Invalid Deep Link Slug
- Open: `https://sooon-new.webflow.io/#event-nonexistent-slug`
- **Expected:** Navigation fails gracefully after 3 attempts, console shows error

### 6. Deep Link with Share Text in Hash
- Open: `https://sooon-new.webflow.io/#event-{slug}%20Check%20out%20this%20show`
- **Expected:** Slug cleaned correctly, navigates to correct card

---

## Console Output Reference

### Success (first-time visitor):
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

### Success (returning visitor):
```
[Critical] Returning visitor, intro skipped
[Core] Feed initialization complete, ready for deep links
[Event Share] Deep link detected, slug: 2026-01-16-baze-le-singe-37a80
[Event Share] Feed ready, navigating to event
[Event Share] Navigation attempt 1/3
[Event Share] Found target card, scrolling...
[Event Share] Scroll successful, card in viewport
[Event Share] Hash cleared
```

### Failure (slug not found):
```
[Event Share] Navigation attempt 1/3
[Event Share] No feed card found for slug: nonexistent-slug
[Event Share] Total feed cards in DOM: 24
[Event Share] Retrying in 500ms...
...
[Event Share] Failed to navigate after 3 attempts
```

---

## Key Commits

| Commit | Change |
|---|---|
| `fc1d5d5` | Added `sooonFeedReady` flag + feed-ready polling in event-features.js |
| `9438c40` | Deep link first-visit detection in sooon-critical.js |
| `a0ee3f2` | Fixed navigation: attribute selector, instant scroll, body lock removal |
