import type { DiffLineAnnotation, LineAnnotation } from '@pierre/diffs';
import { memo } from 'react';

import { formatReviewCommentLineLabel } from '@/lib/format-line-range';
import type { GitHubPullRequestReviewComment } from '@/lib/github';
import { renderGitHubCommentBody } from '@/lib/github-comment-markdown';
import type { ReviewAnnotationMetadata } from '@/lib/review-comments';

type ReviewCommentThreadProps = {
  annotation:
    | LineAnnotation<ReviewAnnotationMetadata>
    | DiffLineAnnotation<ReviewAnnotationMetadata>;
  variant?: 'inline' | 'header';
  showPendingBadge?: boolean;
};

export const ReviewCommentThread = memo(function ReviewCommentThread({
  annotation,
  variant = 'inline',
  showPendingBadge = false,
}: ReviewCommentThreadProps) {
  const metadata = annotation.metadata;
  if (!metadata || (metadata.kind !== 'thread' && metadata.kind !== 'pending')) {
    return null;
  }

  if (metadata.comments.length === 0) {
    return null;
  }

  const [mainComment, ...replies] = metadata.comments;

  return (
    <div
      className={`gprv-review-thread-shell${variant === 'header' ? ' gprv-review-thread-shell--header' : ''}`}
    >
      <div
        className={`gprv-review-thread${showPendingBadge ? ' gprv-review-thread--pending' : ''}`}
      >
        {showPendingBadge ? <span className='gprv-review-pending-badge'>Pending</span> : null}
        <ReviewComment
          comment={mainComment}
          lineRangeLabel={formatReviewCommentLineLabel(mainComment)}
        />
        {replies.length > 0 ? (
          <div className='gprv-review-replies'>
            {replies.map((comment) => (
              <ReviewComment
                key={comment.id}
                comment={comment}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
});

type ReviewCommentProps = {
  comment: GitHubPullRequestReviewComment;
  lineRangeLabel?: string | null;
};

const ReviewComment = memo(function ReviewComment({ comment, lineRangeLabel }: ReviewCommentProps) {
  const initials = comment.user.login.slice(0, 1).toUpperCase();

  return (
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
          initials
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
        {lineRangeLabel ? <p className='gprv-review-line-range'>{lineRangeLabel}</p> : null}
        <div className='gprv-review-comment-text'>{renderGitHubCommentBody(comment.body)}</div>
      </div>
    </article>
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
