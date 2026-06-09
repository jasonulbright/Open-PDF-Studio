import { resolve } from 'node:path';
import { existsSync, statSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { expect } from '@wdio/globals';
import {
  waitForHarness,
  openByPaths,
  saveActiveAs,
  getState,
} from '../support/harness.js';

const SAMPLE_PDF = resolve(__dirname, '..', 'fixtures', 'sample.pdf');

describe('save active file to a known path', () => {
  let tmp: string;
  let dest: string;

  before(() => {
    tmp = mkdtempSync(resolve(tmpdir(), 'spectra-e2e-'));
    dest = resolve(tmp, 'saved-sample.pdf');
  });

  after(() => {
    if (tmp && existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
  });

  it('writes a non-empty PDF to the chosen path', async () => {
    await waitForHarness();
    await openByPaths([SAMPLE_PDF]);
    const state = await getState();
    expect(state.activeFile).not.toBeNull();

    await saveActiveAs(dest);

    expect(existsSync(dest)).toBe(true);
    const size = statSync(dest).size;
    expect(size).toBeGreaterThan(500);
  });
});
