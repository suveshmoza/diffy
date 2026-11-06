import type { ThemesType, ThemeTypes } from '@pierre/diffs';
import { useMemo } from 'react';

import { diffThemeProps } from '@/domains/theming/model/diff-theme-props';
import { hasThemeNameSelection } from '@/domains/theming/model/theme-source';
import { useThemeSelection } from '@/domains/theming/providers/useThemeSelection';
import { useThemeSource } from '@/domains/theming/providers/useThemeSource';

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
