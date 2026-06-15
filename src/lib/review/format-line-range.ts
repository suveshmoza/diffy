import type { SelectedLineRange } from '@pierre/diffs';

import type { GitHubPullRequestReviewComment } from '@/lib/github/api';

import { toAnnotationSide } from './comments';

function formatLineSpan(start: number, end: number): string {
  if (start === end) {
    return `Line ${start}`;
  }

  return `Lines ${start}–${end}`;
}

function formatSideHint(side: SelectedLineRange['side']): string | null {
  if (side === 'deletions') {
    return 'deleted';
  }

  if (side === 'additions') {
    return 'added';
  }

  return null;
}

export function formatSelectedLineRangeLabel(range: SelectedLineRange): string {
  const start = Math.min(range.start, range.end);
  const end = Math.max(range.start, range.end);
  const label = formatLineSpan(start, end);

  const firstSide = range.side;
  const lastSide = range.endSide ?? firstSide;
  if (!firstSide || !lastSide || firstSide === lastSide) {
    return label;
  }

  const startHint = formatSideHint(firstSide);
  const endHint = formatSideHint(lastSide);
  if (!startHint || !endHint) {
    return label;
  }

  return `${label} (${startHint} to ${endHint})`;
}

export function formatReviewCommentLineLabel(
  comment: GitHubPullRequestReviewComment,
): string | null {
  const endLine = comment.line ?? comment.original_line;
  if (endLine == null) {
    return null;
  }

  const startLine = comment.start_line ?? comment.original_start_line;
  if (startLine != null && startLine !== endLine) {
    const start = Math.min(startLine, endLine);
    const end = Math.max(startLine, endLine);
    return formatLineSpan(start, end);
  }

  return formatLineSpan(endLine, endLine);
}

export function reviewCommentToSelectedLineRange(
  comment: GitHubPullRequestReviewComment,
): SelectedLineRange | null {
  const endLine = comment.line ?? comment.original_line;
  if (endLine == null) {
    return null;
  }

  const rawStart = comment.start_line ?? comment.original_start_line;
  const start = rawStart ?? endLine;
  const side = toAnnotationSide(comment.side);
  const range: SelectedLineRange = {
    start: Math.min(start, endLine),
    end: Math.max(start, endLine),
    side,
  };

  if (range.start !== range.end) {
    range.endSide = side;
  }

  return range;
}
