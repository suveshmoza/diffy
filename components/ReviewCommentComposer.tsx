import type { SelectedLineRange } from '@pierre/diffs';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';

import type { GitHubPullRequestRef, GitHubPullRequestReviewComment } from '@/lib/github';
import {
  addPendingReviewComment,
  createImmediateReviewComment,
  GitHubReviewWriteError,
  type GitHubViewer,
} from '@/lib/github-review-write';

type ReviewCommentComposerProps = {
  path: string;
  range: SelectedLineRange;
  pullRequestRef: GitHubPullRequestRef;
  commitId: string;
  pendingReviewId: number | null;
  viewerUser: GitHubViewer | null;
  hasToken: boolean;
  onCancel: () => void;
  onImmediateSuccess: (comment: GitHubPullRequestReviewComment) => void;
  onPendingSuccess: (comment: GitHubPullRequestReviewComment) => void;
};

export function ReviewCommentComposer({
  path,
  range,
  pullRequestRef,
  commitId,
  pendingReviewId,
  viewerUser,
  hasToken,
  onCancel,
  onImmediateSuccess,
  onPendingSuccess,
}: ReviewCommentComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isReviewSession = pendingReviewId != null;
  const submitLabel = isReviewSession ? 'Add review comment' : 'Comment';

  useEffect(() => {
    textareaRef.current?.focus({ preventScroll: true });
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = body.trim();
    if (!trimmed) {
      setError('Write a comment before submitting.');
      return;
    }

    if (!hasToken) {
      setError('Add a GitHub token in the diffy extension popup to comment.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const input = {
        body: trimmed,
        commitId,
        path,
        range,
      };

      if (isReviewSession) {
        const comment = await addPendingReviewComment(pullRequestRef, {
          ...input,
          pullRequestReviewId: pendingReviewId,
        });
        onPendingSuccess(comment);
      } else {
        const comment = await createImmediateReviewComment(pullRequestRef, input);
        onImmediateSuccess(comment);
      }
    } catch (submitError: unknown) {
      if (submitError instanceof GitHubReviewWriteError) {
        setError(submitError.message);
      } else {
        setError(submitError instanceof Error ? submitError.message : String(submitError));
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    body,
    commitId,
    hasToken,
    isReviewSession,
    onImmediateSuccess,
    onPendingSuccess,
    path,
    pendingReviewId,
    pullRequestRef,
    range,
  ]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      event.stopPropagation();

      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        void handleSubmit();
      }
    },
    [handleSubmit, onCancel],
  );

  const initials = viewerUser?.login.slice(0, 1).toUpperCase() ?? '?';

  return (
    <div className='gprv-review-thread-shell'>
      <div className='gprv-review-thread gprv-review-composer'>
        <div className='gprv-review-comment'>
          <span
            className='gprv-review-comment-avatar'
            aria-hidden='true'
          >
            {viewerUser?.avatar_url ? (
              <img
                src={viewerUser.avatar_url}
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
            {viewerUser ? (
              <div className='gprv-review-comment-meta'>
                <strong>{viewerUser.login}</strong>
              </div>
            ) : null}
            <label className='gprv-review-composer-field'>
              <span className='sr-only'>Comment</span>
              <textarea
                ref={textareaRef}
                className='gprv-review-composer-input'
                value={body}
                onChange={(event) => setBody(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Leave a comment'
                rows={3}
                disabled={isSubmitting}
              />
            </label>
            {!hasToken ? (
              <p className='gprv-review-composer-hint'>
                Add a GitHub token in the diffy popup to post comments.
              </p>
            ) : null}
            {error ? <p className='gprv-review-composer-error'>{error}</p> : null}
            <div className='gprv-review-composer-actions'>
              <button
                type='button'
                className='gprv-review-composer-button gprv-review-composer-button-secondary'
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type='button'
                className='gprv-review-composer-button gprv-review-composer-button-primary'
                onClick={() => void handleSubmit()}
                disabled={isSubmitting || !body.trim()}
              >
                {isSubmitting ? 'Posting…' : submitLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
