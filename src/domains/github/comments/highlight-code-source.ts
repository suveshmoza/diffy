import {
  canUseWASM,
  getFiletypeFromFileName,
  getSharedHighlighter,
  type DiffsThemeNames,
  type HighlighterTypes,
  type SupportedLanguages,
  type ThemedToken,
  type TokensResult,
} from '@pierre/diffs';

/** Must match `DIFF_HIGHLIGHTER` in the diff domain (one backend per realm). */
const PREFERRED_HIGHLIGHTER: HighlighterTypes = canUseWASM() ? 'highlights' : 'shiki-js';

export type HighlightedCodeSource = {
  lines: readonly (readonly ThemedToken[])[];
  fg?: string;
};

/**
 * Resolve a markdown fence language (or suggestion) to a Pierre language id.
 * Suggestions and missing fences fall back to the comment file path, then `text`.
 */
export function resolveMarkdownHighlightLanguage(
  fenceLanguage: string | null | undefined,
  filePath?: string,
): SupportedLanguages {
  if (fenceLanguage != null && fenceLanguage !== 'suggestion' && fenceLanguage.length > 0) {
    const fromExtension = getFiletypeFromFileName(`file.${fenceLanguage}`);
    if (fromExtension !== 'text' || fenceLanguage === 'text' || fenceLanguage === 'txt') {
      return fromExtension;
    }
    // Bare language ids (`typescript`, `javascript`, …). Unknown ids tokenize as plain text.
    return fenceLanguage as SupportedLanguages;
  }

  if (filePath != null && filePath.length > 0) {
    return getFiletypeFromFileName(filePath);
  }

  return 'text';
}

export async function highlightCodeSource(options: {
  source: string;
  language: SupportedLanguages;
  theme: DiffsThemeNames;
}): Promise<HighlightedCodeSource> {
  const highlighter = await getSharedHighlighter({
    preferredHighlighter: PREFERRED_HIGHLIGHTER,
    themes: [options.theme],
    langs: [options.language],
  });

  const result: TokensResult = highlighter.codeToTokens(options.source, {
    lang: options.language,
    theme: options.theme,
  });

  return {
    lines: result.tokens,
    ...(result.fg != null ? { fg: result.fg } : {}),
  };
}

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
}): Promise<{
  lines: readonly (readonly ThemedToken[])[];
  startLine: number;
  endLine: number;
  fg?: string;
}> {
  const language = getFiletypeFromFileName(options.path);
  const highlighted = await highlightCodeSource({
    source: options.source,
    language,
    theme: options.theme,
  });

  const startIndex = Math.max(0, options.startLine - 1);
  const endIndex = Math.min(highlighted.lines.length, options.endLine);
  const lines = highlighted.lines.slice(startIndex, endIndex);

  if (lines.length === 0) {
    throw new Error('Highlighted line range is outside the file');
  }

  return {
    lines,
    startLine: startIndex + 1,
    endLine: startIndex + lines.length,
    ...(highlighted.fg != null ? { fg: highlighted.fg } : {}),
  };
}
