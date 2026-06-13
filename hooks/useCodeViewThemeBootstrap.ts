import type { CodeViewOptions } from '@pierre/diffs';
import { useEffect, useMemo, useState } from 'react';

import type { DiffLayout } from '@/lib/diff-layout-prefs';
import { diffThemeType } from '@/lib/diff-themes';
import { getCodeViewUnsafeCss, getFallbackCodeViewUnsafeCss } from '@/lib/resolve-diff-theme';
import type { ReviewCommentThreadMetadata } from '@/lib/review-comments';
import { useDiffThemeContext } from '@/providers/DiffThemeProvider';

type UseCodeViewThemeBootstrapOptions = {
  diffLayout: DiffLayout;
};

export function useCodeViewThemeBootstrap({ diffLayout }: UseCodeViewThemeBootstrapOptions) {
  const { theme, isReady: isThemeReady } = useDiffThemeContext();
  const [unsafeCss, setUnsafeCss] = useState(() => getFallbackCodeViewUnsafeCss(theme));

  useEffect(() => {
    setUnsafeCss(getFallbackCodeViewUnsafeCss(theme));

    let isCancelled = false;
    void getCodeViewUnsafeCss(theme).then((resolved) => {
      if (!isCancelled) {
        setUnsafeCss(resolved);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [theme]);

  const diffStyle = diffLayout === 'switched' ? ('split' as const) : ('unified' as const);

  const codeViewOptions = useMemo((): CodeViewOptions<ReviewCommentThreadMetadata> => {
    return {
      theme,
      themeType: diffThemeType(theme),
      diffStyle,
      stickyHeaders: true,
      unsafeCSS: unsafeCss,
      layout: { paddingTop: 0, paddingBottom: 0, gap: 0 },
    };
  }, [theme, unsafeCss, diffStyle]);

  const codeViewThemeType = diffThemeType(theme);

  return {
    theme,
    isThemeReady,
    codeViewOptions,
    codeViewThemeType,
  };
}
