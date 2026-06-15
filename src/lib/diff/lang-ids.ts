import type { SupportedLanguages } from '@pierre/diffs';

import langIds from './lang-ids.json';

/**
 * Language ids loaded by the diff worker.
 *
 * AUTO-GENERATED — do not edit `lang-ids.json` by hand.
 * To add or remove a language, edit `blocked-lang-ids.json` and rebuild.
 * See README § "Syntax highlighting languages".
 */
export const DIFF_LANG_IDS = langIds as readonly SupportedLanguages[];
