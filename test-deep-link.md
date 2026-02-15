# Deep Link Navigation - Test Plan

## Changes Made

### 1. Enhanced `navigateToEvent()` function
- ✅ Returns `true`/`false` for success/failure (enables retry logic)
- ✅ Tries **both** slug selectors: `[data-feed-slug="true"]` AND `[data-event-slug-source="true"]`
- ✅ Improved logging: shows all card slugs for debugging
- ✅ Changed scroll position from `start` to `center` for better visibility
- ✅ Checks if feed cards exist before attempting navigation

### 2. Enhanced `handleDeepLinkOnLoad()` function
- ✅ Retry logic with exponential backoff (300ms → 600ms → 1200ms → 2400ms → 4800ms)
- ✅ Up to 5 attempts to handle slow CMS loading
- ✅ Better error reporting if all attempts fail

## Testing Steps

### 1. First, commit and push the changes:

```bash
git add scripts/event-share.js
git commit -m "Fix deep link navigation with retry logic and dual selector support"
git push
```

### 2. Get the new commit hash:

```bash
git log -1 --format="%H"
```

### 3. Update Webflow script tag:

Replace the script tag in Webflow with:
```html
<script src="https://cdn.jsdelivr.net/gh/DanNessler/sooon-new-scripts@NEW_COMMIT_HASH/scripts/event-share.js"></script>
```

### 4. Test the deep link:

1. Open: `https://sooon-new.webflow.io/`
2. Share an event to get the deep link
3. Open the deep link in a **new incognito tab** (to ensure fresh load)
4. Expected: Page should scroll to the matching event card
5. Check console logs to see:
   - `[Event Share] Deep link detected on load: {slug}`
   - `[Event Share] Navigation attempt 1/5`
   - Card slug comparisons
   - `[Event Share] ✅ Match found at card X`
   - `[Event Share] Found target card, scrolling...`

### 5. If it still doesn't work, run the diagnostic:

Open `/Users/ddrive/Documents/sooon-new-scripts/diagnostic-deep-link.js`
Copy the entire content and paste it into the browser console on the Webflow site.

This will show:
- How many feed cards exist
- What slug attributes are available
- Whether a match was found
- What the attribute structure looks like

## Expected Console Output (Success)

```
[Event Share] Script loaded
[Event Share] Initializing...
[Event Share] Deep link detected on load: 2026-01-16-baze-le-singe-37a80
[Event Share] Navigation attempt 1/5
[Event Share] Navigating to event: 2026-01-16-baze-le-singe-37a80
[Event Share] Total feed cards found: 24
[Event Share] Card 0 slug: 2026-02-15-artist-name-xyz
[Event Share] Card 1 slug: 2026-01-16-baze-le-singe-37a80
[Event Share] ✅ Match found at card 1
[Event Share] Found target card, scrolling...
[Event Share] Hash cleared
[Event Share] Initialized successfully
```

## Troubleshooting

If navigation still fails after all retries:

1. **Check attribute names**: Run diagnostic script to see actual attribute names
2. **Check slug format**: Ensure URL slug matches feed card slug exactly
3. **Check timing**: Increase `maxAttempts` or `baseDelay` if CMS is very slow
4. **Check Webflow CMS**: Ensure feed cards have the slug field bound correctly

## Key Fixes

The main issue was likely:
- **Timing**: 500ms wasn't enough for CMS to load → Fixed with retry logic
- **Selector mismatch**: May have been using wrong attribute → Fixed by trying both selectors
- **No feedback**: Script failed silently → Fixed with detailed logging
