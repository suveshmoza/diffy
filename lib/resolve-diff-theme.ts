import type { DiffsThemeNames } from '@pierre/diffs';
import { resolveTheme } from '@pierre/diffs';
import { themeToTreeStyles } from '@pierre/trees';

import { buildCodeViewUnsafeCss, buildFallbackCodeViewUnsafeCss } from '@/lib/code-view-unsafe-css';
import { diffThemeType } from '@/lib/diff-themes';

type ResolvedDiffTheme = Awaited<ReturnType<typeof resolveTheme>>;

const resolvedThemeCache = new Map<DiffsThemeNames, Promise<ResolvedDiffTheme>>();
const unsafeCssCache = new Map<DiffsThemeNames, Promise<string>>();
const treeThemeStylesCache = new Map<DiffsThemeNames, Promise<Record<string, string>>>();

export function getResolvedDiffTheme(theme: DiffsThemeNames): Promise<ResolvedDiffTheme> {
  const cached = resolvedThemeCache.get(theme);
  if (cached) {
    return cached;
  }

  const promise = resolveTheme(theme);
  resolvedThemeCache.set(theme, promise);
  return promise;
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

export function getTreeThemeStyles(theme: DiffsThemeNames): Promise<Record<string, string>> {
  const cached = treeThemeStylesCache.get(theme);
  if (cached) {
    return cached;
  }

  const promise = getResolvedDiffTheme(theme)
    .then((resolved) => ({
      ...themeToTreeStyles(resolved),
      colorScheme: diffThemeType(theme),
    }))
    .catch(() => ({
      colorScheme: diffThemeType(theme),
    }));

  treeThemeStylesCache.set(theme, promise);
  return promise;
}

export function invalidateDiffThemeCache(theme?: DiffsThemeNames): void {
  if (theme) {
    resolvedThemeCache.delete(theme);
    unsafeCssCache.delete(theme);
    treeThemeStylesCache.delete(theme);
    return;
  }

  resolvedThemeCache.clear();
  unsafeCssCache.clear();
  treeThemeStylesCache.clear();
}
