import type { DiffsThemeNames, ThemesType, ThemeTypes } from '@pierre/diffs';

import type { ThemeNameSelection } from '@/domains/theming/model/theme-source';

export function diffThemeProps(sel: ThemeNameSelection): {
  theme: ThemesType;
  themeType: ThemeTypes;
} {
  return {
    theme: {
      dark: sel.darkThemeName as DiffsThemeNames,
      light: sel.lightThemeName as DiffsThemeNames,
    },
    themeType: sel.colorScheme,
  };
}
