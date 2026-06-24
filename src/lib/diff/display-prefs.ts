import type { DiffIndicators, HunkSeparators } from '@pierre/diffs';

export type HunkSeparatorStyle = Exclude<HunkSeparators, 'custom'>;

export type CodeViewDisplayPrefs = {
  diffIndicators: DiffIndicators;
  hunkSeparators: HunkSeparatorStyle;
  disableLineNumbers: boolean;
  overflow: 'scroll' | 'wrap';
};

export const DISPLAY_PREFS_STORAGE_KEY = 'codeViewDisplayPrefs';

export const DEFAULT_CODE_VIEW_DISPLAY_PREFS: CodeViewDisplayPrefs = {
  diffIndicators: 'bars',
  hunkSeparators: 'line-info',
  disableLineNumbers: false,
  overflow: 'wrap',
};

const DIFF_INDICATORS: readonly DiffIndicators[] = ['classic', 'bars', 'none'];
const HUNK_SEPARATORS: readonly HunkSeparatorStyle[] = [
  'simple',
  'metadata',
  'line-info',
  'line-info-basic',
];
const OVERFLOW_VALUES: readonly CodeViewDisplayPrefs['overflow'][] = ['scroll', 'wrap'];

export async function readCodeViewDisplayPrefs(): Promise<CodeViewDisplayPrefs> {
  if (!browser?.storage?.sync) {
    return DEFAULT_CODE_VIEW_DISPLAY_PREFS;
  }

  const stored = await browser.storage.sync.get(DISPLAY_PREFS_STORAGE_KEY);
  return normalizeDisplayPrefs(stored[DISPLAY_PREFS_STORAGE_KEY]);
}

export async function writeCodeViewDisplayPrefs(prefs: CodeViewDisplayPrefs): Promise<void> {
  if (!browser?.storage?.sync) {
    return;
  }

  await browser.storage.sync.set({ [DISPLAY_PREFS_STORAGE_KEY]: prefs });
}

function normalizeDisplayPrefs(value: unknown): CodeViewDisplayPrefs {
  if (typeof value !== 'object' || value === null) {
    return DEFAULT_CODE_VIEW_DISPLAY_PREFS;
  }

  const candidate = value as Partial<Record<keyof CodeViewDisplayPrefs, unknown>>;

  return {
    diffIndicators: isOneOf(candidate.diffIndicators, DIFF_INDICATORS)
      ? candidate.diffIndicators
      : DEFAULT_CODE_VIEW_DISPLAY_PREFS.diffIndicators,
    hunkSeparators: isOneOf(candidate.hunkSeparators, HUNK_SEPARATORS)
      ? candidate.hunkSeparators
      : DEFAULT_CODE_VIEW_DISPLAY_PREFS.hunkSeparators,
    disableLineNumbers:
      typeof candidate.disableLineNumbers === 'boolean'
        ? candidate.disableLineNumbers
        : DEFAULT_CODE_VIEW_DISPLAY_PREFS.disableLineNumbers,
    overflow: isOneOf(candidate.overflow, OVERFLOW_VALUES)
      ? candidate.overflow
      : DEFAULT_CODE_VIEW_DISPLAY_PREFS.overflow,
  };
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === 'string' && (options as readonly string[]).includes(value);
}
