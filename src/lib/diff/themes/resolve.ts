import type { DiffsThemeNames } from '@pierre/diffs';
import { resolveTheme } from '@pierre/diffs';

import {
  buildCodeViewUnsafeCss,
  buildFallbackCodeViewUnsafeCss,
} from '@/lib/diff/themes/unsafe-css';

export type ResolvedDiffTheme = Awaited<ReturnType<typeof resolveTheme>>;

const resolvedThemeCache = new Map<DiffsThemeNames, Promise<ResolvedDiffTheme>>();
const unsafeCssCache = new Map<DiffsThemeNames, Promise<string>>();

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
