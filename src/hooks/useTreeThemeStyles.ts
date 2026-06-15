import { useMemo } from 'react';

import { buildTreeThemeStylesFromResolved } from '@/lib/theming/buildTreeThemeStyles';
import { useResolvedThemeContext } from '@/providers/ResolvedThemeProvider';

export function useTreeThemeStyles(): Record<string, string> {
  const { resolvedThemeDisplay } = useResolvedThemeContext();

  return useMemo(() => {
    if (resolvedThemeDisplay == null) {
      return {};
    }

    const { resolved, colorScheme } = resolvedThemeDisplay;
    return buildTreeThemeStylesFromResolved(resolved, colorScheme);
  }, [resolvedThemeDisplay]);
}

/** CSS custom properties only — safe to apply on a parent without overriding surface bg/color. */
export function pickTreeThemeCustomProperties(
  styles: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(styles).filter(
      ([key]) => key.startsWith('--trees-theme-') || key === 'colorScheme',
    ),
  );
}
