import { describe, expect, it } from 'vitest';

import { diffThemeType, normalizeDiffTheme } from './prefs';

describe('normalizeDiffTheme', () => {
  it('passes through a known theme', () => {
    expect(normalizeDiffTheme('github-dark')).toBe('github-dark');
  });

  it('passes through catppuccin-latte (from LIGHT_THEME_IDS)', () => {
    expect(normalizeDiffTheme('catppuccin-latte')).toBe('catppuccin-latte');
  });

  it('returns default for unknown theme string', () => {
    expect(normalizeDiffTheme('unknown-theme')).toBe('github-dark');
  });

  it('returns default for non-string value', () => {
    expect(normalizeDiffTheme(123)).toBe('github-dark');
  });

  it('returns default for null', () => {
    expect(normalizeDiffTheme(null)).toBe('github-dark');
  });

  it('returns default for undefined', () => {
    expect(normalizeDiffTheme(undefined)).toBe('github-dark');
  });
});

describe('diffThemeType', () => {
  it('returns "light" for a theme with "light" in its name', () => {
    expect(diffThemeType('github-light')).toBe('light');
  });

  it('returns "light" for catppuccin-latte (LIGHT_THEME_IDS)', () => {
    expect(diffThemeType('catppuccin-latte')).toBe('light');
  });

  it('returns "light" for kanagawa-lotus (LIGHT_THEME_IDS)', () => {
    expect(diffThemeType('kanagawa-lotus')).toBe('light');
  });

  it('returns "light" for rose-pine-dawn (LIGHT_THEME_IDS)', () => {
    expect(diffThemeType('rose-pine-dawn')).toBe('light');
  });

  it('returns "light" for slack-ochin (LIGHT_THEME_IDS)', () => {
    expect(diffThemeType('slack-ochin')).toBe('light');
  });

  it('returns "dark" for github-dark', () => {
    expect(diffThemeType('github-dark')).toBe('dark');
  });

  it('returns "dark" for a theme without "light" and not in LIGHT_THEME_IDS', () => {
    expect(diffThemeType('monokai')).toBe('dark');
  });

  it('returns "dark" for catppuccin-mocha', () => {
    expect(diffThemeType('catppuccin-mocha')).toBe('dark');
  });
});
