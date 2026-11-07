import type { SupportedLanguages } from '@pierre/diffs';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { highlightCodeSource } from '@/domains/github/comments/highlight-code-source';
import { renderLineTokens, resolveDiffThemeName } from '@/domains/github/comments/themed-tokens';
import { useDiffThemeProps } from '@/domains/theming/providers/useDiffThemeProps';

type HighlightedCodeBlockProps = {
  source: string;
  language: SupportedLanguages;
  showLineNumbers?: boolean;
};

export function HighlightedCodeBlock({
  source,
  language,
  showLineNumbers = false,
}: HighlightedCodeBlockProps) {
  const diffTheme = useDiffThemeProps();
  const themeName = useMemo(
    () => resolveDiffThemeName(diffTheme.theme, diffTheme.themeType),
    [diffTheme.theme, diffTheme.themeType],
  );

  const query = useQuery({
    queryKey: ['markdown-code-highlight', language, themeName, source] as const,
    queryFn: () =>
      highlightCodeSource({
        source,
        language,
        theme: themeName,
      }),
    staleTime: 5 * 60 * 1000,
  });

  if (query.isPending) {
    return (
      <pre aria-busy='true'>
        <code>{source}</code>
      </pre>
    );
  }

  if (query.isError || query.data == null) {
    return (
      <pre>
        <code>{source}</code>
      </pre>
    );
  }

  const { lines, fg } = query.data;

  return (
    <pre style={fg != null ? { color: fg } : undefined}>
      <code>
        {showLineNumbers
          ? lines.map((tokens, index) => (
              <span
                key={index}
                className='gprv-markdown-code-line'
              >
                <span
                  className='gprv-markdown-code-gutter'
                  aria-hidden='true'
                >
                  {index + 1}
                </span>
                <span className='gprv-markdown-code-text'>{renderLineTokens(tokens)}</span>
              </span>
            ))
          : lines.map((tokens, index) => (
              <span
                key={index}
                className='gprv-markdown-code-line-plain'
              >
                {renderLineTokens(tokens)}
                {index < lines.length - 1 ? '\n' : null}
              </span>
            ))}
      </code>
    </pre>
  );
}
