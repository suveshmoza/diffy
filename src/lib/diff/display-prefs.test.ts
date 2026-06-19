import { describe, expect, it, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import {
  DEFAULT_CODE_VIEW_DISPLAY_PREFS,
  DISPLAY_PREFS_STORAGE_KEY,
  readCodeViewDisplayPrefs,
  writeCodeViewDisplayPrefs,
} from './display-prefs';

describe('readCodeViewDisplayPrefs', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('returns defaults when storage is empty', async () => {
    const result = await readCodeViewDisplayPrefs();
    expect(result).toEqual(DEFAULT_CODE_VIEW_DISPLAY_PREFS);
  });

  it('returns stored value when all fields are valid', async () => {
    const prefs = {
      diffIndicators: 'classic' as const,
      hunkSeparators: 'line-info' as const,
      disableLineNumbers: true,
      overflow: 'scroll' as const,
    };
    await browser.storage.sync.set({ [DISPLAY_PREFS_STORAGE_KEY]: prefs });
    const result = await readCodeViewDisplayPrefs();
    expect(result).toEqual(prefs);
  });

  it('falls back to defaults for invalid fields', async () => {
    await browser.storage.sync.set({
      [DISPLAY_PREFS_STORAGE_KEY]: {
        diffIndicators: 'bogus',
        hunkSeparators: 'simple',
        disableLineNumbers: 'not-boolean',
        overflow: 'wrap',
      },
    });
    const result = await readCodeViewDisplayPrefs();
    expect(result.diffIndicators).toBe(DEFAULT_CODE_VIEW_DISPLAY_PREFS.diffIndicators);
    expect(result.disableLineNumbers).toBe(DEFAULT_CODE_VIEW_DISPLAY_PREFS.disableLineNumbers);
    expect(result.hunkSeparators).toBe('simple');
    expect(result.overflow).toBe('wrap');
  });

  it('returns defaults when stored value is null', async () => {
    await browser.storage.sync.set({ [DISPLAY_PREFS_STORAGE_KEY]: null });
    const result = await readCodeViewDisplayPrefs();
    expect(result).toEqual(DEFAULT_CODE_VIEW_DISPLAY_PREFS);
  });

  it('returns defaults when stored value is a non-object', async () => {
    await browser.storage.sync.set({ [DISPLAY_PREFS_STORAGE_KEY]: 'string' });
    const result = await readCodeViewDisplayPrefs();
    expect(result).toEqual(DEFAULT_CODE_VIEW_DISPLAY_PREFS);
  });
});

describe('writeCodeViewDisplayPrefs', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('writes prefs to storage', async () => {
    const prefs = {
      diffIndicators: 'bars' as const,
      hunkSeparators: 'simple' as const,
      disableLineNumbers: false,
      overflow: 'wrap' as const,
    };
    await writeCodeViewDisplayPrefs(prefs);
    const stored = await browser.storage.sync.get(DISPLAY_PREFS_STORAGE_KEY);
    expect(stored[DISPLAY_PREFS_STORAGE_KEY]).toEqual(prefs);
  });
});
