import type { LineAnnotation } from '@pierre/diffs';
import { memo, useMemo } from 'react';

import type { ReviewCommentThreadMetadata } from '@/lib/review-comments';

import { ReviewCommentThread } from './ReviewCommentThread';

type OrphanedReviewCommentsBadgeProps = {
  threads: ReviewCommentThreadMetadata[];
};

export const OrphanedReviewCommentsBadge = memo(function OrphanedReviewCommentsBadge({
  threads,
}: OrphanedReviewCommentsBadgeProps) {
  const threadAnnotations = useMemo(
    () =>
      threads.map((thread) => ({
        thread,
        annotation: {
          lineNumber: thread.comments[0]?.line ?? thread.comments[0]?.original_line ?? 0,
          metadata: thread,
        } satisfies LineAnnotation<ReviewCommentThreadMetadata>,
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
          variant='header'
        />
      ))}
    </div>
  );
});
