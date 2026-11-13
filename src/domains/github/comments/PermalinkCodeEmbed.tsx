import type { ThemedToken } from '@pierre/diffs';
import { useQuery } from '@tanstack/react-query';
import { type CSSProperties, type ReactNode, useMemo } from 'react';

import type { GitHubPermalink } from '@/domains/github/comments/parse-github-permalink';
import { permalinkFileQueryOptions } from '@/domains/github/comments/permalink-query';
import { usePermalinkHighlight } from '@/domains/github/comments/usePermalinkHighlight';

type PermalinkCodeEmbedProps = {
  permalink: GitHubPermalink;
  fallback: ReactNode;
};

const FONT_STYLE_ITALIC = 1;
const FONT_STYLE_BOLD = 2;

function tokenStyle(token: ThemedToken): CSSProperties | undefined {
  const style: CSSProperties = {};
  if (token.htmlStyle != null) {
    Object.assign(style, token.htmlStyle);
  } else {
    if (token.color != null) {
      style.color = token.color;
    }
    if (token.bgColor != null) {
      style.backgroundColor = token.bgColor;
    }
  }
  if (token.fontStyle != null) {
    if ((token.fontStyle & FONT_STYLE_ITALIC) !== 0) {
      style.fontStyle = 'italic';
    }
    if ((token.fontStyle & FONT_STYLE_BOLD) !== 0) {
      style.fontWeight = 'bold';
    }
  }
  return Object.keys(style).length > 0 ? style : undefined;
}

function PermalinkLineText({ line, tokens }: { line: string; tokens: ThemedToken[] | undefined }) {
  if (tokens == null || tokens.length === 0) {
    return <span className='gprv-markdown-permalink-text'>{line || ' '}</span>;
  }

  return (
    <span className='gprv-markdown-permalink-text'>
      {tokens.map((token, tokenIndex) => (
        <span
          key={`${token.offset}:${tokenIndex}`}
          style={tokenStyle(token)}
        >
          {token.content}
        </span>
      ))}
    </span>
  );
}

export function PermalinkCodeEmbed({ permalink, fallback }: PermalinkCodeEmbedProps) {
  const query = useQuery(permalinkFileQueryOptions(permalink));
  const contents = useMemo(
    () => (query.data != null ? query.data.lines.join('\n') : undefined),
    [query.data],
  );
  const tokenLines = usePermalinkHighlight(permalink.path, contents);

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
                <PermalinkLineText
                  line={line}
                  tokens={tokenLines?.[index]}
                />
              </span>
            );
          })}
        </code>
      </pre>
    </div>
  );
}
