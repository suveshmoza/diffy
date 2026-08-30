import type { ThemesType, ThemeTypes } from '@pierre/diffs';
import { useMemo } from 'react';

import { diffThemeProps } from '@/lib/theming/diffThemeProps';
import { hasThemeNameSelection } from '@/lib/theming/ThemeSource';
import { useThemeSelection } from '@/providers/theming/useThemeSelection';
import { useThemeSource } from '@/providers/theming/useThemeSource';

export function useDiffThemeProps(): {
  theme: ThemesType;
  themeType: ThemeTypes;
} {
  const selection = useThemeSelection();
  const { activeTheme, source } = useThemeSource();
  return useMemo(() => {
    const sourceSelection = hasThemeNameSelection(source)
      ? source.getThemeNameSelection()
      : undefined;
    if (sourceSelection != null) {
      return diffThemeProps(sourceSelection);
    }
    return diffThemeProps({
      lightThemeName: selection.lightThemeName,
      darkThemeName: selection.darkThemeName,
      colorScheme: activeTheme.colorScheme,
    });
  }, [selection.lightThemeName, selection.darkThemeName, source, activeTheme.colorScheme]);
}
