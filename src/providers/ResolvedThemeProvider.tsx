import type { DiffsThemeNames } from '@pierre/diffs';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { diffThemeType } from '@/lib/diff/themes/prefs';
import { getResolvedDiffTheme, type ResolvedDiffTheme } from '@/lib/diff/themes/resolve';
import type { ThemeColorScheme } from '@/lib/theming/activeThemeSnapshot';
import { useDiffThemeContext } from '@/providers/DiffThemeProvider';

export type ResolvedThemeDisplay = {
  resolved: ResolvedDiffTheme;
  name: DiffsThemeNames;
  colorScheme: ThemeColorScheme;
};

type ResolvedThemeContextValue = {
  resolvedThemeDisplay: ResolvedThemeDisplay | undefined;
  isResolvedThemeReady: boolean;
};

const ResolvedThemeContext = createContext<ResolvedThemeContextValue | null>(null);

/** Overlay-only: resolves Shiki theme objects for chrome styling without bloating the popup bundle. */
export function ResolvedThemeProvider({ children }: { children: ReactNode }) {
  const { theme } = useDiffThemeContext();
  const [resolvedThemeDisplay, setResolvedThemeDisplay] = useState<
    ResolvedThemeDisplay | undefined
  >();

  useEffect(() => {
    let isCancelled = false;

    void getResolvedDiffTheme(theme)
      .then((resolved) => {
        if (!isCancelled) {
          setResolvedThemeDisplay({
            resolved,
            name: theme,
            colorScheme: diffThemeType(theme),
          });
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [theme]);

  const value = useMemo(
    () => ({
      resolvedThemeDisplay,
      isResolvedThemeReady: resolvedThemeDisplay != null,
    }),
    [resolvedThemeDisplay],
  );

  return <ResolvedThemeContext.Provider value={value}>{children}</ResolvedThemeContext.Provider>;
}

export function useResolvedThemeContext(): ResolvedThemeContextValue {
  const context = useContext(ResolvedThemeContext);
  if (!context) {
    throw new Error('useResolvedThemeContext must be used within ResolvedThemeProvider');
  }

  return context;
}
