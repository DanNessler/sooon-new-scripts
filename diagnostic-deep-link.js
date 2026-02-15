// Run this in the browser console on https://sooon-new.webflow.io/
// to diagnose the deep link navigation issue

console.log('=== Deep Link Navigation Diagnostic ===');

// 1. Check if feed cards exist
const feedCards = document.querySelectorAll('.card_feed_item');
console.log('Total feed cards found:', feedCards.length);

if (feedCards.length === 0) {
  console.warn('⚠️ No feed cards found! Check if CMS has loaded.');
} else {
  console.log('✅ Feed cards exist');
}

// 2. Check first 5 feed cards for slug data
console.log('\n--- Checking first 5 feed cards for slug data ---');
feedCards.forEach((card, i) => {
  if (i < 5) {
    const slugEl = card.querySelector('[data-feed-slug="true"]');
    if (slugEl) {
      const slug = slugEl.textContent.trim();
      console.log(`Card ${i}: slug="${slug}"`);
    } else {
      console.warn(`Card ${i}: ❌ No [data-feed-slug="true"] element found`);

      // Check what attributes the card has
      const allElements = card.querySelectorAll('[data-*]');
      console.log(`  Available data attributes in card ${i}:`,
        Array.from(allElements).map(el => el.getAttribute('data-event-slug-source') || el.getAttribute('data-feed-slug')));
    }
  }
});

// 3. Check if the URL hash is present
const hash = window.location.hash;
console.log('\n--- URL Hash ---');
console.log('Current hash:', hash || '(no hash)');

if (hash.startsWith('#event-')) {
  const slug = hash.replace('#event-', '');
  console.log('Extracted slug from hash:', slug);

  // 4. Try to find matching feed card
  console.log('\n--- Looking for matching feed card ---');
  let found = false;

  feedCards.forEach((card, i) => {
    const slugEl = card.querySelector('[data-feed-slug="true"]');
    if (slugEl) {
      const cardSlug = slugEl.textContent.trim();
      if (cardSlug === slug) {
        console.log(`✅ MATCH found at card ${i}!`);
        console.log('  Card slug:', cardSlug);
        console.log('  Target slug:', slug);
        found = true;
      }
    }
  });

  if (!found) {
    console.warn('❌ No matching feed card found');
    console.log('Possible issues:');
    console.log('1. Slug format mismatch');
    console.log('2. CMS not loaded yet');
    console.log('3. Wrong attribute selector');
  }
} else {
  console.log('No #event- hash in URL. To test, add #event-{slug} to URL');
}

// 5. Alternative: Check for data-event-slug-source attribute
console.log('\n--- Checking alternative slug attributes ---');
const slugSourceElements = document.querySelectorAll('[data-event-slug-source="true"]');
console.log('Elements with [data-event-slug-source="true"]:', slugSourceElements.length);

if (slugSourceElements.length > 0) {
  console.log('First 3 slug sources:');
  slugSourceElements.forEach((el, i) => {
    if (i < 3) {
      console.log(`  ${i}: "${el.textContent.trim()}"`);
    }
  });
}
