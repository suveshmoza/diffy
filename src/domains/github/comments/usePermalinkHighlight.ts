import {
  getFiletypeFromFileName,
  getSharedHighlighter,
  type ThemedToken,
  type ThemesType,
  type ThemeTypes,
} from '@pierre/diffs';
import { useEffect, useState } from 'react';

import { DIFF_HIGHLIGHTER } from '@/domains/diff/highlighting/highlighter';
import { diffThemeNames, ensureDiffThemesResolved } from '@/domains/diff/hooks/useDiffThemeReady';
import { useDiffThemeProps } from '@/domains/theming/providers/useDiffThemeProps';

function activeThemeName(theme: ThemesType, themeType: ThemeTypes): string {
  if (typeof theme === 'string') {
    return theme;
  }
  return themeType === 'dark' ? theme.dark : theme.light;
}

type HighlightResult = {
  key: string;
  tokens: ThemedToken[][];
};

function highlightKey(path: string, contents: string, themeName: string): string {
  return `${path}\0${themeName}\0${contents}`;
}

/**
 * Tokenize a permalink slice with the same highlighter/theme as Diffy diffs.
 * Returns `null` while loading or if highlighting fails (caller shows plain text).
 */
export function usePermalinkHighlight(
  path: string,
  contents: string | undefined,
): ThemedToken[][] | null {
  const diffTheme = useDiffThemeProps();
  const themeName = activeThemeName(diffTheme.theme, diffTheme.themeType);
  const key = contents == null ? null : highlightKey(path, contents, themeName);
  const [result, setResult] = useState<HighlightResult | null>(null);

  useEffect(() => {
    if (key == null || contents == null) {
      return;
    }

    let cancelled = false;
    const lang = getFiletypeFromFileName(path);

    void (async () => {
      try {
        await ensureDiffThemesResolved(diffTheme.theme);
        const highlighter = await getSharedHighlighter({
          preferredHighlighter: DIFF_HIGHLIGHTER,
          themes: diffThemeNames(diffTheme.theme),
          langs: [lang],
        });
        if (cancelled) {
          return;
        }
        const tokens = highlighter.codeToTokens(contents, {
          lang,
          theme: themeName,
        }).tokens;
        if (!cancelled) {
          setResult({ key, tokens });
        }
      } catch {
        // Leave prior result; render treats mismatched keys as unloaded.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [contents, diffTheme.theme, key, path, themeName]);

  if (key == null || result?.key !== key) {
    return null;
  }
  return result.tokens;
}
