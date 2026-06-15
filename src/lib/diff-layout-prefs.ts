export type DiffLayout = 'switched' | 'stacked';

export const DIFF_LAYOUT_STORAGE_KEY = 'diffLayout';
export const DEFAULT_DIFF_LAYOUT: DiffLayout = 'stacked';

export async function readDiffLayoutPreference(): Promise<DiffLayout> {
  if (!browser?.storage?.sync) {
    return DEFAULT_DIFF_LAYOUT;
  }

  const stored = await browser.storage.sync.get(DIFF_LAYOUT_STORAGE_KEY);
  const layout = stored[DIFF_LAYOUT_STORAGE_KEY];
  return isDiffLayout(layout) ? layout : DEFAULT_DIFF_LAYOUT;
}

export async function writeDiffLayoutPreference(layout: DiffLayout): Promise<void> {
  if (!browser?.storage?.sync) {
    return;
  }

  await browser.storage.sync.set({ [DIFF_LAYOUT_STORAGE_KEY]: layout });
}

function isDiffLayout(value: unknown): value is DiffLayout {
  return value === 'switched' || value === 'stacked';
}
