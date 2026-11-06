import { preloadHighlighter } from '@pierre/diffs';
import { useEffect } from 'react';

import { DIFF_HIGHLIGHTER } from '@/domains/diff/highlighting/highlighter';
import { DIFF_LANG_IDS } from '@/domains/diff/highlighting/lang-ids';

export function PreloadHighlighter() {
  useEffect(() => {
    void preloadHighlighter({
      themes: [
        'pierre-dark',
        'pierre-dark-soft',
        'pierre-dark-vibrant',
        'pierre-light',
        'pierre-light-soft',
        'pierre-light-vibrant',
      ],
      langs: [...DIFF_LANG_IDS],
      preferredHighlighter: DIFF_HIGHLIGHTER,
    });
  }, []);

  return null;
}
