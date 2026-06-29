import type { CodeViewLineSelection } from '@pierre/diffs';
import { createContext, use, type ReactNode } from 'react';

import type { GitHubPullRequestRef, GitHubPullRequestReviewComment } from '@/lib/github/api';

/**
 * Actions shared by every review-thread surface (inline threads, orphaned
 * threads, reply/edit slots). Each action carries the `itemId` it operates on so
 * leaf components don't need pre-bound closures drilled through props.
 */
export interface ReviewThreadActions {
  openReply: (replyKey: string) => void;
  closeReply: (replyKey: string) => void;
  submitReply: (
    itemId: string,
    comment: GitHubPullRequestReviewComment,
    replyKey: string,
    isOrphaned?: boolean,
  ) => void;
  deleteComment: (
    itemId: string,
    comment: GitHubPullRequestReviewComment,
    isOrphaned?: boolean,
  ) => void | Promise<void>;
  editComment: (
    itemId: string,
    comment: GitHubPullRequestReviewComment,
    body: string,
    isOrphaned?: boolean,
  ) => void | Promise<void>;
  highlightRange: (selection: CodeViewLineSelection) => void;
  clearHighlight: () => void;
}

/** Ambient data every review surface needs but never mutates. */
export interface ReviewMeta {
  pullRequestRef: GitHubPullRequestRef;
  headSha: string;
}

export interface ReviewContextValue {
  actions: ReviewThreadActions;
  meta: ReviewMeta;
}

const ReviewContext = createContext<ReviewContextValue | null>(null);

export function ReviewProvider({
  value,
  children,
}: {
  value: ReviewContextValue;
  children: ReactNode;
}) {
  return <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>;
}

export function useReview(): ReviewContextValue {
  const context = use(ReviewContext);
  if (!context) {
    throw new Error('useReview must be used within a ReviewProvider');
  }
  return context;
}
