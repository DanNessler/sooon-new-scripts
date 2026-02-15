# Simple Test Guide - Deep Link Fix

## Step 1: Commit and push the changes

```bash
cd /Users/ddrive/Documents/sooon-new-scripts
git add scripts/event-share.js
git commit -m "Add comprehensive deep link diagnostics and dual approach"
git push
```

## Step 2: Get the commit hash

```bash
git log -1 --format="%h"
```

Copy this hash (it will be something like `a1b2c3d`)

## Step 3: Update Webflow

Go to your Webflow project and update the script tag to:

```html
<script src="https://cdn.jsdelivr.net/gh/DanNessler/sooon-new-scripts@YOUR_COMMIT_HASH/scripts/event-share.js"></script>
```

Replace `YOUR_COMMIT_HASH` with the hash from step 2.

## Step 4: Test the deep link

1. **Open this URL in a new incognito tab:**
   ```
   https://sooon-new.webflow.io/#event-2026-01-16-baze-le-singe-37a80
   ```

2. **Open the browser console** (Right click → Inspect → Console tab)

3. **Look for these log messages:**
   - `[Event Share] Deep link detected on load: 2026-01-16-baze-le-singe-37a80`
   - `[Event Share] Navigation attempt 1/5`
   - `[Event Share] Approach 1 - Feed cards (.card_feed_item): [NUMBER]`
   - `[Event Share] Approach 2 - Modal scopes (.event_modal_scope): [NUMBER]`
   - `[Event Share] Scope 0 slug: "..."`
   - `[Event Share] ✅ MATCH found in scope [NUMBER]`

4. **Copy ALL the console logs** and send them to me

## What the logs will tell us:

- **If you see numbers for feed cards/modal scopes:** CMS loaded successfully
- **If you see "Scope X slug: ..."**: We found the slug elements
- **If you see "✅ MATCH found"**: The slug matched!
- **If you see "❌ NO MATCH FOUND"**: We'll see what slugs are available vs what we're looking for

## Quick Console Test (Optional)

If you want to see what's on the page right now, paste this in the console on the Webflow site:

```javascript
console.log('Modal scopes:', document.querySelectorAll('.event_modal_scope').length);
console.log('Feed cards:', document.querySelectorAll('.card_feed_item').length);

const scope = document.querySelector('.event_modal_scope');
if (scope) {
  const slugEl = scope.querySelector('[data-event-slug-source="true"]');
  console.log('First slug found:', slugEl ? slugEl.textContent.trim() : 'NONE');
}
```

This will show if the elements exist and what the slug looks like.
