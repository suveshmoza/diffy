import { type CodeViewItem } from '@pierre/diffs';
import { describe, expect, it } from 'vitest';

import type { GitHubPullRequestReviewComment } from '../github/api';
import {
  formatReviewCommentHiddenLabel,
  getCommentAnchorLine,
  getItemPath,
  isReviewCommentHidden,
  toAnnotationSide,
} from './comments';

describe('toAnnotationSide', () => {
  it('returns deletions when side is LEFT', () => {
    expect(toAnnotationSide('LEFT')).toBe('deletions');
  });
  it('returns additions when side is RIGHT', () => {
    expect(toAnnotationSide('RIGHT')).toBe('additions');
  });
  it('returns additions when side is null', () => {
    expect(toAnnotationSide(null)).toBe('additions');
  });
});

describe('isReviewCommentHidden', () => {
  it('returns true when is_minimized is true', () => {
    expect(isReviewCommentHidden({ is_minimized: true } as GitHubPullRequestReviewComment)).toBe(
      true,
    );
  });
  it('returns true when hidden is true', () => {
    expect(isReviewCommentHidden({ hidden: true } as GitHubPullRequestReviewComment)).toBe(true);
  });
  it('returns false when both are false', () => {
    expect(
      isReviewCommentHidden({
        is_minimized: false,
        hidden: false,
      } as GitHubPullRequestReviewComment),
    ).toBe(false);
  });
  it('returns true when either is true', () => {
    expect(
      isReviewCommentHidden({
        is_minimized: true,
        hidden: false,
      } as GitHubPullRequestReviewComment),
    ).toBe(true);
    expect(
      isReviewCommentHidden({
        is_minimized: false,
        hidden: true,
      } as GitHubPullRequestReviewComment),
    ).toBe(true);
  });
  it('returns false when both are undefined', () => {
    expect(isReviewCommentHidden({} as GitHubPullRequestReviewComment)).toBe(false);
  });
});

describe('formatReviewCommentHiddenLabel', () => {
  it('returns label without reason if minimized_reason is absent or empty', () => {
    expect(
      formatReviewCommentHiddenLabel({
        minimized_reason: undefined,
      } as GitHubPullRequestReviewComment),
    ).toBe('This comment was hidden.');
    expect(
      formatReviewCommentHiddenLabel({ minimized_reason: '' } as GitHubPullRequestReviewComment),
    ).toBe('This comment was hidden.');
  });

  it('returns label with reason when minimized_reason is present', () => {
    expect(
      formatReviewCommentHiddenLabel({
        minimized_reason: 'Marked as off-topic',
      } as GitHubPullRequestReviewComment),
    ).toBe('This comment was hidden (Marked as off-topic).');
  });

  it('replaces underscores in minimized_reason with spaces', () => {
    expect(
      formatReviewCommentHiddenLabel({
        minimized_reason: 'Resolved_out_of_date',
      } as GitHubPullRequestReviewComment),
    ).toBe('This comment was hidden (Resolved out of date).');
  });
});

describe('getItemPath', () => {
  it('returns fileDiff.name for a diff-type item', () => {
    const item = {
      type: 'diff' as const,
      fileDiff: { name: 'src/foo.ts' },
    } as CodeViewItem<unknown>;
    expect(getItemPath(item)).toBe('src/foo.ts');
  });

  it('returns file.name for a file-type item', () => {
    const item = {
      type: 'file' as const,
      file: { name: 'src/bar.ts', contents: '' },
    } as CodeViewItem<unknown>;
    expect(getItemPath(item)).toBe('src/bar.ts');
  });
});

describe('getCommentAnchorLine', () => {
  it('returns start_line when it is set', () => {
    expect(getCommentAnchorLine({ start_line: 5 } as GitHubPullRequestReviewComment)).toBe(5);
  });

  it('falls through to line when start_line is null', () => {
    expect(
      getCommentAnchorLine({ start_line: null, line: 10 } as GitHubPullRequestReviewComment),
    ).toBe(10);
  });

  it('falls through to original_start_line when start_line and line are null', () => {
    expect(
      getCommentAnchorLine({
        start_line: null,
        line: null,
        original_start_line: 15,
      } as GitHubPullRequestReviewComment),
    ).toBe(15);
  });

  it('falls through to original_line when all earlier fields are null', () => {
    expect(
      getCommentAnchorLine({
        start_line: null,
        line: null,
        original_start_line: null,
        original_line: 20,
      } as GitHubPullRequestReviewComment),
    ).toBe(20);
  });

  it('returns null when all fields are null', () => {
    expect(
      getCommentAnchorLine({
        start_line: null,
        line: null,
        original_start_line: null,
        original_line: null,
      } as GitHubPullRequestReviewComment),
    ).toBeNull();
  });

  it('returns null when all fields are undefined', () => {
    expect(getCommentAnchorLine({} as GitHubPullRequestReviewComment)).toBeNull();
  });
});
