import { type DiffsThemeNames } from '@pierre/diffs';

export const DEFAULT_DIFF_THEME: DiffsThemeNames = 'github-dark';

export const DIFF_THEMES: readonly DiffsThemeNames[] = [
  'andromeeda',
  'aurora-x',
  'ayu-dark',
  'ayu-light',
  'ayu-mirage',
  'catppuccin-frappe',
  'catppuccin-latte',
  'catppuccin-macchiato',
  'catppuccin-mocha',
  'dark-plus',
  'dracula',
  'dracula-soft',
  'everforest-dark',
  'everforest-light',
  'github-dark',
  'github-dark-default',
  'github-dark-dimmed',
  'github-dark-high-contrast',
  'github-light',
  'github-light-default',
  'github-light-high-contrast',
  'gruvbox-dark-hard',
  'gruvbox-dark-medium',
  'gruvbox-dark-soft',
  'gruvbox-light-hard',
  'gruvbox-light-medium',
  'gruvbox-light-soft',
  'horizon',
  'horizon-bright',
  'houston',
  'kanagawa-dragon',
  'kanagawa-lotus',
  'kanagawa-wave',
  'laserwave',
  'light-plus',
  'material-theme',
  'material-theme-darker',
  'material-theme-lighter',
  'material-theme-ocean',
  'material-theme-palenight',
  'min-dark',
  'min-light',
  'monokai',
  'night-owl',
  'night-owl-light',
  'nord',
  'one-dark-pro',
  'one-light',
  'plastic',
  'poimandres',
  'red',
  'rose-pine',
  'rose-pine-dawn',
  'rose-pine-moon',
  'slack-dark',
  'slack-ochin',
  'snazzy-light',
  'solarized-dark',
  'solarized-light',
  'synthwave-84',
  'tokyo-night',
  'vesper',
  'vitesse-black',
  'vitesse-dark',
  'vitesse-light',
];

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
