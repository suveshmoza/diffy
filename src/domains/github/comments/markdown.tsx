import { useMemo, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import type { GitHubPullRequestRef } from '@/domains/github/api';
import { preprocessGithubCommentAutolinks } from '@/domains/github/comments/autolinks';
import { parseGitHubPermalink } from '@/domains/github/comments/parse-github-permalink';
import { PermalinkCodeEmbed } from '@/domains/github/comments/PermalinkCodeEmbed';

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

  return (
    <div className='markdown-body gprv-markdown'>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={MARKDOWN_COMPONENTS}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

/** Only security + GitHub suggestion UX — styling comes from github-markdown-css. */
const MARKDOWN_COMPONENTS: Components = {
  a: SafeMarkdownLink,
  img: SafeMarkdownImage,
  input: MarkdownTaskCheckbox,
  pre: MarkdownPre,
  code: MarkdownCode,
};

function SafeMarkdownLink({
  href,
  children,
  node: _node,
  ...props
}: React.ComponentPropsWithoutRef<'a'> & { node?: unknown }) {
  if (!href || !isSafeLinkUrl(href)) {
    return <span>{children}</span>;
  }

  const link = (
    <a
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      {...props}
    >
      {children}
    </a>
  );

  const permalink = parseGitHubPermalink(href);
  if (!permalink) {
    return link;
  }

  return (
    <PermalinkCodeEmbed
      permalink={permalink}
      fallback={link}
    />
  );
}

function SafeMarkdownImage({
  src,
  alt,
  width: _width,
  height: _height,
  style: _style,
  node: _node,
  ...props
}: React.ComponentPropsWithoutRef<'img'> & { node?: unknown }) {
  if (!src || !isSafeImageUrl(src)) {
    return null;
  }

  return (
    <img
      src={src}
      alt={alt ?? ''}
      loading='lazy'
      decoding='async'
      {...props}
    />
  );
}

function MarkdownTaskCheckbox({
  type,
  checked,
  disabled,
  node: _node,
  ...props
}: React.ComponentPropsWithoutRef<'input'> & { node?: unknown }) {
  if (type !== 'checkbox') {
    return null;
  }

  return (
    <input
      type='checkbox'
      checked={checked}
      disabled={disabled ?? true}
      readOnly
      {...props}
    />
  );
}

function MarkdownPre({ children }: { children?: ReactNode; node?: unknown }) {
  return <>{children}</>;
}

function MarkdownCode({
  className,
  children,
  node: _node,
  ...props
}: React.ComponentPropsWithoutRef<'code'> & { node?: unknown }) {
  const language = getCodeLanguage(className);
  const rawContent = String(children);
  const content = rawContent.replace(/\n$/, '');
  const isFenced = language != null || rawContent.includes('\n');

  if (!isFenced) {
    return (
      <code
        className={className}
        {...props}
      >
        {children}
      </code>
    );
  }

  if (language === 'suggestion') {
    return (
      <div className='gprv-markdown-suggestion'>
        <div className='gprv-markdown-suggestion-label'>Suggested change</div>
        <pre>
          <code>{normalizeSuggestionContent(content)}</code>
        </pre>
      </div>
    );
  }

  return (
    <pre>
      <code className={className}>{content}</code>
    </pre>
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
