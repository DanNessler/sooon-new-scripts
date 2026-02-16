//  Venue Map Functionality for sooon
//  Opens venue location in Google Maps from event modals

(function() {
  'use strict';

  console.log('[Venue Map] Script loaded');

  // Configuration
  const config = {
    modalScope: '.event_modal_scope',
    mapButton: '[data-map-action="open-venue"]',

    // Modal data selectors (scoped to modal scope)
    venue: '.event_location-venue',
    city: '.event_location-city'
  };

  /**
   * Extract venue data from the currently open modal
   * Returns object with venue and city or null if not found
   */
  function getVenueData() {
    console.log('[Venue Map] Extracting venue data from modal...');

    // Find the open modal scope
    const openModal = document.querySelector('.event_modal.is-open');

    if (!openModal) {
      console.warn('[Venue Map] No .event_modal.is-open found');
      return null;
    }

    const modalScope = openModal.closest(config.modalScope);

    if (!modalScope) {
      console.warn('[Venue Map] Could not find parent .event_modal_scope');
      return null;
    }

    console.log('[Venue Map] Found open modal and its scope');

    const venueEl = modalScope.querySelector(config.venue);
    const cityEl = modalScope.querySelector(config.city);

    const data = {
      venue: venueEl ? venueEl.textContent.trim() : '',
      city: cityEl ? cityEl.textContent.trim() : ''
    };

    console.log('[Venue Map] Extracted data:', data);

    if (!data.venue) {
      console.warn('[Venue Map] Missing venue name');
      return null;
    }

    return data;
  }

  /**
   * Build Google Maps URL from venue data
   * Format: https://maps.google.com/maps?q={venue},+{city}
   */
  function buildMapsUrl(data) {
    let query = data.venue;
    if (data.city) {
      query += ', ' + data.city;
    }

    const encoded = encodeURIComponent(query);
    const url = 'https://maps.google.com/maps?q=' + encoded;

    console.log('[Venue Map] Maps URL:', url);
    return url;
  }

  /**
   * Handle map button click
   */
  function handleMapClick(e) {
    e.preventDefault();
    e.stopPropagation();

    console.log('[Venue Map] Map button clicked');

    const venueData = getVenueData();
    if (!venueData) {
      console.error('[Venue Map] Failed to extract venue data');
      return;
    }

    const mapsUrl = buildMapsUrl(venueData);

    console.log('[Venue Map] Opening maps...');
    window.open(mapsUrl, '_blank');
  }

  /**
   * Initialize event listeners
   */
  function init() {
    console.log('[Venue Map] Initializing...');

    // Use event delegation for map button (handles dynamically loaded modals)
    document.addEventListener('click', function(e) {
      const mapBtn = e.target.closest(config.mapButton);
      if (!mapBtn) return;

      handleMapClick(e);
    });

    console.log('[Venue Map] Initialized successfully');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
