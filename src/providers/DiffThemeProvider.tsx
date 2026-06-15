import type { DiffsThemeNames } from '@pierre/diffs';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  DEFAULT_DIFF_THEME,
  diffThemeType,
  normalizeDiffTheme,
  readDiffTheme,
  writeDiffTheme,
} from '@/lib/diff-themes';
import type { ThemeColorScheme } from '@/lib/theming/activeThemeSnapshot';

const STORAGE_KEY = 'diffTheme';

type DiffThemeContextValue = {
  theme: DiffsThemeNames;
  colorScheme: ThemeColorScheme;
  isReady: boolean;
  setTheme: (next: DiffsThemeNames) => Promise<void>;
};

const DiffThemeContext = createContext<DiffThemeContextValue | null>(null);

export function DiffThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<DiffsThemeNames>(DEFAULT_DIFF_THEME);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    readDiffTheme()
      .then((stored) => {
        setThemeState(stored);
        setIsReady(true);
      })
      .catch(() => {
        setIsReady(true);
      });
  }, []);

  useEffect(() => {
    if (!browser?.storage?.onChanged) {
      return;
    }

    const onChange = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area !== 'sync' || !changes[STORAGE_KEY]) {
        return;
      }

      setThemeState(normalizeDiffTheme(changes[STORAGE_KEY].newValue));
    };

    browser.storage.onChanged.addListener(onChange);
    return () => browser.storage.onChanged.removeListener(onChange);
  }, []);

  const setTheme = useCallback(async (next: DiffsThemeNames) => {
    setThemeState(next);
    await writeDiffTheme(next);
  }, []);

  const colorScheme = diffThemeType(theme);

  const value = useMemo(
    () => ({
      theme,
      colorScheme,
      isReady,
      setTheme,
    }),
    [theme, colorScheme, isReady, setTheme],
  );

  return <DiffThemeContext.Provider value={value}>{children}</DiffThemeContext.Provider>;
}

export function useDiffThemeContext(): DiffThemeContextValue {
  const context = useContext(DiffThemeContext);
  if (!context) {
    throw new Error('useDiffThemeContext must be used within DiffThemeProvider');
  }

  return context;
}
