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
  error: string | null;
};

const ResolvedThemeContext = createContext<ResolvedThemeContextValue | null>(null);

const FALLBACK_THEME_NAMES: DiffsThemeNames[] = [
  'github-light',
  'github-dark',
  'pierre-light',
  'pierre-dark',
];

/** Overlay-only: resolves Shiki theme objects for chrome styling without bloating the popup bundle. */
export function ResolvedThemeProvider({ children }: { children: ReactNode }) {
  const { theme } = useDiffThemeContext();
  const [resolvedThemeDisplay, setResolvedThemeDisplay] = useState<
    ResolvedThemeDisplay | undefined
  >();
  const [error, setError] = useState<string | null>(null);
  const primaryThemeRef = { current: theme };

  useEffect(() => {
    primaryThemeRef.current = theme;
  });

  useEffect(() => {
    let isCancelled = false;

    const tryResolve = async (attemptedTheme: DiffsThemeNames, depth: number): Promise<void> => {
      try {
        const resolved = await getResolvedDiffTheme(attemptedTheme);
        if (!isCancelled) {
          setResolvedThemeDisplay({
            resolved,
            name: attemptedTheme,
            colorScheme: diffThemeType(attemptedTheme),
          });
          setError(null);
        }
      } catch (cause) {
        if (isCancelled) {
          return;
        }

        if (depth < 2) {
          const nextTheme = FALLBACK_THEME_NAMES.find((t) => t !== attemptedTheme);
          if (nextTheme) {
            return tryResolve(nextTheme, depth + 1);
          }
        }

        setError(cause instanceof Error ? cause.message : String(cause));
      }
    };

    void tryResolve(theme, 0);

    return () => {
      isCancelled = true;
    };
  }, [theme]);

  const value = useMemo(
    () => ({
      resolvedThemeDisplay,
      isResolvedThemeReady: resolvedThemeDisplay != null,
      error,
    }),
    [resolvedThemeDisplay, error],
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
