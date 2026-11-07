import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import type { GitHubPermalink } from '@/domains/github/comments/parse-github-permalink';
import { permalinkFileQueryOptions } from '@/domains/github/comments/permalink-query';

type PermalinkCodeEmbedProps = {
  permalink: GitHubPermalink;
  fallback: ReactNode;
};

export function PermalinkCodeEmbed({ permalink, fallback }: PermalinkCodeEmbedProps) {
  const query = useQuery(permalinkFileQueryOptions(permalink));

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

  const { path, lines, startLine } = query.data;
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
      <pre className='gprv-markdown-permalink-body'>
        <code>
          {lines.map((line, index) => {
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
                <span className='gprv-markdown-permalink-text'>{line || ' '}</span>
              </span>
            );
          })}
        </code>
      </pre>
    </div>
  );
}
