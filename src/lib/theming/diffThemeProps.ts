import {
  type DiffsThemeNames,
  registerCustomTheme,
  type ThemeRegistrationResolved,
  type ThemesType,
  type ThemeTypes,
} from '@pierre/diffs';
import type { ThemeLike } from '@pierre/theming';

import {
  isThemePair,
  requireThemeValueName,
  type ThemeNameSelection,
  type ThemePair,
} from '@/lib/theming/ThemeSource';

export type DiffThemeValue = string | (ThemeLike & { name: string });
export type DiffThemeInput = DiffThemeValue | ThemePair<DiffThemeValue>;

const seededDiffThemeNames = new Set<string>();

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

export function diffThemeSelectionFromInput(
  input: DiffThemeInput,
  colorScheme: 'dark' | 'light',
): ThemeNameSelection {
  if (isThemePair(input)) {
    return {
      lightThemeName: nameForDiffThemeValue(input.light),
      darkThemeName: nameForDiffThemeValue(input.dark),
      colorScheme,
    };
  }
  const name = nameForDiffThemeValue(input);
  return { lightThemeName: name, darkThemeName: name, colorScheme };
}

function nameForDiffThemeValue(value: DiffThemeValue): string {
  if (typeof value === 'string') return value;

  const name = requireThemeValueName(value);
  if (!seededDiffThemeNames.has(name)) {
    seededDiffThemeNames.add(name);
    registerCustomTheme(name, () => Promise.resolve(value as ThemeRegistrationResolved));
  }
  return name;
}
