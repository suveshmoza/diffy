import { useCallback, useRef, useState, type KeyboardEvent } from 'react';

import type { GitHubPullRequestRef, GitHubPullRequestReviewComment } from '@/lib/github/api';
import { createReviewCommentReply, GitHubReviewWriteError } from '@/lib/github/review-write';
import { useGitHubAuth } from '@/providers/GitHubAuthProvider';

type ReviewReplyComposerProps = {
  pullRequestRef: GitHubPullRequestRef;
  inReplyToId: number;
  onCancel: () => void;
  onSuccess: (comment: GitHubPullRequestReviewComment) => void;
};

export function ReviewReplyComposer({
  pullRequestRef,
  inReplyToId,
  onCancel,
  onSuccess,
}: ReviewReplyComposerProps) {
  const { viewerUser, hasToken } = useGitHubAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    const trimmed = textareaRef.current?.value.trim() ?? '';
    if (!trimmed) {
      setError('Write a reply before submitting.');
      return;
    }

    if (!hasToken) {
      setError('Add a GitHub token in the diffy extension popup to reply.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const comment = await createReviewCommentReply(pullRequestRef, {
        body: trimmed,
        inReplyToId,
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
  }, [hasToken, inReplyToId, onSuccess, pullRequestRef]);

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
    <div className='gprv-review-reply-composer'>
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
            <span className='sr-only'>Reply</span>
            <textarea
              ref={textareaRef}
              className='gprv-review-composer-input'
              defaultValue=''
              onKeyDown={handleKeyDown}
              placeholder='Leave a reply'
              rows={3}
              disabled={isSubmitting}
            />
          </label>
          {!hasToken ? (
            <p className='gprv-review-composer-hint'>
              Add a GitHub token in the diffy popup to reply.
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
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Posting…' : 'Reply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
