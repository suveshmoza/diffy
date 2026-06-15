import type { DiffsThemeNames } from '@pierre/diffs';
import { resolveTheme } from '@pierre/diffs';

import { buildCodeViewUnsafeCss, buildFallbackCodeViewUnsafeCss } from '@/lib/code-view-unsafe-css';

export type ResolvedDiffTheme = Awaited<ReturnType<typeof resolveTheme>>;

const resolvedThemeCache = new Map<DiffsThemeNames, Promise<ResolvedDiffTheme>>();
const resolvedThemeSyncCache = new Map<DiffsThemeNames, ResolvedDiffTheme>();
const unsafeCssCache = new Map<DiffsThemeNames, Promise<string>>();

export function getResolvedDiffTheme(theme: DiffsThemeNames): Promise<ResolvedDiffTheme> {
  const cached = resolvedThemeCache.get(theme);
  if (cached) {
    return cached;
  }

  const promise = resolveTheme(theme).then((resolved) => {
    resolvedThemeSyncCache.set(theme, resolved);
    return resolved;
  });
  resolvedThemeCache.set(theme, promise);
  return promise;
}

export function getResolvedDiffThemeSync(theme: DiffsThemeNames): ResolvedDiffTheme | undefined {
  return resolvedThemeSyncCache.get(theme);
}

export function getCodeViewUnsafeCss(theme: DiffsThemeNames): Promise<string> {
  const cached = unsafeCssCache.get(theme);
  if (cached) {
    return cached;
  }

  const promise = buildCodeViewUnsafeCss(theme);
  unsafeCssCache.set(theme, promise);
  return promise;
}

export function getFallbackCodeViewUnsafeCss(theme: DiffsThemeNames): string {
  return buildFallbackCodeViewUnsafeCss(theme);
}

export function invalidateDiffThemeCache(theme?: DiffsThemeNames): void {
  if (theme) {
    resolvedThemeCache.delete(theme);
    resolvedThemeSyncCache.delete(theme);
    unsafeCssCache.delete(theme);
    return;
  }

  resolvedThemeCache.clear();
  resolvedThemeSyncCache.clear();
  unsafeCssCache.clear();
}
