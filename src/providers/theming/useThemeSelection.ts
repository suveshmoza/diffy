import type { ColorMode, ColorScheme } from '@pierre/theming';
import { createThemeResolver } from '@pierre/theming';
import { useThemeController } from '@pierre/theming/react';
import { useContext, useMemo } from 'react';

import { diffyThemeCatalog } from '@/lib/theming/themeCatalog';
import { pickTheme as pickThemeOnController } from '@/lib/theming/themePersistence';
import { ThemeControllerContext, useThemeSource } from '@/providers/theming/useThemeSource';

export interface ThemeSelectionResult {
  colorMode: ColorMode;
  darkThemeName: string;
  lightThemeName: string;
  darkThemeNames: readonly string[];
  lightThemeNames: readonly string[];
  resolvedColorScheme: ColorScheme;
  setColorMode(mode: ColorMode): void;
  setDarkThemeName(name: string): void;
  setLightThemeName(name: string): void;
  pickTheme(scheme: ColorScheme, themeName: string): void;
}

const NOOP = () => {};
const EMPTY_THEMES: readonly string[] = [];

const FALLBACK_CONTROLLER = {
  resolver: createThemeResolver(),
  subscribe: () => () => {},
  getState: () => ({
    darkThemeName: '',
    lightThemeName: '',
    mode: 'system' as const,
    resolvedColorScheme: 'light' as const,
  }),
  setColorMode: NOOP,
  setThemeNameForScheme: NOOP,
  destroy: NOOP,
};

export function useThemeSelection(): ThemeSelectionResult {
  const controller = useContext(ThemeControllerContext);
  const state = useThemeController(controller ?? FALLBACK_CONTROLLER);

  return useMemo<ThemeSelectionResult>(() => {
    if (controller == null) {
      return {
        colorMode: 'system',
        darkThemeName: '',
        lightThemeName: '',
        darkThemeNames: EMPTY_THEMES,
        lightThemeNames: EMPTY_THEMES,
        resolvedColorScheme: 'light',
        setColorMode: NOOP,
        setDarkThemeName: NOOP,
        setLightThemeName: NOOP,
        pickTheme: NOOP,
      };
    }
    const pickTheme = (scheme: ColorScheme, themeName: string) => {
      pickThemeOnController(controller, scheme, themeName);
    };
    return {
      colorMode: state.mode,
      darkThemeName: state.darkThemeName,
      lightThemeName: state.lightThemeName,
      darkThemeNames: diffyThemeCatalog.getThemeNames({ colorScheme: 'dark' }),
      lightThemeNames: diffyThemeCatalog.getThemeNames({ colorScheme: 'light' }),
      resolvedColorScheme: state.resolvedColorScheme,
      setColorMode: (mode: ColorMode) => controller.setColorMode(mode),
      setDarkThemeName: (name: string) => controller.setThemeNameForScheme('dark', name),
      setLightThemeName: (name: string) => controller.setThemeNameForScheme('light', name),
      pickTheme,
    };
  }, [
    controller,
    state.mode,
    state.darkThemeName,
    state.lightThemeName,
    state.resolvedColorScheme,
  ]);
}

export function useThemeColorScheme(): 'light' | 'dark' {
  const { activeTheme } = useThemeSource();
  return activeTheme.colorScheme;
}
