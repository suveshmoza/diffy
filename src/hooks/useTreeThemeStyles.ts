import { useMemo } from 'react';

import { buildTreeThemeStylesFromResolved } from '@/lib/theming/buildTreeThemeStyles';
import { useThemeSource } from '@/providers/theming/useThemeSource';

export function useTreeThemeStyles(): Record<string, string> {
  const { activeTheme } = useThemeSource();

  return useMemo(() => {
    if (activeTheme.theme == null) {
      return {};
    }

    return buildTreeThemeStylesFromResolved(activeTheme.theme, activeTheme.colorScheme);
  }, [activeTheme.theme, activeTheme.colorScheme]);
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
