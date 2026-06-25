import type { SelectedLineRange } from '@pierre/diffs';

import type { BatchedReviewComment } from '@/lib/github/review-write';

/** A locally-queued inline comment, held in diffy until the review is published. */
export type QueuedComment = {
  queuedId: string;
  itemId: string;
  path: string;
  range: SelectedLineRange;
  body: string;
};

export function toBatchedReviewComments(queue: readonly QueuedComment[]): BatchedReviewComment[] {
  return queue.map((entry) => ({
    path: entry.path,
    range: entry.range,
    body: entry.body,
  }));
}
