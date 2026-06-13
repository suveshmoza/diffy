import type { CodeViewLineSelection, LineAnnotation } from '@pierre/diffs';
import { memo, useMemo } from 'react';

import type { GitHubPullRequestRef, GitHubPullRequestReviewComment } from '@/lib/github';
import type { GitHubViewer } from '@/lib/github-review-write';
import type { ReviewThreadMetadata } from '@/lib/review-comments';

import { ReviewCommentThread } from './ReviewCommentThread';

type OrphanedReviewCommentsBadgeProps = {
  threads: ReviewThreadMetadata[];
  itemId: string;
  pullRequestRef: GitHubPullRequestRef;
  viewerUser: GitHubViewer | null;
  hasToken: boolean;
  onReplyOpen: (replyKey: string) => void;
  onReplyClose: (replyKey: string) => void;
  onReplySuccess: (comment: GitHubPullRequestReviewComment, replyKey: string) => void;
  onDelete: (comment: GitHubPullRequestReviewComment) => void | Promise<void>;
  onEdit: (comment: GitHubPullRequestReviewComment, body: string) => void | Promise<void>;
  onHighlightRange: (selection: CodeViewLineSelection) => void;
  onClearHighlight: () => void;
};

export const OrphanedReviewCommentsBadge = memo(function OrphanedReviewCommentsBadge({
  threads,
  itemId,
  pullRequestRef,
  viewerUser,
  hasToken,
  onReplyOpen,
  onReplyClose,
  onReplySuccess,
  onDelete,
  onEdit,
  onHighlightRange,
  onClearHighlight,
}: OrphanedReviewCommentsBadgeProps) {
  const threadAnnotations = useMemo(
    () =>
      threads.map((thread) => ({
        thread,
        annotation: {
          lineNumber: thread.comments[0]?.line ?? thread.comments[0]?.original_line ?? 0,
          metadata: thread,
        } satisfies LineAnnotation<ReviewThreadMetadata>,
      })),
    [threads],
  );

  const commentCount = threads.reduce((total, thread) => total + thread.comments.length, 0);
  if (commentCount === 0) {
    return null;
  }

  const label = commentCount === 1 ? 'outdated comment' : 'outdated comments';

  return (
    <div className='gprv-review-orphaned-panel'>
      <span
        className='gprv-review-orphaned-badge'
        title={`${commentCount.toLocaleString()} ${label} on earlier revisions of this file`}
      >
        {commentCount} outdated
      </span>
      {threadAnnotations.map(({ thread, annotation }) => (
        <ReviewCommentThread
          key={thread.comments[0]?.id ?? thread.comments.map((comment) => comment.id).join('-')}
          annotation={annotation}
          itemId={itemId}
          variant='header'
          pullRequestRef={pullRequestRef}
          viewerUser={viewerUser}
          hasToken={hasToken}
          onReplyOpen={onReplyOpen}
          onReplyClose={onReplyClose}
          onReplySuccess={onReplySuccess}
          onDelete={onDelete}
          onEdit={onEdit}
          onHighlightRange={onHighlightRange}
          onClearHighlight={onClearHighlight}
        />
      ))}
    </div>
  );
});
