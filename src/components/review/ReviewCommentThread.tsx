import type { DiffLineAnnotation, LineAnnotation } from '@pierre/diffs';
import { IconComment } from '@pierre/icons';
import { memo, useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import type { GitHubPullRequestReviewComment } from '@/lib/github/api';
import {
  formatReviewCommentHiddenLabel,
  isReviewCommentHidden,
  type ReviewAnnotationMetadata,
} from '@/lib/review/comments';
import {
  formatReviewCommentLineLabel,
  reviewCommentToSelectedLineRange,
} from '@/lib/review/format-line-range';
import { formatQuoteReplyPrefill } from '@/lib/review/format-quote-reply';
import { getReviewReplyKey } from '@/lib/review/reply-session';
import { cn } from '@/lib/utils';
import { useGitHubAuth } from '@/providers/GitHubAuthProvider';
import { useReview } from '@/providers/ReviewContext';

import { ReviewCommentBody } from './ReviewCommentBody';
import { ReviewCommentEditComposer } from './ReviewCommentEditComposer';
import {
  reviewAvatarClassName,
  reviewCommentContentClassName,
  reviewCommentRowClassName,
  reviewLineRangeClassName,
  reviewThreadCardClassName,
  reviewThreadShellClassName,
} from './reviewComposerStyles';
import { ReviewReplyComposer } from './ReviewReplyComposer';

type ReviewCommentThreadBaseProps = {
  annotation:
    | LineAnnotation<ReviewAnnotationMetadata>
    | DiffLineAnnotation<ReviewAnnotationMetadata>;
  itemId?: string;
  variant: 'inline' | 'header';
};

const ReviewCommentThreadBase = memo(function ReviewCommentThreadBase({
  annotation,
  itemId,
  variant,
}: ReviewCommentThreadBaseProps) {
  const { hasToken } = useGitHubAuth();
  const { actions } = useReview();
  const isOrphaned = variant === 'header';
  const metadata = annotation.metadata;
  const mainComment = metadata?.kind === 'thread' ? metadata.comments[0] : undefined;
  const replies = metadata?.kind === 'thread' ? metadata.comments.slice(1) : [];

  const canReply = hasToken;

  const handleMouseEnter = useCallback(() => {
    if (!itemId || !mainComment) {
      return;
    }

    const range = reviewCommentToSelectedLineRange(mainComment);
    if (!range) {
      return;
    }

    actions.highlightRange({ id: itemId, range });
  }, [actions, itemId, mainComment]);

  const handleMouseLeave = useCallback(() => {
    actions.clearHighlight();
  }, [actions]);

  if (!metadata || metadata.kind !== 'thread') {
    return null;
  }

  if (metadata.comments.length === 0 || !mainComment || itemId == null) {
    return null;
  }

  return (
    <div
      className={reviewThreadShellClassName}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={reviewThreadCardClassName}>
        <CommentReplySlot
          itemId={itemId}
          comment={mainComment}
          rootCommentId={mainComment.id}
          lineRangeLabel={formatReviewCommentLineLabel(mainComment)}
          canReply={canReply}
          isOrphaned={isOrphaned}
        />
        {replies.length > 0 ? (
          <div className='ml-8 mt-4 grid max-w-full min-w-0 gap-4'>
            {replies.map((comment) => (
              <CommentReplySlot
                key={comment.id}
                itemId={itemId}
                comment={comment}
                rootCommentId={mainComment.id}
                depth={1}
                canReply={canReply}
                isOrphaned={isOrphaned}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
});

export const ReviewCommentThread = memo(function ReviewCommentThread(
  props: Omit<ReviewCommentThreadBaseProps, 'variant'>,
) {
  return (
    <ReviewCommentThreadBase
      variant='inline'
      {...props}
    />
  );
});

export const HeaderReviewCommentThread = memo(function HeaderReviewCommentThread(
  props: Omit<ReviewCommentThreadBaseProps, 'variant'>,
) {
  return (
    <ReviewCommentThreadBase
      variant='header'
      {...props}
    />
  );
});

type CommentReplySlotProps = {
  itemId: string;
  comment: GitHubPullRequestReviewComment;
  rootCommentId: number;
  lineRangeLabel?: string | null;
  depth?: number;
  canReply: boolean;
  isOrphaned: boolean;
};

const CommentReplySlot = memo(function CommentReplySlot({
  itemId,
  comment,
  rootCommentId,
  lineRangeLabel,
  depth = 0,
  canReply,
  isOrphaned,
}: CommentReplySlotProps) {
  const { viewerUser, hasToken } = useGitHubAuth();
  const { actions, meta } = useReview();
  const { pullRequestRef } = meta;
  const replyKey = getReviewReplyKey(itemId, comment.id);
  const replyLabel = depth > 0 ? 'Quote reply' : 'Reply';
  const isMinimized = isReviewCommentHidden(comment);
  const [isExpanded, setIsExpanded] = useState(false);
  const isHidden = isMinimized && !isExpanded;
  const canManage = hasToken && viewerUser?.login === comment.user.login;
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) {
      return;
    }

    if (!window.confirm('Delete this comment?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await actions.deleteComment(itemId, comment, isOrphaned);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveEdit = useCallback(
    async (body: string) => {
      await actions.editComment(itemId, comment, body, isOrphaned);
      setIsEditing(false);
    },
    [actions, comment, isOrphaned, itemId],
  );

  return (
    <div
      className='grid max-w-full min-w-0 gap-0'
      data-reply-key={replyKey}
      {...(depth > 0 ? { 'data-reply-prefill': formatQuoteReplyPrefill(comment) } : {})}
    >
      {lineRangeLabel ? <p className={reviewLineRangeClassName}>{lineRangeLabel}</p> : null}
      <article className={reviewCommentRowClassName}>
        <span
          className={reviewAvatarClassName}
          aria-hidden='true'
        >
          {comment.user.avatar_url ? (
            <img
              src={comment.user.avatar_url}
              alt=''
              width={24}
              height={24}
              loading='lazy'
              decoding='async'
              className='size-full object-cover'
            />
          ) : (
            comment.user.login.slice(0, 1).toUpperCase()
          )}
        </span>
        <div className={reviewCommentContentClassName}>
          <div className='flex flex-wrap items-baseline gap-x-2 gap-y-0'>
            <strong className='text-sm font-semibold'>{comment.user.login}</strong>
            <time
              className='text-xs text-muted-foreground'
              dateTime={comment.created_at}
              title={formatFullTimestamp(comment.created_at)}
            >
              {formatRelativeTimestamp(comment.created_at)}
            </time>
            <div className='inline-flex shrink-0 items-center gap-1'>
              {canManage && !isEditing ? (
                <Button
                  type='button'
                  variant='ghost'
                  size='xs'
                  onClick={() => setIsEditing(true)}
                  aria-label='Edit comment'
                  title='Edit comment'
                >
                  Edit
                </Button>
              ) : null}
              {canManage ? (
                <Button
                  type='button'
                  variant='ghost'
                  size='xs'
                  onClick={() => void handleDelete()}
                  disabled={isDeleting || isEditing}
                  aria-label='Delete comment'
                  title='Delete comment'
                >
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </Button>
              ) : null}
              <a
                className='inline-flex items-center rounded-md px-1 text-xs text-muted-foreground hover:bg-muted hover:text-primary'
                href={comment.html_url}
                target='_blank'
                rel='noopener noreferrer'
                aria-label={`Open comment by ${comment.user.login} on GitHub`}
                title='Open on GitHub'
              >
                ↗
              </a>
            </div>
          </div>
          {isHidden && !isEditing ? (
            <div className='mt-1 grid gap-1.5'>
              <p className='text-xs text-muted-foreground italic'>
                {formatReviewCommentHiddenLabel(comment)}
              </p>
              <Button
                type='button'
                variant='ghost'
                size='xs'
                className='h-auto w-fit px-1'
                onClick={() => setIsExpanded(true)}
              >
                Show comment
              </Button>
            </div>
          ) : isEditing ? (
            <ReviewCommentEditComposer
              comment={comment}
              onCancel={() => setIsEditing(false)}
              onSave={handleSaveEdit}
            />
          ) : (
            <ReviewCommentBody
              body={comment.body}
              pullRequestRef={pullRequestRef}
            />
          )}
          {canReply && !isHidden && !isEditing ? (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              data-reply-trigger
              className={cn(
                'mt-2 h-auto gap-1.5 px-1 py-0.5 text-xs font-semibold in-data-reply-open:hidden',
              )}
              onClick={() => actions.openReply(replyKey)}
              aria-label={replyLabel}
              title={replyLabel}
            >
              <IconComment size={20} />
              <span>{replyLabel}</span>
            </Button>
          ) : null}
        </div>
      </article>
      {canReply && !isHidden && !isEditing ? (
        <div
          data-reply-composer
          hidden
        >
          <ReviewReplyComposer
            pullRequestRef={pullRequestRef}
            inReplyToId={rootCommentId}
            nested={depth > 0}
            onCancel={() => actions.closeReply(replyKey)}
            onSuccess={(postedComment) =>
              actions.submitReply(itemId, postedComment, replyKey, isOrphaned)
            }
          />
        </div>
      ) : null}
    </div>
  );
});

function formatFullTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}

function formatRelativeTimestamp(value: string): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }

  const elapsedMs = Date.now() - timestamp;
  const elapsedMinutes = Math.max(1, Math.round(elapsedMs / 60_000));

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`;
  }

  const elapsedHours = Math.round(elapsedMinutes / 60);
  if (elapsedHours < 48) {
    return `${elapsedHours}h ago`;
  }

  const elapsedDays = Math.round(elapsedHours / 24);
  return `${elapsedDays}d ago`;
}
