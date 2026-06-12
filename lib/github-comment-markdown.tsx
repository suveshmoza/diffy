import type { ReactNode } from 'react';

type MarkdownSegment =
  | { type: 'text'; content: string }
  | { type: 'code'; language: string; content: string };

export function renderGitHubCommentBody(body: string): ReactNode {
  const segments = splitFencedBlocks(body);
  if (segments.length === 0) {
    return null;
  }

  return segments.map((segment, index) => {
    if (segment.type === 'code') {
      return (
        <CommentCodeBlock
          key={`code-${index}`}
          language={segment.language}
          content={segment.content}
        />
      );
    }

    return (
      <CommentTextBlock
        key={`text-${index}`}
        content={segment.content}
      />
    );
  });
}

function CommentCodeBlock({ language, content }: { language: string; content: string }) {
  const isSuggestion = language === 'suggestion';

  return (
    <div
      className={
        isSuggestion
          ? 'gprv-review-code gprv-review-suggestion'
          : 'gprv-review-code gprv-review-code-block'
      }
    >
      {isSuggestion ? <div className='gprv-review-code-label'>Suggested change</div> : null}
      {!isSuggestion && language ? <div className='gprv-review-code-label'>{language}</div> : null}
      <pre>
        <code>{content}</code>
      </pre>
    </div>
  );
}

function CommentTextBlock({ content }: { content: string }) {
  const paragraphs = content.split(/\n{2,}/);

  return paragraphs.map((paragraph, index) => {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      return null;
    }

    if (trimmed.startsWith('> ')) {
      return (
        <blockquote
          key={`quote-${index}`}
          className='gprv-review-quote'
        >
          {renderInlineMarkdown(trimmed.replace(/^>\s?/gm, ''))}
        </blockquote>
      );
    }

    return (
      <p
        key={`p-${index}`}
        className='gprv-review-paragraph'
      >
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  });
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s<>)]+)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(...renderPlainTextWithBreaks(text.slice(lastIndex, match.index), key));
      key += 1;
    }

    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={`code-${key}`}
          className='gprv-review-inline-code'
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(<strong key={`strong-${key}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch && isSafeLinkUrl(linkMatch[2])) {
        nodes.push(
          <a
            key={`link-${key}`}
            className='gprv-review-link'
            href={linkMatch[2]}
            target='_blank'
            rel='noopener noreferrer'
          >
            {linkMatch[1]}
          </a>,
        );
      } else if (linkMatch) {
        nodes.push(linkMatch[1]);
      } else {
        nodes.push(token);
      }
    } else if (isSafeLinkUrl(token)) {
      nodes.push(
        <a
          key={`url-${key}`}
          className='gprv-review-link'
          href={token}
          target='_blank'
          rel='noopener noreferrer'
        >
          {token}
        </a>,
      );
    } else {
      nodes.push(token);
    }

    key += 1;
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(...renderPlainTextWithBreaks(text.slice(lastIndex), key));
  }

  return nodes;
}

function renderPlainTextWithBreaks(text: string, keyBase: number): ReactNode[] {
  const lines = text.split('\n');
  if (lines.length === 1) {
    return [text];
  }

  const nodes: ReactNode[] = [];
  lines.forEach((line, index) => {
    if (index > 0) {
      nodes.push(<br key={`br-${keyBase}-${index}`} />);
    }
    if (line) {
      nodes.push(line);
    }
  });

  return nodes;
}

function isSafeLinkUrl(url: string): boolean {
  try {
    const protocol = new URL(url, 'https://github.com').protocol;
    return protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:';
  } catch {
    return false;
  }
}

function splitFencedBlocks(body: string): MarkdownSegment[] {
  const segments: MarkdownSegment[] = [];
  const pattern = /```([^\n]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(body)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: body.slice(lastIndex, match.index) });
    }

    segments.push({
      type: 'code',
      language: match[1].trim(),
      content: match[2].replace(/\n$/, ''),
    });
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < body.length) {
    segments.push({ type: 'text', content: body.slice(lastIndex) });
  }

  return segments;
}
