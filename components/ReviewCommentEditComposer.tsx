import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';

import type { GitHubPullRequestReviewComment } from '@/lib/github';
import { GitHubReviewWriteError } from '@/lib/github-review-write';

type ReviewCommentEditComposerProps = {
  comment: GitHubPullRequestReviewComment;
  hasToken: boolean;
  onCancel: () => void;
  onSave: (body: string) => void | Promise<void>;
};

export function ReviewCommentEditComposer({
  comment,
  hasToken,
  onCancel,
  onSave,
}: ReviewCommentEditComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState(comment.body);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const textarea = textareaRef.current;
    textarea?.focus({ preventScroll: true });
    if (textarea) {
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = body.trim();
    if (!trimmed) {
      setError('Write a comment before saving.');
      return;
    }

    if (!hasToken) {
      setError('Add a GitHub token in the diffy extension popup to edit comments.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave(trimmed);
    } catch (submitError: unknown) {
      if (submitError instanceof GitHubReviewWriteError) {
        setError(submitError.message);
      } else {
        setError(submitError instanceof Error ? submitError.message : String(submitError));
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [body, hasToken, onSave]);

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

  return (
    <div className='gprv-review-edit-composer'>
      <label className='gprv-review-composer-field'>
        <span className='sr-only'>Edit comment</span>
        <textarea
          ref={textareaRef}
          className='gprv-review-composer-input'
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Edit comment'
          rows={3}
          disabled={isSubmitting}
        />
      </label>
      {!hasToken ? (
        <p className='gprv-review-composer-hint'>
          Add a GitHub token in the diffy popup to edit comments.
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
          {isSubmitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
