import { useEffect, useState } from 'react';

import { getTreeThemeStyles } from '@/lib/resolve-diff-theme';
import { useDiffThemeContext } from '@/providers/DiffThemeProvider';

export function useTreeThemeStyles(): Record<string, string> {
  const { theme } = useDiffThemeContext();
  const [treeThemeStyles, setTreeThemeStyles] = useState<Record<string, string>>({});

  useEffect(() => {
    let isCancelled = false;

    void getTreeThemeStyles(theme)
      .then((styles) => {
        if (!isCancelled) {
          setTreeThemeStyles(styles);
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [theme]);

  return treeThemeStyles;
}

/** CSS custom properties only — safe to apply on a parent without overriding surface bg/color. */
export function pickTreeThemeCustomProperties(
  styles: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(styles).filter(
      ([key]) => key.startsWith('--trees-theme-') || key === 'colorScheme',
    ),
  );
}
