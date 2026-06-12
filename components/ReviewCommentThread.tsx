import type { DiffLineAnnotation, LineAnnotation } from '@pierre/diffs';

import type { GitHubPullRequestReviewComment } from '@/lib/github';
import { renderGitHubCommentBody } from '@/lib/github-comment-markdown';
import type { ReviewCommentThreadMetadata } from '@/lib/review-comments';

type ReviewCommentThreadProps = {
  annotation:
    | LineAnnotation<ReviewCommentThreadMetadata>
    | DiffLineAnnotation<ReviewCommentThreadMetadata>;
};

export function ReviewCommentThread({ annotation }: ReviewCommentThreadProps) {
  const thread = annotation.metadata;
  if (!thread) {
    return null;
  }

  return (
    <div className='gprv-review-thread'>
      {thread.comments.map((comment) => (
        <ReviewComment
          key={comment.id}
          comment={comment}
          isReply={comment.id !== thread.comments[0]?.id}
        />
      ))}
    </div>
  );
}

type ReviewCommentProps = {
  comment: GitHubPullRequestReviewComment;
  isReply: boolean;
};

function ReviewComment({ comment, isReply }: ReviewCommentProps) {
  const initials = comment.user.login.slice(0, 1).toUpperCase();

  return (
    <article className={`gprv-review-comment${isReply ? ' gprv-review-comment-reply' : ''}`}>
      <div className='gprv-review-comment-header'>
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
            />
          ) : (
            initials
          )}
        </span>
        <div className='gprv-review-comment-meta'>
          <strong>{comment.user.login}</strong>
          <time
            dateTime={comment.created_at}
            title={formatFullTimestamp(comment.created_at)}
          >
            {formatRelativeTimestamp(comment.created_at)}
          </time>
        </div>
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
      <div className='gprv-review-comment-body'>{renderGitHubCommentBody(comment.body)}</div>
    </article>
  );
}

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
