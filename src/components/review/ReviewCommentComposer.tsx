import type { SelectedLineRange } from '@pierre/diffs';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { Button } from '@/components/ui/button';
import type { GitHubPullRequestReviewComment } from '@/lib/github/api';
import { createImmediateReviewComment, GitHubReviewWriteError } from '@/lib/github/review-write';
import { formatSelectedLineRangeLabel } from '@/lib/review/format-line-range';
import { useGitHubAuth } from '@/providers/GitHubAuthProvider';
import { useReview } from '@/providers/ReviewContext';

import { ReviewMarkdownComposer } from './ReviewMarkdownComposer';

type ReviewCommentComposerProps = {
  path: string;
  range: SelectedLineRange;
  isBatchMode?: boolean;
  initialBody?: string;
  onBodyChange?: (body: string) => void;
  onCancel: () => void;
  onSuccess: (comment: GitHubPullRequestReviewComment) => void;
  onQueue?: (body: string) => void;
};

export function ReviewCommentComposer({
  path,
  range,
  isBatchMode = false,
  initialBody = '',
  onBodyChange,
  onCancel,
  onSuccess,
  onQueue,
}: ReviewCommentComposerProps) {
  const { viewerUser, hasToken } = useGitHubAuth();
  const {
    meta: { pullRequestRef, headSha: commitId },
  } = useReview();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    textareaRef.current?.focus({ preventScroll: true });
  }, []);

  const handleBodyChange = useCallback(
    (nextBody: string) => {
      setBody(nextBody);
      onBodyChange?.(nextBody);
    },
    [onBodyChange],
  );

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
    <div className='box-border w-full min-w-0 max-w-full p-3.5 whitespace-normal text-foreground lg:max-w-lg'>
      <div className='box-border w-full min-w-0 max-w-[90%] rounded-[10px] border border-border bg-card p-4 text-foreground shadow-sm lg:max-w-full'>
        <p className='mb-2.5 text-xs font-semibold text-foreground/65'>
          {formatSelectedLineRangeLabel(range)}
        </p>
        <div className='flex w-full min-w-0 max-w-full items-start gap-2'>
          <span
            className={
              'inline-flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-[11px] font-bold text-primary'
            }
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
                className='size-full object-cover'
              />
            ) : (
              initials
            )}
          </span>
          <div className='min-w-0 max-w-full flex-1'>
            {viewerUser ? (
              <div className='flex flex-wrap items-baseline gap-x-2 gap-y-0'>
                <strong className='text-sm font-semibold'>{viewerUser.login}</strong>
              </div>
            ) : null}
            <div className='mt-2 block w-full'>
              <ReviewMarkdownComposer
                ref={textareaRef}
                value={body}
                onChange={handleBodyChange}
                onKeyDown={handleKeyDown}
                placeholder='Leave a comment'
                rows={3}
                disabled={isSubmitting}
                aria-label='Comment'
              />
            </div>
            {!hasToken ? (
              <p className='mt-2 text-xs text-muted-foreground'>
                Add a GitHub token in the diffy popup to post comments.
              </p>
            ) : null}
            {error ? <p className='mt-2 text-xs text-destructive'>{error}</p> : null}
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
                {isBatchMode ? 'Add to review' : isSubmitting ? 'Posting…' : 'Comment'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
