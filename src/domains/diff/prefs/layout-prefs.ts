export type DiffLayout = 'switched' | 'stacked';

export const DIFF_LAYOUT_STORAGE_KEY = 'diffLayout';
export const DEFAULT_DIFF_LAYOUT: DiffLayout = 'stacked';

export const SIDEBAR_WIDTH_STORAGE_KEY = 'sidebarWidth';
export const DEFAULT_SIDEBAR_WIDTH = 300;
export const MIN_SIDEBAR_WIDTH = 300;
export const MAX_SIDEBAR_WIDTH = 560;

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

export function clampSidebarWidth(value: number): number {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, Math.round(value)));
}

export async function readSidebarWidthPreference(): Promise<number> {
  if (!browser?.storage?.sync) {
    return DEFAULT_SIDEBAR_WIDTH;
  }

  const stored = await browser.storage.sync.get(SIDEBAR_WIDTH_STORAGE_KEY);
  return normalizeSidebarWidth(stored[SIDEBAR_WIDTH_STORAGE_KEY]);
}

export async function writeSidebarWidthPreference(width: number): Promise<void> {
  if (!browser?.storage?.sync) {
    return;
  }

  await browser.storage.sync.set({
    [SIDEBAR_WIDTH_STORAGE_KEY]: clampSidebarWidth(width),
  });
}

function isDiffLayout(value: unknown): value is DiffLayout {
  return value === 'switched' || value === 'stacked';
}

function normalizeSidebarWidth(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_SIDEBAR_WIDTH;
  }

  return clampSidebarWidth(value);
}
