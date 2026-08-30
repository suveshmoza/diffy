import type { SelectedLineRange } from '@pierre/diffs';
import { createContext, use, type ReactNode } from 'react';

import type { GitHubPullRequestRef } from '@/lib/github/api';
import type { ReviewEvent } from '@/lib/github/review-write';
import type { QueuedComment } from '@/lib/review/comment-queue';

/**
 * Batched-review (queue) state shared by every surface that touches it: the
 * header CTA, the review dock, and the inline queued-comment cards. Lifting
 * it here keeps these siblings in sync without threading the same handful of
 * handlers through `DiffOverlay` props.
 */
export interface ReviewQueueContextValue {
  pullRequestRef: GitHubPullRequestRef;
  isBatchMode: boolean;
  queue: readonly QueuedComment[];
  startReview: () => void;
  stopReview: () => void;
  queueComment: (
    itemId: string,
    path: string,
    draftId: string,
    range: SelectedLineRange,
    body: string,
  ) => void;
  removeQueued: (queuedId: string, itemId: string) => void;
  /** Removes a queued comment by id, resolving its `itemId` internally. */
  removeQueuedById: (queuedId: string) => void;
  editQueued: (queuedId: string, itemId: string, body: string) => void;
  publishReview: (event: ReviewEvent, body: string) => Promise<void>;
  discardQueue: () => void;
  isReviewDockExpanded: boolean;
  expandReviewDock: () => void;
  collapseReviewDock: () => void;
}

const ReviewQueueContext = createContext<ReviewQueueContextValue | null>(null);

export function ReviewQueueProvider({
  value,
  children,
}: {
  value: ReviewQueueContextValue;
  children: ReactNode;
}) {
  return <ReviewQueueContext.Provider value={value}>{children}</ReviewQueueContext.Provider>;
}

export function useReviewQueueContext(): ReviewQueueContextValue {
  const context = use(ReviewQueueContext);
  if (!context) {
    throw new Error('useReviewQueueContext must be used within a ReviewQueueProvider');
  }
  return context;
}
