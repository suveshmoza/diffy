import type { DiffsThemeNames } from '@pierre/diffs';
import { useEffect, useState } from 'react';

import {
  DEFAULT_DIFF_THEME,
  normalizeDiffTheme,
  readDiffTheme,
  writeDiffTheme,
} from '@/lib/diff-themes';

const STORAGE_KEY = 'diffTheme';

/** Theme hook for standalone surfaces (popup). Overlay uses DiffThemeProvider + useDiffThemeContext. */
export function useDiffTheme() {
  const [theme, setTheme] = useState<DiffsThemeNames>(DEFAULT_DIFF_THEME);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    readDiffTheme()
      .then((stored) => {
        setTheme(stored);
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

      setTheme(normalizeDiffTheme(changes[STORAGE_KEY].newValue));
    };

    browser.storage.onChanged.addListener(onChange);
    return () => browser.storage.onChanged.removeListener(onChange);
  }, []);

  return {
    theme,
    isReady,
    setTheme: async (next: DiffsThemeNames) => {
      setTheme(next);
      await writeDiffTheme(next);
    },
  };
}
