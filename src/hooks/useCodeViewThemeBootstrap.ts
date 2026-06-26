import type { CodeViewOptions } from '@pierre/diffs';
import { useEffect, useMemo, useState } from 'react';

import type { CodeViewDisplayPrefs } from '@/lib/diff/display-prefs';
import type { DiffLayout } from '@/lib/diff/layout-prefs';
import {
  buildCodeViewUnsafeCss,
  buildFallbackCodeViewUnsafeCss,
} from '@/lib/diff/themes/unsafe-css';
import type { ReviewAnnotationMetadata } from '@/lib/review/comments';
import { useThemeControllerReady } from '@/providers/theming/ThemeControllerProvider';
import { useDiffThemeProps } from '@/providers/theming/useDiffThemeProps';
import { useThemeSource } from '@/providers/theming/useThemeSource';

type UseCodeViewThemeBootstrapOptions = {
  diffLayout: DiffLayout;
  displayPrefs: CodeViewDisplayPrefs;
};

export function useCodeViewThemeBootstrap({
  diffLayout,
  displayPrefs,
}: UseCodeViewThemeBootstrapOptions) {
  const { isReady: isThemeReady } = useThemeControllerReady();
  const { activeTheme } = useThemeSource();
  const diffTheme = useDiffThemeProps();
  const [unsafeCss, setUnsafeCss] = useState(() =>
    buildFallbackCodeViewUnsafeCss(activeTheme.colorScheme),
  );

  useEffect(() => {
    setUnsafeCss(buildFallbackCodeViewUnsafeCss(activeTheme.colorScheme));

    if (activeTheme.theme == null) {
      return;
    }

    setUnsafeCss(buildCodeViewUnsafeCss(activeTheme.theme, activeTheme.colorScheme));
  }, [activeTheme.theme, activeTheme.colorScheme]);

  const diffStyle = diffLayout === 'switched' ? ('split' as const) : ('unified' as const);

  const { diffIndicators, hunkSeparators, disableLineNumbers, overflow } = displayPrefs;

  const codeViewOptions = useMemo((): CodeViewOptions<ReviewAnnotationMetadata> => {
    return {
      theme: diffTheme.theme,
      themeType: diffTheme.themeType,
      diffStyle,
      stickyHeaders: true,
      unsafeCSS: unsafeCss,
      layout: { paddingTop: 0, paddingBottom: 0, gap: 1 },
      diffIndicators,
      hunkSeparators,
      disableLineNumbers,
      overflow,
    };
  }, [
    diffTheme.theme,
    diffTheme.themeType,
    unsafeCss,
    diffStyle,
    diffIndicators,
    hunkSeparators,
    disableLineNumbers,
    overflow,
  ]);

  return {
    isThemeReady,
    codeViewOptions,
    codeViewThemeType: diffTheme.themeType,
  };
}
