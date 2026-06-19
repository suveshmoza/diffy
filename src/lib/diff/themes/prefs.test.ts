import { describe, expect, it, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import {
  DEFAULT_DIFF_THEME,
  diffThemeType,
  normalizeDiffTheme,
  readDiffTheme,
  writeDiffTheme,
} from './prefs';

describe('readDiffTheme', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('returns default when storage is empty', async () => {
    await expect(readDiffTheme()).resolves.toBe(DEFAULT_DIFF_THEME);
  });

  it('returns stored valid theme', async () => {
    await browser.storage.sync.set({ diffTheme: 'github-light' });
    await expect(readDiffTheme()).resolves.toBe('github-light');
  });

  it('returns default for invalid stored theme', async () => {
    await browser.storage.sync.set({ diffTheme: 'nonexistent' });
    await expect(readDiffTheme()).resolves.toBe(DEFAULT_DIFF_THEME);
  });
});

describe('writeDiffTheme', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('writes theme to storage', async () => {
    await writeDiffTheme('catppuccin-latte');
    const stored = await browser.storage.sync.get('diffTheme');
    expect(stored.diffTheme).toBe('catppuccin-latte');
  });
});

describe('normalizeDiffTheme', () => {
  it('passes through a known theme', () => {
    expect(normalizeDiffTheme('github-dark')).toBe('github-dark');
  });

  it('returns default for unknown theme string', () => {
    expect(normalizeDiffTheme('unknown-theme')).toBe(DEFAULT_DIFF_THEME);
  });

  it('returns default for non-string value', () => {
    expect(normalizeDiffTheme(123)).toBe(DEFAULT_DIFF_THEME);
  });
});

describe('diffThemeType', () => {
  it('returns "light" for theme with "light" in name', () => {
    expect(diffThemeType('github-light')).toBe('light');
  });

  it('returns "light" for known light theme ids', () => {
    expect(diffThemeType('catppuccin-latte')).toBe('light');
    expect(diffThemeType('kanagawa-lotus')).toBe('light');
    expect(diffThemeType('rose-pine-dawn')).toBe('light');
    expect(diffThemeType('slack-ochin')).toBe('light');
  });

  it('returns "dark" for themes without "light" in name and not in LIGHT_THEME_IDS', () => {
    expect(diffThemeType('github-dark')).toBe('dark');
    expect(diffThemeType('monokai')).toBe('dark');
    expect(diffThemeType('catppuccin-mocha')).toBe('dark');
  });
});
