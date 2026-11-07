import { preloadHighlighter } from '@pierre/diffs';
import { useEffect } from 'react';

import { DIFF_HIGHLIGHTER } from '@/domains/diff/highlighting/highlighter';
import { DIFF_LANG_IDS } from '@/domains/diff/highlighting/lang-ids';
import { DIFF_THEME_IDS } from '@/domains/theming/model/theme-ids';

export function PreloadHighlighter() {
  useEffect(() => {
    void preloadHighlighter({
      themes: [...DIFF_THEME_IDS],
      langs: [...DIFF_LANG_IDS],
      preferredHighlighter: DIFF_HIGHLIGHTER,
    });
  }, []);

  return null;
}
