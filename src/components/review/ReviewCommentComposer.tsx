import type { SelectedLineRange } from '@pierre/diffs';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';

import type { GitHubPullRequestRef, GitHubPullRequestReviewComment } from '@/lib/github/api';
import { createImmediateReviewComment, GitHubReviewWriteError } from '@/lib/github/review-write';
import { formatSelectedLineRangeLabel } from '@/lib/review/format-line-range';
import { useGitHubAuth } from '@/providers/GitHubAuthProvider';

type ReviewCommentComposerProps = {
  path: string;
  range: SelectedLineRange;
  pullRequestRef: GitHubPullRequestRef;
  commitId: string;
  isBatchMode?: boolean;
  onCancel: () => void;
  onSuccess: (comment: GitHubPullRequestReviewComment) => void;
  onQueue?: (body: string) => void;
};

export function ReviewCommentComposer({
  path,
  range,
  pullRequestRef,
  commitId,
  isBatchMode = false,
  onCancel,
  onSuccess,
  onQueue,
}: ReviewCommentComposerProps) {
  const { viewerUser, hasToken } = useGitHubAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    if (isBatchMode && onQueue) {
      onQueue(trimmed);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const comment = await createImmediateReviewComment(pullRequestRef, {
        body: trimmed,
        commitId,
        path,
        range,
      });
      onSuccess(comment);
    } catch (submitError: unknown) {
      if (submitError instanceof GitHubReviewWriteError) {
        setError(submitError.message);
      } else {
        setError(submitError instanceof Error ? submitError.message : String(submitError));
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [body, commitId, hasToken, isBatchMode, onQueue, onSuccess, path, pullRequestRef, range]);

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
        <p className='gprv-review-line-range'>{formatSelectedLineRangeLabel(range)}</p>
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
                {isBatchMode ? 'Add to review' : isSubmitting ? 'Posting…' : 'Comment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
