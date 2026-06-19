import { describe, expect, it } from 'vitest';

import type { GitHubPullRequestRef } from '@/lib/github/api';

import { preprocessGithubCommentAutolinks } from './autolinks';

const ref: GitHubPullRequestRef = {
  owner: 'test-owner',
  repo: 'test-repo',
  pullNumber: 42,
  url: '',
};

describe('preprocessGithubCommentAutolinks', () => {
  it('replaces @mentions with markdown links', () => {
    expect(preprocessGithubCommentAutolinks('Hello @user!')).toBe(
      'Hello [@user](https://github.com/user)!',
    );
  });

  it('replaces multiple @mentions', () => {
    expect(preprocessGithubCommentAutolinks('@a and @b')).toBe(
      '[@a](https://github.com/a) and [@b](https://github.com/b)',
    );
  });

  it('replaces #issue refs when pullRequestRef is provided', () => {
    expect(preprocessGithubCommentAutolinks('Fix #123', ref)).toBe(
      'Fix [#123](https://github.com/test-owner/test-repo/issues/123)',
    );
  });

  it('does not replace #issue refs when pullRequestRef is omitted', () => {
    expect(preprocessGithubCommentAutolinks('Fix #123')).toBe('Fix #123');
  });

  it('does not process content inside fenced code blocks', () => {
    const input = 'Text\n```\n@user #123\n```\nEnd';
    expect(preprocessGithubCommentAutolinks(input, ref)).toBe(input);
  });

  it('does not process content inside inline code', () => {
    const input = 'See `@user #123` for details';
    expect(preprocessGithubCommentAutolinks(input, ref)).toBe(input);
  });

  it('processes text outside but not inside code fences', () => {
    const result = preprocessGithubCommentAutolinks('@user\n```\n@other\n```\n#42', ref);
    expect(result).toContain('[@user](https://github.com/user)');
    expect(result).toContain('@other');
    expect(result).toContain('[#42](https://github.com/test-owner/test-repo/issues/42)');
  });

  it('does not match @mention in markdown link label', () => {
    // The regex uses (?<![[`\\w]) so @ inside a link label [[ is not matched
    expect(preprocessGithubCommentAutolinks('[[@user]]')).toBe('[[@user]]');
  });

  it('returns empty string unchanged', () => {
    expect(preprocessGithubCommentAutolinks('')).toBe('');
  });

  it('returns text with no matches unchanged', () => {
    expect(preprocessGithubCommentAutolinks('Just some text')).toBe('Just some text');
  });

  it('handles @mention adjacent to punctuation', () => {
    expect(preprocessGithubCommentAutolinks('(@user)')).toBe('([@user](https://github.com/user))');
  });

  it('URL-encodes owner and repo in issue links', () => {
    const specialRef: GitHubPullRequestRef = {
      owner: 'o wner',
      repo: 'r/o',
      pullNumber: 1,
      url: '',
    };
    expect(preprocessGithubCommentAutolinks('#1', specialRef)).toBe(
      '[#1](https://github.com/o%20wner/r%2Fo/issues/1)',
    );
  });
});
