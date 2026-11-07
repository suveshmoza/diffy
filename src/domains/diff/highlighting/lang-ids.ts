import type { SupportedLanguages } from '@pierre/diffs';

import langIds from './lang-ids.json';

/**
 * Canonical Shiki language ids loaded by the diff worker (no aliases).
 *
 * Edit `lang-ids.json` to add or remove languages, then rebuild so
 * `shiki-pruner` drops unused grammar chunks. See CONTRIBUTING.
 */
export const DIFF_LANG_IDS = langIds as readonly SupportedLanguages[];
