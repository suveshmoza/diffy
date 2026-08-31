import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { Button } from '@/components/ui/button';
import type { GitHubPullRequestReviewComment } from '@/lib/github/api';
import { GitHubReviewWriteError } from '@/lib/github/review-write';
import { useGitHubAuth } from '@/providers/GitHubAuthProvider';

import { ReviewMarkdownComposer } from './ReviewMarkdownComposer';

type ReviewCommentEditComposerProps = {
  comment: GitHubPullRequestReviewComment;
  onCancel: () => void;
  onSave: (body: string) => void | Promise<void>;
};

export function ReviewCommentEditComposer({
  comment,
  onCancel,
  onSave,
}: ReviewCommentEditComposerProps) {
  const { hasToken } = useGitHubAuth();
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
    <div className='mt-1 grid gap-2'>
      <div className='mt-2 block w-full'>
        <ReviewMarkdownComposer
          ref={textareaRef}
          value={body}
          onChange={setBody}
          onKeyDown={handleKeyDown}
          placeholder='Edit comment'
          rows={3}
          disabled={isSubmitting}
          aria-label='Edit comment'
        />
      </div>
      {!hasToken ? (
        <p className='text-xs text-muted-foreground'>
          Add a GitHub token in the diffy popup to edit comments.
        </p>
      ) : null}
      {error ? <p className='text-xs text-destructive'>{error}</p> : null}
      <div className='mt-2.5 flex flex-wrap justify-end gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type='button'
          size='sm'
          onClick={() => void handleSubmit()}
          disabled={isSubmitting || !body.trim()}
        >
          {isSubmitting ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
