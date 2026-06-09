import { expect } from '@wdio/globals';
import { waitForHarness, getState } from '../support/harness.js';

describe('view switcher', () => {
  it('navigates between Home, Tools, Pages via header buttons', async () => {
    await waitForHarness();

    await $('[data-testid="view-tools"]').click();
    await browser.waitUntil(async () => (await getState()).view === 'operations', {
      timeoutMsg: 'view did not switch to operations',
    });

    await $('[data-testid="view-home"]').click();
    await browser.waitUntil(async () => (await getState()).view === 'welcome', {
      timeoutMsg: 'view did not switch to welcome',
    });

    await $('[data-testid="view-pages"]').click();
    await browser.waitUntil(async () => (await getState()).view === 'pages', {
      timeoutMsg: 'view did not switch to pages',
    });

    await expect($('[data-testid="view-switcher"]')).toBeDisplayed();
  });
});
