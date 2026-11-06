import type { CodeViewOptions } from '@pierre/diffs';
import { useMemo } from 'react';

import type { ReviewAnnotationMetadata } from '@/domains/review/model/comments';
import { useThemeControllerReady } from '@/domains/theming/providers/ThemeControllerProvider';
import type { CodeViewDisplayPrefs } from '@/lib/diff/display-prefs';
import type { DiffLayout } from '@/lib/diff/layout-prefs';
import { CODE_VIEW_CUSTOM_CSS } from '@/lib/diff/themes/unsafe-css';

type UseCodeViewThemeBootstrapOptions = {
  diffLayout: DiffLayout;
  displayPrefs: CodeViewDisplayPrefs;
};

export function useCodeViewThemeBootstrap({
  diffLayout,
  displayPrefs,
}: UseCodeViewThemeBootstrapOptions) {
  const { isReady: isThemeReady } = useThemeControllerReady();

  const diffStyle = diffLayout === 'switched' ? ('split' as const) : ('unified' as const);

  const { diffIndicators, hunkSeparators, disableLineNumbers, overflow, codeLineHeight } =
    displayPrefs;

  const codeViewOptions = useMemo((): Omit<
    CodeViewOptions<ReviewAnnotationMetadata, undefined>,
    'theme' | 'themeType'
  > => {
    return {
      diffStyle,
      stickyHeaders: true,
      unsafeCSS: CODE_VIEW_CUSTOM_CSS,
      layout: { paddingTop: 0, paddingBottom: 0, gap: 1 },
      diffIndicators,
      hunkSeparators,
      disableLineNumbers,
      overflow,
      itemMetrics: { lineHeight: codeLineHeight },
    };
  }, [diffStyle, diffIndicators, hunkSeparators, disableLineNumbers, overflow, codeLineHeight]);

  return {
    isThemeReady,
    codeViewOptions,
  };
}
