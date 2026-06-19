import { describe, expect, it } from 'vitest';

import type { GitHubPullRequestReviewComment } from '@/lib/github/api';

import {
  formatReviewCommentLineLabel,
  formatSelectedLineRangeLabel,
  reviewCommentToSelectedLineRange,
} from './format-line-range';

describe('formatSelectedLineRangeLabel', () => {
  it('returns "Line X" for a single line range', () => {
    expect(formatSelectedLineRangeLabel({ start: 5, end: 5 })).toBe('Line 5');
  });

  it('returns "Lines X–Y" for a multi-line range', () => {
    expect(formatSelectedLineRangeLabel({ start: 3, end: 8 })).toBe('Lines 3–8');
  });

  it('sorts start and end so lower number always comes first', () => {
    expect(formatSelectedLineRangeLabel({ start: 10, end: 2 })).toBe('Lines 2–10');
  });

  it('omits side hint when side is not set', () => {
    expect(formatSelectedLineRangeLabel({ start: 1, end: 4 })).toBe('Lines 1–4');
  });

  it('omits side hint when endSide matches side', () => {
    expect(
      formatSelectedLineRangeLabel({ start: 1, end: 4, side: 'additions', endSide: 'additions' }),
    ).toBe('Lines 1–4');
  });

  it('omits side hint when endSide is not set (falls back to side)', () => {
    expect(formatSelectedLineRangeLabel({ start: 1, end: 4, side: 'deletions' })).toBe('Lines 1–4');
  });

  it('includes side hint when side and endSide differ', () => {
    expect(
      formatSelectedLineRangeLabel({ start: 5, end: 10, side: 'deletions', endSide: 'additions' }),
    ).toBe('Lines 5–10 (deleted to added)');
  });
});

describe('formatReviewCommentLineLabel', () => {
  it('returns null when line and original_line are both null', () => {
    expect(
      formatReviewCommentLineLabel({
        line: null,
        original_line: null,
      } as GitHubPullRequestReviewComment),
    ).toBeNull();
  });

  it('returns "Line X" for a single-line comment using line', () => {
    expect(formatReviewCommentLineLabel({ line: 42 } as GitHubPullRequestReviewComment)).toBe(
      'Line 42',
    );
  });

  it('falls back to original_line when line is null', () => {
    expect(
      formatReviewCommentLineLabel({
        line: null,
        original_line: 7,
      } as GitHubPullRequestReviewComment),
    ).toBe('Line 7');
  });

  it('returns "Lines X–Y" for a multi-line comment using start_line', () => {
    expect(
      formatReviewCommentLineLabel({ line: 20, start_line: 15 } as GitHubPullRequestReviewComment),
    ).toBe('Lines 15–20');
  });

  it('falls back to original_start_line when start_line is null', () => {
    expect(
      formatReviewCommentLineLabel({
        line: 30,
        start_line: null,
        original_start_line: 25,
      } as GitHubPullRequestReviewComment),
    ).toBe('Lines 25–30');
  });

  it('sorts start and end for multi-line when start is larger', () => {
    expect(
      formatReviewCommentLineLabel({ line: 10, start_line: 20 } as GitHubPullRequestReviewComment),
    ).toBe('Lines 10–20');
  });
});

describe('reviewCommentToSelectedLineRange', () => {
  it('returns null when line and original_line are both null', () => {
    expect(
      reviewCommentToSelectedLineRange({
        line: null,
        original_line: null,
      } as GitHubPullRequestReviewComment),
    ).toBeNull();
  });

  it('returns a single-line range from line', () => {
    const result = reviewCommentToSelectedLineRange({
      line: 14,
      side: null,
    } as GitHubPullRequestReviewComment);
    expect(result).toEqual({ start: 14, end: 14, side: 'additions' });
  });

  it('falls back to original_line when line is null', () => {
    const result = reviewCommentToSelectedLineRange({
      line: null,
      original_line: 5,
      side: null,
    } as GitHubPullRequestReviewComment);
    expect(result).toEqual({ start: 5, end: 5, side: 'additions' });
  });

  it('maps LEFT side to deletions', () => {
    const result = reviewCommentToSelectedLineRange({
      line: 3,
      side: 'LEFT',
    } as GitHubPullRequestReviewComment);
    expect(result).toEqual({ start: 3, end: 3, side: 'deletions' });
  });

  it('returns a multi-line range with endSide when start_line differs', () => {
    const result = reviewCommentToSelectedLineRange({
      line: 20,
      start_line: 15,
      side: 'LEFT',
    } as GitHubPullRequestReviewComment);
    expect(result).toEqual({ start: 15, end: 20, side: 'deletions', endSide: 'deletions' });
  });

  it('falls back to original_start_line when start_line is null', () => {
    const result = reviewCommentToSelectedLineRange({
      line: 50,
      start_line: null,
      original_start_line: 40,
      side: null,
    } as GitHubPullRequestReviewComment);
    expect(result).toEqual({ start: 40, end: 50, side: 'additions', endSide: 'additions' });
  });

  it('sorts start and end so lower number comes first', () => {
    const result = reviewCommentToSelectedLineRange({
      line: 5,
      start_line: 10,
      side: null,
    } as GitHubPullRequestReviewComment);
    expect(result).toEqual({ start: 5, end: 10, side: 'additions', endSide: 'additions' });
  });
});
