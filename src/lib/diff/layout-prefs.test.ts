import { describe, expect, it, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import {
  DEFAULT_DIFF_LAYOUT,
  DIFF_LAYOUT_STORAGE_KEY,
  readDiffLayoutPreference,
  writeDiffLayoutPreference,
} from './layout-prefs';

describe('readDiffLayoutPreference', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('returns the default when storage is empty', async () => {
    await expect(readDiffLayoutPreference()).resolves.toBe(DEFAULT_DIFF_LAYOUT);
  });

  it('returns the stored value when valid', async () => {
    await browser.storage.sync.set({ [DIFF_LAYOUT_STORAGE_KEY]: 'switched' });
    await expect(readDiffLayoutPreference()).resolves.toBe('switched');
  });

  it('returns the default when stored value is invalid', async () => {
    await browser.storage.sync.set({ [DIFF_LAYOUT_STORAGE_KEY]: 'invalid' });
    await expect(readDiffLayoutPreference()).resolves.toBe(DEFAULT_DIFF_LAYOUT);
  });

  it('caches the result from storage', async () => {
    await browser.storage.sync.set({ [DIFF_LAYOUT_STORAGE_KEY]: 'switched' });
    const first = await readDiffLayoutPreference();
    await browser.storage.sync.set({ [DIFF_LAYOUT_STORAGE_KEY]: 'stacked' });
    const second = await readDiffLayoutPreference();
    expect(first).toBe('switched');
    expect(second).toBe('stacked');
  });
});

describe('writeDiffLayoutPreference', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('writes the layout to storage', async () => {
    await writeDiffLayoutPreference('switched');
    const stored = await browser.storage.sync.get(DIFF_LAYOUT_STORAGE_KEY);
    expect(stored[DIFF_LAYOUT_STORAGE_KEY]).toBe('switched');
  });
});
