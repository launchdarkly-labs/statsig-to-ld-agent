// FAIL: track() called with Statsig logEvent argument order.
// Statsig: logEvent(name, value, metadata)
// LaunchDarkly: track(name, data, metricValue)
// Position 2 is the object in LD, not the numeric value.

import { initialize } from 'launchdarkly-js-client-sdk';

const client = initialize(process.env.LD_CLIENT_SIDE_ID, { kind: 'user', key: 'u-1' });

// null-in-slot-2 — the Statsig "no value" idiom carried over verbatim.
client.track('button_clicked', null, {
  button_id: 'cta-hero',
  page: 'landing',
});

// Numeric-in-slot-2 — same bug, harder to spot. data ends up being 159.99,
// metricValue ends up being the object. LD will silently misbehave.
client.track('purchase_completed', 159.99, {
  product_id: 'prod-123',
  currency: 'USD',
});
