import { preloadHighlighter } from '@pierre/diffs';
import { useEffect } from 'react';

import { DIFF_LANG_IDS } from '@/lib/diff/lang-ids';

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
      preferredHighlighter: 'shiki-wasm',
    });
  }, []);

  return null;
}
