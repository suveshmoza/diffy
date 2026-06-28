import type { ColorMode, ColorScheme, ThemeController, ThemeSelection } from '@pierre/theming';

import { diffyThemeCatalog } from '@/lib/theming/themeCatalog';

const MODE_KEY = 'diffThemeMode';
const LIGHT_THEME_KEY = 'diffThemeLight';
const DARK_THEME_KEY = 'diffThemeDark';
const LEGACY_THEME_KEY = 'diffTheme';

const DEFAULT_SELECTION: ThemeSelection = {
  mode: 'system',
  lightThemeName: diffyThemeCatalog.defaultLightThemeName,
  darkThemeName: diffyThemeCatalog.defaultDarkThemeName,
};

let hydrating = false;
let persistPaused = false;

export function beginThemeHydration(): void {
  hydrating = true;
  persistPaused = true;
}

export function endThemeHydration(): void {
  hydrating = false;
  persistPaused = false;
}

export function isThemeHydrating(): boolean {
  return hydrating;
}

export function isThemePersistencePaused(): boolean {
  return persistPaused || hydrating;
}

export async function readThemeSelection(): Promise<ThemeSelection | null> {
  if (!browser?.storage?.sync) {
    return null;
  }

  const stored = await browser.storage.sync.get([
    MODE_KEY,
    LIGHT_THEME_KEY,
    DARK_THEME_KEY,
    LEGACY_THEME_KEY,
  ]);

  const mode = stored[MODE_KEY];
  const light = stored[LIGHT_THEME_KEY];
  const dark = stored[DARK_THEME_KEY];
  const legacy = stored[LEGACY_THEME_KEY];

  if (mode == null && light == null && dark == null && legacy == null) {
    return null;
  }

  if (mode == null && light == null && dark == null && typeof legacy === 'string') {
    const legacyTheme = legacy;
    const isLight =
      legacyTheme.includes('light') ||
      legacyTheme === 'catppuccin-latte' ||
      legacyTheme === 'kanagawa-lotus' ||
      legacyTheme === 'rose-pine-dawn' ||
      legacyTheme === 'slack-ochin';

    return {
      mode: isLight ? 'light' : 'dark',
      lightThemeName: isLight
        ? diffyThemeCatalog.hasTheme(legacyTheme)
          ? legacyTheme
          : diffyThemeCatalog.defaultLightThemeName
        : diffyThemeCatalog.hasTheme(legacyTheme)
          ? legacyTheme
          : diffyThemeCatalog.defaultLightThemeName,
      darkThemeName: isLight
        ? diffyThemeCatalog.defaultDarkThemeName
        : diffyThemeCatalog.hasTheme(legacyTheme)
          ? legacyTheme
          : diffyThemeCatalog.defaultDarkThemeName,
    };
  }

  const validMode: ColorMode =
    mode === 'light' || mode === 'dark' || mode === 'system' ? mode : 'system';

  const lightThemeName =
    typeof light === 'string' && diffyThemeCatalog.hasTheme(light)
      ? light
      : diffyThemeCatalog.defaultLightThemeName;
  const darkThemeName =
    typeof dark === 'string' && diffyThemeCatalog.hasTheme(dark)
      ? dark
      : diffyThemeCatalog.defaultDarkThemeName;

  return {
    mode: validMode,
    lightThemeName,
    darkThemeName,
  };
}

export async function writeThemeSelection(selection: ThemeSelection): Promise<void> {
  if (!browser?.storage?.sync) {
    return;
  }

  await browser.storage.sync.set({
    [MODE_KEY]: selection.mode,
    [LIGHT_THEME_KEY]: selection.lightThemeName,
    [DARK_THEME_KEY]: selection.darkThemeName,
  });
}

export function themeSelectionFromController(controller: ThemeController): ThemeSelection {
  const state = controller.getState();
  return {
    mode: state.mode,
    lightThemeName: state.lightThemeName,
    darkThemeName: state.darkThemeName,
  };
}

export function themeSelectionsEqual(a: ThemeSelection, b: ThemeSelection): boolean {
  return (
    a.mode === b.mode &&
    a.lightThemeName === b.lightThemeName &&
    a.darkThemeName === b.darkThemeName
  );
}

export function isDefaultThemeSelection(selection: ThemeSelection): boolean {
  return themeSelectionsEqual(selection, DEFAULT_SELECTION);
}

export function applyThemeSelection(controller: ThemeController, selection: ThemeSelection): void {
  controller.setColorMode(selection.mode);
  controller.setThemeNameForScheme('light', selection.lightThemeName);
  controller.setThemeNameForScheme('dark', selection.darkThemeName);
}

function controllerSelectionIsStable(controller: ThemeController): boolean {
  return controller.getState().pendingThemeResolution == null;
}

/** Persist controller state after it settles — one write per burst of updates. */
export function subscribeThemePersistence(controller: ThemeController): () => void {
  let writeTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleWrite = () => {
    if (isThemePersistencePaused()) {
      return;
    }
    if (!controllerSelectionIsStable(controller)) {
      return;
    }

    if (writeTimer != null) {
      clearTimeout(writeTimer);
    }
    writeTimer = setTimeout(() => {
      writeTimer = null;
      if (isThemePersistencePaused() || !controllerSelectionIsStable(controller)) {
        return;
      }
      void writeThemeSelection(themeSelectionFromController(controller));
    }, 0);
  };

  return controller.subscribe(scheduleWrite);
}

/** Apply mode + slot theme together, then persist once when resolution settles. */
export function pickTheme(
  controller: ThemeController,
  scheme: ColorScheme,
  themeName: string,
): void {
  const current = themeSelectionFromController(controller);
  const next: ThemeSelection = {
    mode: scheme,
    lightThemeName: scheme === 'light' ? themeName : current.lightThemeName,
    darkThemeName: scheme === 'dark' ? themeName : current.darkThemeName,
  };

  persistPaused = true;
  applyThemeSelection(controller, next);

  const resume = () => {
    persistPaused = false;
  };

  const writeAndResume = () => {
    void writeThemeSelection(themeSelectionFromController(controller)).finally(resume);
  };

  if (controllerSelectionIsStable(controller)) {
    writeAndResume();
    return;
  }

  const unsubscribe = controller.subscribe(() => {
    if (controllerSelectionIsStable(controller)) {
      unsubscribe();
      writeAndResume();
      return;
    }
    if (controller.getState().resolutionError != null) {
      unsubscribe();
      resume();
    }
  });
}
