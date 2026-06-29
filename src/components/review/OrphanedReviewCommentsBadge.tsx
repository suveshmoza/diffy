import type { LineAnnotation } from '@pierre/diffs';
import { memo, useMemo } from 'react';

import type { ReviewThreadMetadata } from '@/lib/review/comments';

import { HeaderReviewCommentThread } from './ReviewCommentThread';

type OrphanedReviewCommentsBadgeProps = {
  threads: ReviewThreadMetadata[];
  itemId: string;
};

export const OrphanedReviewCommentsBadge = memo(function OrphanedReviewCommentsBadge({
  threads,
  itemId,
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
        <HeaderReviewCommentThread
          key={thread.comments[0]?.id ?? thread.comments.map((comment) => comment.id).join('-')}
          annotation={annotation}
          itemId={itemId}
        />
      ))}
    </div>
  );
});
