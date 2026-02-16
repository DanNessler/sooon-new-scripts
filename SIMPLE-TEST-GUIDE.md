# Simple Test Guide — Deep Link + Share Features

**Last Updated:** 2026-02-16

---

## Quick Test: Deep Link (First-Time Visitor)

1. Open an **incognito/private** tab
2. Paste a deep link URL, e.g.:
   ```
   https://sooon-new.webflow.io/#event-2026-01-16-baze-le-singe-37a80
   ```
3. **Expected:**
   - No intro screen shown
   - Audio is OFF
   - Correct event card scrolls into view
   - Feed scrolling works normally

4. Open browser console — look for:
   ```
   [Critical] Deep link detected, first visit - skipping intro, audio OFF
   [Core] Feed initialization complete, ready for deep links
   [Event Share] Feed ready, navigating to event
   [Event Share] Scroll successful, card in viewport
   ```

---

## Quick Test: Deep Link (Returning Visitor)

1. Open the site normally first (dismiss intro if shown)
2. Then navigate to a deep link URL
3. **Expected:**
   - No intro screen
   - Audio uses your saved preference
   - Correct event card scrolls into view

---

## Quick Test: Event Share

1. Open the site, scroll to any event
2. Open the event modal (tap the card)
3. Click the share button
4. **Expected:**
   - Native share dialog (mobile) or "Link copied" alert (desktop)
   - Share text includes correct artist/venue/date
   - Deep link format: `#event-{slug}`

---

## Quick Test: Regular First Visit (No Deep Link)

1. Open an **incognito/private** tab
2. Go to `https://sooon-new.webflow.io/` (no hash)
3. **Expected:**
   - Intro screen shown
   - Audio toggle shows ON
   - "Discover Shows" button works
   - Feed loads after dismissing intro

---

## Troubleshooting

**Scripts not updated?**
- jsDelivr `@main` caches unpredictably. Ensure Webflow uses commit hash URLs.
- Get latest hash: `git log -1 --format="%h"` in the repo.

**Deep link scrolls to wrong card?**
- Check that `.card_feed_item` elements have `data-event-slug` attributes in Webflow.
- Console should show: `[Event Share] Found target card, scrolling...`

**Feed locked after deep link?**
- Console should show `is-locked` removal. If stuck, check if another script re-adds it.

**No console logs at all?**
- Script might not be loaded. Check network tab for 404s on script URLs.
