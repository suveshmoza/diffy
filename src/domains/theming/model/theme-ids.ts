import type { DiffsThemeNames } from '@pierre/diffs';

import themeIds from './theme-ids.json';

/**
 * Theme names offered in the UI and kept in the production bundle.
 *
 * Edit `theme-ids.json` to add or remove themes, then rebuild so
 * `shiki-pruner` drops unused Shiki theme chunks. See CONTRIBUTING.
 */
export const DIFF_THEME_IDS = themeIds as readonly DiffsThemeNames[];
