import type { ColorScheme, ThemeController, ThemeLike, ThemeResolver } from '@pierre/theming';

export interface ActiveThemeSnapshot {
  theme?: ThemeLike;
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

export type ThemeValue = string | ThemeLike;
export type ThemePair<T = ThemeValue> = { light: T; dark: T };
export type ThemeInput = ThemeValue | ThemePair;

export interface FixedSourceOptions {
  resolver: ThemeResolver;
  colorScheme?: ColorScheme;
}

function schemeOf(theme: ThemeLike | undefined): ColorScheme {
  return theme?.type === 'dark' ? 'dark' : 'light';
}

export function isThemePair(input: ThemeInput): input is ThemePair {
  return typeof input === 'object' && 'light' in input && 'dark' in input;
}

export function nameOf(slot: ThemeValue | undefined): string | undefined {
  return typeof slot === 'string' ? slot : slot?.name;
}

export function requireThemeValueName(value: ThemeValue): string {
  const name = nameOf(value);
  if (name == null || name === '') {
    throw new Error('ThemeInput ThemeLike values used by diff wrappers must include a `name`');
  }
  return name;
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

export function fixedSource(
  input: ThemeInput,
  options: FixedSourceOptions,
): ThemeSourceWithNameSelection {
  const { resolver, colorScheme = 'light' } = options;
  const listeners = new Set<() => void>();
  let resolved: ThemeLike | undefined;
  let selection: ThemeNameSelection | undefined;
  let reportedScheme: ColorScheme = colorScheme;

  function notify(): void {
    for (const listener of listeners) listener();
  }

  function selectSlot(): { name?: string; object?: ThemeLike } {
    if (typeof input === 'string') return { name: input };
    if (isThemePair(input)) {
      const slot = colorScheme === 'dark' ? input.dark : input.light;
      return typeof slot === 'string' ? { name: slot } : { object: slot };
    }
    return { object: input };
  }

  if (typeof input === 'string') {
    selection = {
      lightThemeName: input,
      darkThemeName: input,
      colorScheme: reportedScheme,
    };
  } else if (isThemePair(input)) {
    const light = nameOf(input.light);
    const dark = nameOf(input.dark);
    if (light != null && dark != null) {
      selection = {
        lightThemeName: light,
        darkThemeName: dark,
        colorScheme: reportedScheme,
      };
    }
  } else {
    const name = nameOf(input);
    if (name != null) {
      selection = {
        lightThemeName: name,
        darkThemeName: name,
        colorScheme: reportedScheme,
      };
    }
  }

  const slot = selectSlot();
  if (slot.object != null) {
    resolved = slot.object;
    reportedScheme = schemeOf(slot.object);
    const name = nameOf(slot.object);
    if (name != null) {
      resolver.seedResolvedTheme(name, slot.object);
    }
  } else if (slot.name != null) {
    const cached = resolver.getResolvedTheme(slot.name);
    if (cached != null) {
      resolved = cached;
      reportedScheme = schemeOf(cached);
    } else {
      void resolver
        .resolveTheme(slot.name)
        .then((theme) => {
          resolved = theme;
          reportedScheme = schemeOf(theme);
          if (
            selection != null &&
            selection.lightThemeName === selection.darkThemeName &&
            selection.lightThemeName === slot.name
          ) {
            selection = { ...selection, colorScheme: reportedScheme };
          }
          notify();
        })
        .catch(() => {});
    }
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot() {
      return { theme: resolved, colorScheme: reportedScheme };
    },
    getThemeNameSelection() {
      return selection != null ? { ...selection, colorScheme: reportedScheme } : undefined;
    },
  };
}
