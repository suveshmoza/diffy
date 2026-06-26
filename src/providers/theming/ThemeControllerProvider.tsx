import { useThemeController } from '@pierre/theming/react';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { themeController } from '@/lib/theming/themeController';
import {
  applyThemeSelection,
  beginThemeHydration,
  endThemeHydration,
  isDefaultThemeSelection,
  isThemePersistencePaused,
  readThemeSelection,
  subscribeThemePersistence,
  themeSelectionFromController,
  themeSelectionsEqual,
} from '@/lib/theming/themePersistence';
import { ThemeSourceProvider } from '@/providers/theming/ThemeSourceProvider';

type ThemeControllerContextValue = {
  isReady: boolean;
  resolutionError: string | null;
};

const ThemeReadyContext = createContext<ThemeControllerContextValue>({
  isReady: false,
  resolutionError: null,
});

export function ThemeControllerProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const state = useThemeController(themeController);

  useEffect(() => {
    let cancelled = false;
    beginThemeHydration();

    void readThemeSelection()
      .then((selection) => {
        if (cancelled) return;

        const current = themeSelectionFromController(themeController);
        const userChangedDuringHydration = !isDefaultThemeSelection(current);

        if (
          selection != null &&
          !userChangedDuringHydration &&
          !themeSelectionsEqual(selection, current)
        ) {
          applyThemeSelection(themeController, selection);
        }

        endThemeHydration();
        setIsReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          endThemeHydration();
          setIsReady(true);
        }
      });

    return () => {
      cancelled = true;
      endThemeHydration();
    };
  }, []);

  useEffect(() => subscribeThemePersistence(themeController), []);

  useEffect(() => {
    if (!browser?.storage?.onChanged) {
      return;
    }

    const onChange = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area !== 'sync') return;
      if (isThemePersistencePaused()) return;
      if (!changes.diffThemeMode && !changes.diffThemeLight && !changes.diffThemeDark) {
        return;
      }

      void readThemeSelection().then((selection) => {
        if (selection == null || isThemePersistencePaused()) return;
        const current = themeSelectionFromController(themeController);
        if (themeSelectionsEqual(selection, current)) return;
        applyThemeSelection(themeController, selection);
      });
    };

    browser.storage.onChanged.addListener(onChange);
    return () => browser.storage.onChanged.removeListener(onChange);
  }, []);

  useEffect(() => {
    if (state.resolutionError != null) {
      const message =
        state.resolutionError.error instanceof Error
          ? state.resolutionError.error.message
          : String(state.resolutionError.error);
      setResolutionError(message);
      return;
    }
    setResolutionError(null);
  }, [state.resolutionError]);

  const readyValue = useMemo(
    () => ({
      isReady,
      resolutionError,
    }),
    [isReady, resolutionError],
  );

  return (
    <ThemeReadyContext.Provider value={readyValue}>
      <ThemeSourceProvider controller={themeController}>{children}</ThemeSourceProvider>
    </ThemeReadyContext.Provider>
  );
}

export function useThemeControllerReady(): ThemeControllerContextValue {
  return useContext(ThemeReadyContext);
}
