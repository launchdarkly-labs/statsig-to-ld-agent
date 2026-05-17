// Parallel-SDK case: experiments preserved in Statsig, gates migrated to LD.
// Both keys live in process.env — no literal client-* survives in source.

import { StatsigClient } from '@statsig/js-client';
import { initialize } from 'launchdarkly-js-client-sdk';

const ldContext = {
  kind: 'user',
  key: 'user-1',
  email: 'a@b.com',
};

const statsigUser = {
  userID: 'user-1',
  email: 'a@b.com',
};

const ldClient = initialize(process.env.LD_CLIENT_SIDE_ID, ldContext);
const statsigClient = new StatsigClient(process.env.STATSIG_CLIENT_KEY, statsigUser);

async function boot() {
  try {
    await ldClient.waitForInitialization(5);
  } catch (err) {}
  await statsigClient.initializeAsync();

  if (ldClient.variation('new_dashboard', false)) {
    // Migrated gate path
  }

  // Experiment path — still Statsig
  const exp = statsigClient.getExperiment('checkout_test');
  if (exp.get('variant', 'control') === 'B') {
    // ...
  }
}

boot();
