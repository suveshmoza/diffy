import type { ColorScheme, ThemeController, ThemeLike } from '@pierre/theming';

export interface ActiveThemeSnapshot<TTheme = ThemeLike> {
  theme?: TTheme;
  colorScheme: ColorScheme;
}

export interface ThemeSource {
  subscribe(listener: () => void): () => void;
  getSnapshot(): ActiveThemeSnapshot;
}

export interface ThemeNameSelection {
  darkThemeName: string;
  lightThemeName: string;
  colorScheme: ColorScheme;
}

export interface ThemeNameSelectionSource {
  getThemeNameSelection(): ThemeNameSelection | undefined;
}

export type ThemeSourceWithNameSelection = ThemeSource & ThemeNameSelectionSource;

export function hasThemeNameSelection(
  source: ThemeSource | undefined,
): source is ThemeSourceWithNameSelection {
  return (
    source != null &&
    typeof (source as Partial<ThemeNameSelectionSource>).getThemeNameSelection === 'function'
  );
}

export function controllerSource(controller: ThemeController): ThemeSourceWithNameSelection {
  let lastResolved: ThemeLike | undefined = controller.getState().resolvedTheme;
  return {
    subscribe(listener) {
      return controller.subscribe(listener);
    },
    getSnapshot() {
      const state = controller.getState();
      if (state.resolvedTheme != null) {
        lastResolved = state.resolvedTheme;
      }
      return {
        theme: state.resolvedTheme ?? lastResolved,
        colorScheme: state.resolvedColorScheme,
      };
    },
    getThemeNameSelection() {
      const state = controller.getState();
      return {
        darkThemeName: state.darkThemeName,
        lightThemeName: state.lightThemeName,
        colorScheme: state.resolvedColorScheme,
      };
    },
  };
}
