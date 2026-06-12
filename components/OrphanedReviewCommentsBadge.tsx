import type { LineAnnotation } from '@pierre/diffs';

import type { ReviewCommentThreadMetadata } from '@/lib/review-comments';

import { ReviewCommentThread } from './ReviewCommentThread';

type OrphanedReviewCommentsBadgeProps = {
  threads: ReviewCommentThreadMetadata[];
};

export function OrphanedReviewCommentsBadge({ threads }: OrphanedReviewCommentsBadgeProps) {
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
      {threads.map((thread) => {
        const annotation: LineAnnotation<ReviewCommentThreadMetadata> = {
          lineNumber: thread.comments[0]?.line ?? thread.comments[0]?.original_line ?? 0,
          metadata: thread,
        };

        return (
          <ReviewCommentThread
            key={thread.comments[0]?.id ?? thread.comments.map((comment) => comment.id).join('-')}
            annotation={annotation}
          />
        );
      })}
    </div>
  );
}
