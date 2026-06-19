import { SelectionSide } from '@pierre/diffs';
import { describe, expect, it } from 'vitest';

import { GitHubPullRequestRef } from './api';
import {
  createGitHubHeaders,
  pullRequestApiBase,
  selectedRangeToCommentPayload,
  toGitHubSide,
} from './review-write';

describe('createGitHubHeaders', () => {
  it('returns default GitHub Header when token is null', () => {
    expect(createGitHubHeaders(null)).toEqual({
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    });
  });
  it('includes Authorization header when token is provided', () => {
    const token = 'gh_123';
    expect(createGitHubHeaders(token)).toEqual({
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: `Bearer ${token}`,
    });
  });
  it('does not include authorization header when token is an empty string', () => {
    const headers = createGitHubHeaders('');
    expect(headers).toEqual({
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    });
    expect(headers).not.toHaveProperty('Authorization');
  });
});

describe('pullRequestApiBase', () => {
  it('builds the correct GitHub PR API URL', () => {
    const ref: Omit<GitHubPullRequestRef, 'url'> = {
      owner: 'facebook',
      repo: 'react',
      pullNumber: 123,
    };

    expect(pullRequestApiBase(ref)).toBe('https://api.github.com/repos/facebook/react/pulls/123');
  });

  it('encodes owner and repo names', () => {
    const ref: Omit<GitHubPullRequestRef, 'url'> = {
      owner: 'my org',
      repo: 'my/repo',
      pullNumber: 42,
    };

    expect(pullRequestApiBase(ref)).toBe(
      'https://api.github.com/repos/my%20org/my%2Frepo/pulls/42',
    );
  });
});

describe('toGitHubSide', () => {
  it('returns left for deletions', () => {
    const side: SelectionSide = 'deletions';
    expect(toGitHubSide(side)).toBe('LEFT');
  });
  it('returns right for additions', () => {
    const side: SelectionSide = 'additions';
    expect(toGitHubSide(side)).toBe('RIGHT');
  });
  it('return right when side is undefined', () => {
    expect(toGitHubSide(undefined)).toBe('RIGHT');
  });
});

describe('selectedRangeToCommentPayload', () => {
  const baseInput = {
    body: 'test',
    commitId: '123',
    path: 'src/review-write.ts',
  };

  it('products a single-line payload when start equals end', () => {
    const payload = selectedRangeToCommentPayload({
      ...baseInput,
      range: { start: 5, end: 5, side: 'additions' },
    });
    expect(payload).toEqual({
      body: 'test',
      commit_id: '123',
      path: 'src/review-write.ts',
      line: 5,
      side: 'RIGHT',
    });
  });

  it('maps deletions side to LEFT for a single-line comment', () => {
    const payload = selectedRangeToCommentPayload({
      ...baseInput,
      range: { start: 5, end: 5, side: 'deletions' },
    });
    expect(payload).toEqual({
      body: 'test',
      commit_id: '123',
      path: 'src/review-write.ts',
      line: 5,
      side: 'LEFT',
    });
  });

  it('includes start_line and start_side for a multi-line comment', () => {
    const payload = selectedRangeToCommentPayload({
      ...baseInput,
      range: { start: 5, end: 10, side: 'additions' },
    });
    expect(payload).toEqual({
      body: 'test',
      commit_id: '123',
      path: 'src/review-write.ts',
      line: 10,
      side: 'RIGHT',
      start_line: 5,
      start_side: 'RIGHT',
    });
  });

  it('handles multi-line comment on deletion side', () => {
    const payload = selectedRangeToCommentPayload({
      ...baseInput,
      range: { start: 5, end: 10, side: 'deletions' },
    });
    expect(payload).toEqual({
      body: 'test',
      commit_id: '123',
      path: 'src/review-write.ts',
      line: 10,
      side: 'LEFT',
      start_line: 5,
      start_side: 'LEFT',
    });
  });
});
