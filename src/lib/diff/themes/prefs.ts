import { type DiffsThemeNames } from '@pierre/diffs';

import { DIFF_THEME_IDS } from './ids';

export const DEFAULT_DIFF_THEME: DiffsThemeNames = 'github-dark';

export const DIFF_THEMES = DIFF_THEME_IDS;

const knownThemeIds = new Set<string>(DIFF_THEMES);

/** Light themes whose id does not contain "light". */
const LIGHT_THEME_IDS = new Set<DiffsThemeNames>([
  'catppuccin-latte',
  'kanagawa-lotus',
  'rose-pine-dawn',
  'slack-ochin',
]);

export function normalizeDiffTheme(value: unknown): DiffsThemeNames {
  return typeof value === 'string' && knownThemeIds.has(value)
    ? (value as DiffsThemeNames)
    : DEFAULT_DIFF_THEME;
}

export function diffThemeType(theme: DiffsThemeNames): 'light' | 'dark' {
  return theme.includes('light') || LIGHT_THEME_IDS.has(theme) ? 'light' : 'dark';
}

const STORAGE_KEY = 'diffTheme';

export async function readDiffTheme(): Promise<DiffsThemeNames> {
  if (!browser?.storage?.sync) {
    return DEFAULT_DIFF_THEME;
  }

  const stored = await browser.storage.sync.get(STORAGE_KEY);
  return normalizeDiffTheme(stored[STORAGE_KEY]);
}

export async function writeDiffTheme(theme: DiffsThemeNames): Promise<void> {
  if (!browser?.storage?.sync) {
    return;
  }

  await browser.storage.sync.set({ [STORAGE_KEY]: theme });
}
