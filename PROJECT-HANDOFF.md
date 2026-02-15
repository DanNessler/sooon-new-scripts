# Event Share & Deep Link - Complete Handoff Document

**Status:** ✅ FULLY WORKING
**Last Updated:** 2026-02-15
**Current Commit:** `eed1235`

---

## 📦 Project Overview

Event share functionality for sooon - allows users to share events via native Web Share API with deep links that navigate directly to specific events.

### Repository
- **GitHub:** `DanNessler/sooon-new-scripts`
- **Branch:** `main`
- **Main File:** `scripts/event-share.js`
- **Latest Commit:** `eed1235`

### Webflow
- **Site ID:** `6944209ecd50132eb772fc5b`
- **Page ID:** `694420a0cd50132eb772fd2b`
- **Live URL:** `https://sooon-new.webflow.io/`

### Current Script Tag (in Webflow)
```html
<script src="https://cdn.jsdelivr.net/gh/DanNessler/sooon-new-scripts@eed1235/scripts/event-share.js"></script>
```

---

## ✅ Working Features

### 1. Event Share ✅
**Status:** WORKING

When user clicks share button in an open event modal:
- Extracts event data from the currently open modal (artist, venue, city, date, slug)
- Builds shareable text with deep link
- Opens native share dialog (mobile) or copies to clipboard (desktop)

**Deep link format:** `https://sooon-new.webflow.io/#event-{slug}`

### 2. Deep Link Navigation ✅
**Status:** WORKING

When user opens a deep link:
- Automatically detects `#event-{slug}` in URL
- Extracts slug from hash (handles URL-encoded share text)
- Retries with exponential backoff to wait for CMS load (up to 5 attempts)
- Scrolls to the matching event card
- Clears hash after navigation

---

## 🔧 Key Technical Details

### Selectors (Configured in code)
```javascript
config = {
  modalScope: '.event_modal_scope',           // Parent container with event data
  shareButton: '[data-share-action="event-share"]',  // Share button trigger

  // Data selectors (within modal scope)
  activeArtist: '.event_modal_hero_artist_content .heading-h2-4xl',
  venue: '.event_location-venue',
  city: '.event_location-city',
  date: '.date_detailed',
  slugSource: '[data-event-slug-source="true"]',  // Element containing unique slug

  // Feed card selectors
  feedCard: '.card_feed_item',                // Individual event cards in feed
  feedSlug: '[data-feed-slug="true"]'         // Alternative slug attribute in feed
}
```

### How Data Extraction Works

**Share button clicked:**
1. Find `.event_modal.is-open` (the currently open modal)
2. Get parent `.event_modal_scope` (contains all event data)
3. Extract artist from modal: `.event_modal_hero_artist_content .heading-h2-4xl`
4. Extract venue/city/date/slug from modal scope
5. Build share text and deep link
6. Trigger native share or copy to clipboard

**Deep link opened:**
1. Extract slug from URL hash (handles URL encoding and extra text)
2. Search all `.event_modal_scope` elements for matching slug
3. Fallback to `.card_feed_item` if not found in scopes
4. Scroll to matching card
5. Clear hash from URL

### Important: Slug Extraction from Hash

The hash may contain both slug and share text:
```
#event-2026-01-16-baze-le-singe-37a80%20Check%20out%20Baze%20at...
```

The code extracts only the slug portion:
```javascript
// Decode URL encoding
slug = decodeURIComponent(slug);

// Extract only alphanumeric and hyphens (slug format: YYYY-MM-DD-artist-venue-hash)
const slugMatch = slug.match(/^[a-zA-Z0-9-]+/);
if (slugMatch) {
  slug = slugMatch[0];  // Result: "2026-01-16-baze-le-singe-37a80"
}
```

---

## 🎨 Customizing Share Text in Webflow

The share text can be customized **directly in Webflow** without code changes.

### How to Customize

1. Select the share button element (has `data-share-action="event-share"`)
2. Add Custom Attribute:
   - **Name:** `data-share-template`
   - **Value:** Your custom text with placeholders

### Available Placeholders
- `{artist-1}` - Artist name
- `{venue-name}` - Venue name
- `{venue-city}` - City
- `{date}` - Event date

### Example Templates

**Default (if no custom attribute):**
```
Check out {artist-1} at {venue-name}, {venue-city} on {date}! 🤘🫶 via sooon
```

**Short:**
```
{artist-1} @ {venue-name} on {date} 🎵
```

**Detailed:**
```
Don't miss {artist-1} live at {venue-name} in {venue-city} on {date}! Get tickets now! 🎫
```

---

## 🚀 Deployment Workflow

### Making Code Changes

1. **Edit code locally:**
   ```bash
   cd /Users/ddrive/Documents/sooon-new-scripts
   # Edit scripts/event-share.js
   ```

2. **Commit and push:**
   ```bash
   git add scripts/event-share.js
   git commit -m "Your commit message"
   git push
   ```

