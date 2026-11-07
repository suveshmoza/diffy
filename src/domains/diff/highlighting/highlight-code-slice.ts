import {
  getFiletypeFromFileName,
  getSharedHighlighter,
  type DiffsThemeNames,
  type ThemedToken,
} from '@pierre/diffs';

import { DIFF_HIGHLIGHTER } from '@/domains/diff/highlighting/highlighter';

export type HighlightedCodeSlice = {
  lines: readonly (readonly ThemedToken[])[];
  startLine: number;
  endLine: number;
  fg?: string;
};

/**
 * Highlight a full file, then return tokens for an inclusive 1-based line range.
 * Full-file tokenization keeps lexer state correct for mid-file slices.
 */
export async function highlightCodeSlice(options: {
  source: string;
  path: string;
  startLine: number;
  endLine: number;
  theme: DiffsThemeNames;
}): Promise<HighlightedCodeSlice> {
  const lang = getFiletypeFromFileName(options.path);
  const highlighter = await getSharedHighlighter({
    preferredHighlighter: DIFF_HIGHLIGHTER,
    themes: [options.theme],
    langs: [lang],
  });

  const result = highlighter.codeToTokens(options.source, {
    lang,
    theme: options.theme,
  });

  const startIndex = Math.max(0, options.startLine - 1);
  const endIndex = Math.min(result.tokens.length, options.endLine);
  const lines = result.tokens.slice(startIndex, endIndex);

  if (lines.length === 0) {
    throw new Error('Highlighted line range is outside the file');
  }

  return {
    lines,
    startLine: startIndex + 1,
    endLine: startIndex + lines.length,
    ...(result.fg != null ? { fg: result.fg } : {}),
  };
}
