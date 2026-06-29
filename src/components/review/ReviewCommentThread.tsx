import type { DiffLineAnnotation, LineAnnotation } from '@pierre/diffs';
import { IconMessageCircle } from '@tabler/icons-react';
import { memo, useCallback, useState } from 'react';

import type { GitHubPullRequestReviewComment } from '@/lib/github/api';
import { renderGitHubCommentBody } from '@/lib/github/comments/markdown';
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
import { useGitHubAuth } from '@/providers/GitHubAuthProvider';
import { useReview } from '@/providers/ReviewContext';

import { ReviewCommentEditComposer } from './ReviewCommentEditComposer';
import { ReviewReplyComposer } from './ReviewReplyComposer';

export function getReviewReplyKey(itemId: string, inReplyToId: number): string {
  return `${itemId}:${inReplyToId}`;
}

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
      className={`gprv-review-thread-shell${variant === 'header' ? ' gprv-review-thread-shell--header' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className='gprv-review-thread'>
        <CommentReplySlot
          itemId={itemId}
          comment={mainComment}
          rootCommentId={mainComment.id}
          lineRangeLabel={formatReviewCommentLineLabel(mainComment)}
          canReply={canReply}
          isOrphaned={isOrphaned}
        />
        {replies.length > 0 ? (
          <div className='gprv-review-replies'>
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

  const handleDelete = useCallback(async () => {
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
  }, [actions, comment, isDeleting, isOrphaned, itemId]);

  const handleSaveEdit = useCallback(
    async (body: string) => {
      await actions.editComment(itemId, comment, body, isOrphaned);
      setIsEditing(false);
    },
    [actions, comment, isOrphaned, itemId],
  );

  return (
    <div
      className={`gprv-review-comment-block${depth > 0 ? ' gprv-review-comment-block--nested' : ''}`}
      data-reply-key={replyKey}
      {...(depth > 0 ? { 'data-reply-prefill': formatQuoteReplyPrefill(comment) } : {})}
    >
      {lineRangeLabel ? <p className='gprv-review-line-range'>{lineRangeLabel}</p> : null}
      <article className='gprv-review-comment'>
        <span
          className='gprv-review-comment-avatar'
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
            />
          ) : (
            comment.user.login.slice(0, 1).toUpperCase()
          )}
        </span>
        <div className='gprv-review-comment-content'>
          <div className='gprv-review-comment-meta'>
            <strong>{comment.user.login}</strong>
            <time
              dateTime={comment.created_at}
              title={formatFullTimestamp(comment.created_at)}
            >
              {formatRelativeTimestamp(comment.created_at)}
            </time>
            <div className='gprv-review-comment-actions'>
              {canManage && !isEditing ? (
                <button
                  type='button'
                  className='gprv-review-comment-action'
                  onClick={() => setIsEditing(true)}
                  aria-label='Edit comment'
                  title='Edit comment'
                >
                  Edit
                </button>
              ) : null}
              {canManage ? (
                <button
                  type='button'
                  className='gprv-review-comment-action'
                  onClick={() => void handleDelete()}
                  disabled={isDeleting || isEditing}
                  aria-label='Delete comment'
                  title='Delete comment'
                >
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </button>
              ) : null}
              <a
                className='gprv-review-comment-link'
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
            <div className='gprv-review-comment-hidden'>
              <p className='gprv-review-comment-hidden-note'>
                {formatReviewCommentHiddenLabel(comment)}
              </p>
              <button
                type='button'
                className='gprv-review-comment-action'
                onClick={() => setIsExpanded(true)}
              >
                Show comment
              </button>
            </div>
          ) : isEditing ? (
            <ReviewCommentEditComposer
              comment={comment}
              onCancel={() => setIsEditing(false)}
              onSave={handleSaveEdit}
            />
          ) : (
            <div className='gprv-review-comment-text'>
              {renderGitHubCommentBody(comment.body, { pullRequestRef })}
            </div>
          )}
          {canReply && !isHidden && !isEditing ? (
            <button
              type='button'
              className='gprv-review-reply-trigger'
              onClick={() => actions.openReply(replyKey)}
              aria-label={replyLabel}
              title={replyLabel}
            >
              <IconMessageCircle
                size={20}
                stroke={2}
              />
              <span className='gprv-review-reply-trigger-label'>{replyLabel}</span>
            </button>
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
