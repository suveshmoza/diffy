import { describe, expect, it } from 'vitest';

import type { GitHubPullRequestReviewComment } from '@/lib/github/api';

import { formatQuoteReplyPrefill } from './format-quote-reply';

describe('formatQuoteReplyPrefill', () => {
  it('prefixes each line with "> " for a multiline comment', () => {
    const result = formatQuoteReplyPrefill({
      body: 'line1\nline2\nline3',
    } as GitHubPullRequestReviewComment);
    expect(result).toBe('> line1\n> line2\n> line3\n\n ');
  });

  it('handles a single-line comment', () => {
    const result = formatQuoteReplyPrefill({
      body: 'just one line',
    } as GitHubPullRequestReviewComment);
    expect(result).toBe('> just one line\n\n ');
  });

  it('normalizes \\r\\n to \\n', () => {
    const result = formatQuoteReplyPrefill({
      body: 'a\r\nb\r\nc',
    } as GitHubPullRequestReviewComment);
    expect(result).toBe('> a\n> b\n> c\n\n ');
  });

  it('handles an empty body', () => {
    const result = formatQuoteReplyPrefill({ body: '' } as GitHubPullRequestReviewComment);
    expect(result).toBe('> \n\n ');
  });

  it('always appends the trailing newlines and space', () => {
    const result = formatQuoteReplyPrefill({ body: 'x' } as GitHubPullRequestReviewComment);
    expect(result).toMatch(/\n\n $/);
  });
});
