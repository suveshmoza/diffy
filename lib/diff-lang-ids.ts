import type { SupportedLanguages } from '@pierre/diffs';

import langIds from './diff-lang-ids.json';

/**
 * Language ids loaded by the diff worker.
 *
 * AUTO-GENERATED — do not edit `diff-lang-ids.json` by hand.
 * To add or remove a language, edit `diff-blocked-lang-ids.json` and rebuild.
 * See README § "Syntax highlighting languages".
 */
export const DIFF_LANG_IDS = langIds as readonly SupportedLanguages[];
