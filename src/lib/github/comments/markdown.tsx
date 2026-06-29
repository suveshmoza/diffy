import MarkdownToJsx, { type MarkdownToJSX } from 'markdown-to-jsx';
import { useMemo, type ReactNode } from 'react';

import type { GitHubPullRequestRef } from '@/lib/github/api';
import { preprocessGithubCommentAutolinks } from '@/lib/github/comments/autolinks';

export type RenderGitHubCommentBodyOptions = {
  pullRequestRef?: GitHubPullRequestRef;
};

export function renderGitHubCommentBody(
  body: string,
  options?: RenderGitHubCommentBodyOptions,
): ReactNode {
  return (
    <GitHubCommentMarkdown
      body={body}
      pullRequestRef={options?.pullRequestRef}
    />
  );
}

type GitHubCommentMarkdownProps = {
  body: string;
  pullRequestRef?: GitHubPullRequestRef;
};

function GitHubCommentMarkdown({ body, pullRequestRef }: GitHubCommentMarkdownProps) {
  const trimmed = body.trim();
  const markdown = useMemo(
    () => preprocessGithubCommentAutolinks(trimmed, pullRequestRef),
    [trimmed, pullRequestRef],
  );

  if (!trimmed) {
    return null;
  }

  try {
    return (
      <MarkdownToJsx
        className='gprv-review-prose'
        options={MARKDOWN_OPTIONS}
      >
        {markdown}
      </MarkdownToJsx>
    );
  } catch {
    return (
      <div className='gprv-review-prose'>
        <p className='gprv-review-paragraph'>{body}</p>
      </div>
    );
  }
}

const MARKDOWN_OPTIONS: MarkdownToJSX.Options = {
  disableParsingRawHTML: false,
  forceBlock: true,
  overrides: {
    p: {
      component: 'p',
      props: { className: 'gprv-review-paragraph' },
    },
    em: {
      component: 'em',
      props: { className: 'gprv-review-em' },
    },
    del: {
      component: 'del',
      props: { className: 'gprv-review-strikethrough' },
    },
    a: {
      component: SafeMarkdownLink,
    },
    blockquote: {
      component: 'blockquote',
      props: { className: 'gprv-review-quote' },
    },
    ul: {
      component: 'ul',
      props: { className: 'gprv-review-list gprv-review-list-unordered' },
    },
    ol: {
      component: 'ol',
      props: { className: 'gprv-review-list gprv-review-list-ordered' },
    },
    li: {
      component: 'li',
      props: { className: 'gprv-review-list-item' },
    },
    h1: {
      component: 'h1',
      props: { className: 'gprv-review-heading gprv-review-heading-h1' },
    },
    h2: {
      component: 'h2',
      props: { className: 'gprv-review-heading gprv-review-heading-h2' },
    },
    h3: {
      component: 'h3',
      props: { className: 'gprv-review-heading gprv-review-heading-h3' },
    },
    h4: {
      component: 'h4',
      props: { className: 'gprv-review-heading gprv-review-heading-h4' },
    },
    h5: {
      component: 'h5',
      props: { className: 'gprv-review-heading gprv-review-heading-h5' },
    },
    h6: {
      component: 'h6',
      props: { className: 'gprv-review-heading gprv-review-heading-h6' },
    },
    hr: {
      component: 'hr',
      props: { className: 'gprv-review-divider' },
    },
    table: {
      component: MarkdownTable,
    },
    thead: {
      component: 'thead',
      props: { className: 'gprv-review-table-head' },
    },
    tbody: {
      component: 'tbody',
      props: { className: 'gprv-review-table-body' },
    },
    tr: {
      component: 'tr',
      props: { className: 'gprv-review-table-row' },
    },
    th: {
      component: 'th',
      props: { className: 'gprv-review-table-cell gprv-review-table-header-cell' },
    },
    td: {
      component: 'td',
      props: { className: 'gprv-review-table-cell' },
    },
    img: {
      component: SafeMarkdownImage,
    },
    input: {
      component: MarkdownTaskCheckbox,
    },
    code: {
      component: MarkdownCode,
    },
    pre: {
      component: MarkdownPre,
    },
    details: {
      component: 'details',
      props: { className: 'gprv-review-details' },
    },
    summary: {
      component: 'summary',
      props: { className: 'gprv-review-summary' },
    },
  },
};

function SafeMarkdownLink({
  href,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (!href || !isSafeLinkUrl(href)) {
    return <span>{children}</span>;
  }

  return (
    <a
      className='gprv-review-link'
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      {...props}
    >
      {children}
    </a>
  );
}

function SafeMarkdownImage({
  src,
  alt,
  width: _width,
  height: _height,
  style: _style,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  if (!src || !isSafeImageUrl(src)) {
    return null;
  }

  return (
    <span className='gprv-review-image-wrap'>
      <img
        className='gprv-review-image'
        src={src}
        alt={alt ?? ''}
        loading='lazy'
        decoding='async'
        {...props}
      />
    </span>
  );
}

function MarkdownTaskCheckbox({
  type,
  checked,
  disabled,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  if (type !== 'checkbox') {
    return null;
  }

  return (
    <input
      className='gprv-review-task-checkbox'
      type='checkbox'
      checked={checked}
      disabled={disabled ?? true}
      readOnly
      {...props}
    />
  );
}

function MarkdownTable({ children }: { children?: ReactNode }) {
  return (
    <div className='gprv-review-table-wrap'>
      <table className='gprv-review-table'>{children}</table>
    </div>
  );
}

function MarkdownPre({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

function MarkdownCode({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
  const language = getCodeLanguage(className);
  const rawContent = String(children);
  const content = rawContent.replace(/\n$/, '');
  const isFenced = language != null || rawContent.includes('\n');

  if (!isFenced) {
    return (
      <code
        className='gprv-review-inline-code'
        {...props}
      >
        {children}
      </code>
    );
  }

  return (
    <CommentCodeBlock
      language={language ?? ''}
      content={content}
    />
  );
}

function CommentCodeBlock({ language, content }: { language: string; content: string }) {
  const isSuggestion = language === 'suggestion';
  const normalizedContent = isSuggestion ? normalizeSuggestionContent(content) : content;

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
        <code>{normalizedContent}</code>
      </pre>
    </div>
  );
}

function normalizeSuggestionContent(content: string): string {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
  if (nonEmptyLines.length === 0) {
    return '';
  }

  const minIndent = Math.min(
    ...nonEmptyLines.map((line) => line.match(/^[\t ]*/)?.[0].length ?? 0),
  );

  return lines
    .map((line) => (line.trim().length === 0 ? '' : line.slice(minIndent)))
    .join('\n')
    .trimEnd();
}

function getCodeLanguage(className?: string): string | null {
  if (!className) {
    return null;
  }

  const match = /(?:lang(?:uage)?-)(\S+)/.exec(className);
  return match?.[1] ?? null;
}

function isSafeLinkUrl(url: string): boolean {
  try {
    const protocol = new URL(url, 'https://github.com').protocol;
    return protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:';
  } catch {
    return false;
  }
}

function isSafeImageUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}
