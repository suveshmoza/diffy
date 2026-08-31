import type { LineAnnotation } from '@pierre/diffs';
import { memo, useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
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
    <div className='grid max-w-full items-start justify-items-start gap-2'>
      <Badge
        variant='outline'
        className='h-auto border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary'
        title={`${commentCount.toLocaleString()} ${label} on earlier revisions of this file`}
      >
        {commentCount} outdated
      </Badge>
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
