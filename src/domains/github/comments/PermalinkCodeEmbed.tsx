import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useMemo } from 'react';

import type { GitHubPermalink } from '@/domains/github/comments/parse-github-permalink';
import { permalinkFileQueryOptions } from '@/domains/github/comments/permalink-query';
import { renderLineTokens, resolveDiffThemeName } from '@/domains/github/comments/themed-tokens';
import { useDiffThemeProps } from '@/domains/theming/providers/useDiffThemeProps';

type PermalinkCodeEmbedProps = {
  permalink: GitHubPermalink;
  fallback: ReactNode;
};

export function PermalinkCodeEmbed({ permalink, fallback }: PermalinkCodeEmbedProps) {
  const diffTheme = useDiffThemeProps();
  const themeName = useMemo(
    () => resolveDiffThemeName(diffTheme.theme, diffTheme.themeType),
    [diffTheme.theme, diffTheme.themeType],
  );
  const query = useQuery(permalinkFileQueryOptions(permalink, themeName));

  if (query.isPending) {
    return (
      <div
        className='gprv-markdown-permalink'
        aria-busy='true'
      >
        <div className='gprv-markdown-permalink-header'>
          <span className='gprv-markdown-permalink-path'>{permalink.path}</span>
        </div>
        <pre className='gprv-markdown-permalink-body'>
          <code>Loading…</code>
        </pre>
      </div>
    );
  }

  if (query.isError || query.data == null) {
    return <>{fallback}</>;
  }

  const { path, lines, startLine, fg } = query.data;
  const lineLabel =
    permalink.startLine === permalink.endLine
      ? `L${permalink.startLine}`
      : `L${permalink.startLine}-L${permalink.endLine}`;

  return (
    <div className='gprv-markdown-permalink'>
      <div className='gprv-markdown-permalink-header'>
        <a
          className='gprv-markdown-permalink-path'
          href={permalink.href}
          target='_blank'
          rel='noopener noreferrer'
        >
          {path}
        </a>
        <span className='gprv-markdown-permalink-lines'>{lineLabel}</span>
      </div>
      <pre
        className='gprv-markdown-permalink-body'
        style={fg != null ? { color: fg } : undefined}
      >
        <code>
          {lines.map((tokens, index) => {
            const lineNumber = startLine + index;
            return (
              <span
                key={lineNumber}
                className='gprv-markdown-permalink-line'
              >
                <span
                  className='gprv-markdown-permalink-gutter'
                  aria-hidden='true'
                >
                  {lineNumber}
                </span>
                <span className='gprv-markdown-permalink-text'>{renderLineTokens(tokens)}</span>
              </span>
            );
          })}
        </code>
      </pre>
    </div>
  );
}
