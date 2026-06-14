import type { DiffsThemeNames } from '@pierre/diffs';
import { useMemo, useRef } from 'react';

import { diffThemeType } from '@/lib/diff-themes';
import { getResolvedDiffThemeSync, type ResolvedDiffTheme } from '@/lib/resolve-diff-theme';
import { chromeThemeProps } from '@/lib/theming/chromeThemeProps';
import { useDiffThemeContext } from '@/providers/DiffThemeProvider';
import {
  useResolvedThemeContext,
  type ResolvedThemeDisplay,
} from '@/providers/ResolvedThemeProvider';

function resolveThemeForChrome(
  themeName: DiffsThemeNames,
  resolvedThemeDisplay: ResolvedThemeDisplay | undefined,
): ResolvedDiffTheme | undefined {
  const syncResolved = getResolvedDiffThemeSync(themeName);
  if (syncResolved != null) {
    return syncResolved;
  }

  if (resolvedThemeDisplay?.name === themeName) {
    return resolvedThemeDisplay.resolved;
  }

  return undefined;
}

export function useChromeThemeProps(): Record<string, string> {
  const { theme } = useDiffThemeContext();
  const { resolvedThemeDisplay } = useResolvedThemeContext();
  const lastStylesRef = useRef<Record<string, string>>({});

  return useMemo(() => {
    const resolved = resolveThemeForChrome(theme, resolvedThemeDisplay);
    if (resolved == null) {
      return lastStylesRef.current;
    }

    const next = chromeThemeProps({
      theme: resolved,
      colorScheme: diffThemeType(theme),
    }).style;
    lastStylesRef.current = next;
    return next;
  }, [theme, resolvedThemeDisplay]);
}