3. **Get commit hash:**
   ```bash
   git log -1 --format="%h"
   ```

4. **Update Webflow script tag:**
   ```html
   <script src="https://cdn.jsdelivr.net/gh/DanNessler/sooon-new-scripts@NEW_HASH/scripts/event-share.js"></script>
   ```

5. **Publish in Webflow**

6. **Test in incognito tab** (to bypass cache)

### Bypassing jsDelivr Cache

jsDelivr caches scripts. To bypass:
- Use commit hash in URL (not `@main`)
- Test in incognito mode
- Wait ~5 minutes for CDN to update

---

## 📝 Recent Fixes (2026-02-15)

### Fix 1: Event Share Extraction ✅
**Problem:** Share always extracted data from first event (Knoppel), not the open modal.

**Solution:**
- Changed modal selector from `.event_modal_scope.is-open` to `.event_modal.is-open`
- Find open modal first, then traverse to parent scope
- Extract artist from modal, other data from scope

**Commit:** `cb6dbd8`

### Fix 2: Deep Link Navigation ✅
**Problem:** Deep link didn't scroll to the event card.

**Root causes:**
1. CMS not loaded when script ran (500ms timeout too short)
2. Slug extraction included share text from hash
3. Only tried one selector for feed cards

**Solutions:**
- Added retry logic with exponential backoff (5 attempts: 300ms, 600ms, 1200ms, 2400ms, 4800ms)
- Improved slug extraction to handle URL-encoded share text in hash
- Try both `.event_modal_scope` and `.card_feed_item` selectors
- Added comprehensive diagnostic logging

**Commits:** `6e0a00e`, `eed1235`

---

## 🐛 Debugging

### Console Logs

The script outputs detailed logs:

**Initialization:**
```
[Event Share] Script loaded
[Event Share] Initializing...
[Event Share] Initialized successfully
```

**Deep link navigation:**
```
[Event Share] Deep link detected on load: 2026-01-16-baze-le-singe-37a80
[Event Share] Original hash: #event-2026-01-16-baze-le-singe-37a80%20Share%20text...
[Event Share] Navigation attempt 1/5
[Event Share] Approach 1 - Feed cards (.card_feed_item): 10
[Event Share] Approach 2 - Modal scopes (.event_modal_scope): 10
[Event Share] Scope 0 slug: "2026-01-09-knoppel-tchuur-4e8b7"
[Event Share] Scope 1 slug: "2026-01-16-baze-le-singe-37a80"
[Event Share] ✅ MATCH found in scope 1
[Event Share] Found target element, scrolling...
[Event Share] Hash cleared
```

**Share button clicked:**
```
[Event Share] Share button clicked
[Event Share] Extracting event data from modal...
[Event Share] Found open modal and its scope
[Event Share] Extracted data: {artist: "Baze", venue: "Le Singe", ...}
[Event Share] Building share text...
[Event Share] Deep link: https://sooon-new.webflow.io/#event-2026-01-16-baze-le-singe-37a80
[Event Share] Shared successfully via Web Share API
```

### Common Issues

**Issue:** Deep link doesn't scroll
- Check console for `❌ NO MATCH FOUND`
- Verify slug format matches between hash and feed cards
- Check if CMS has loaded (feed card count > 0)

**Issue:** Share extracts wrong event
- Check that modal has `.is-open` class
- Verify modal structure matches selectors
- Check console logs for extracted data

---

## 📚 File Structure

```
sooon-new-scripts/
├── scripts/
│   └── event-share.js          # Main script (WORKING)
├── PROJECT-HANDOFF.md           # This file
├── SIMPLE-TEST-GUIDE.md         # Testing instructions
├── diagnostic-deep-link.js      # Optional diagnostic script
└── test-deep-link.md            # Detailed test plan
```

---

## 🎯 Next Steps / Future Features

Potential enhancements (not implemented):
- [ ] Analytics tracking for shares
- [ ] Custom share images (Open Graph)
- [ ] WhatsApp/Telegram direct share buttons
- [ ] Copy link confirmation animation
- [ ] Share to calendar functionality
- [ ] Event reminder feature

---

## 📞 Quick Reference

**Test deep link:**
```
https://sooon-new.webflow.io/#event-2026-01-16-baze-le-singe-37a80
```

**Update script in Webflow:**
```html
<script src="https://cdn.jsdelivr.net/gh/DanNessler/sooon-new-scripts@eed1235/scripts/event-share.js"></script>
```

**Get latest commit:**
```bash
cd /Users/ddrive/Documents/sooon-new-scripts
git log -1 --format="%h"
```

**Key attributes for Webflow:**
- Share button: `data-share-action="event-share"`
- Custom template: `data-share-template="{your template}"`
- Slug source: `data-event-slug-source="true"`
- Feed slug: `data-feed-slug="true"`

---

**Document Version:** 1.0
**Last Verified Working:** 2026-02-15
**Maintained By:** DanNessler + Claude Sonnet 4.5
