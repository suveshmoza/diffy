import { useCallback, useRef, useState, type KeyboardEvent } from 'react';

import { Button } from '@/components/ui/button';
import type { GitHubPullRequestRef, GitHubPullRequestReviewComment } from '@/lib/github/api';
import { createReviewCommentReply, GitHubReviewWriteError } from '@/lib/github/review-write';
import { cn } from '@/lib/utils';
import { useGitHubAuth } from '@/providers/GitHubAuthProvider';

import {
  reviewAvatarClassName,
  reviewCommentContentClassName,
  reviewCommentRowClassName,
  reviewComposerActionsClassName,
} from './reviewComposerStyles';
import { ReviewMarkdownComposer } from './ReviewMarkdownComposer';

type ReviewReplyComposerProps = {
  pullRequestRef: GitHubPullRequestRef;
  inReplyToId: number;
  nested?: boolean;
  onCancel: () => void;
  onSuccess: (comment: GitHubPullRequestReviewComment) => void;
};

export function ReviewReplyComposer({
  pullRequestRef,
  inReplyToId,
  nested = false,
  onCancel,
  onSuccess,
}: ReviewReplyComposerProps) {
  const { viewerUser, hasToken } = useGitHubAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    const trimmed = body.trim();
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
  }, [body, hasToken, inReplyToId, onSuccess, pullRequestRef]);

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
    <div className={cn('mt-2 max-w-full min-w-0', nested ? 'ml-0' : 'ml-8')}>
      <div className={reviewCommentRowClassName}>
        <span
          className={reviewAvatarClassName}
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
        <div className={reviewCommentContentClassName}>
          {viewerUser ? (
            <div className='flex flex-wrap items-baseline gap-x-2 gap-y-0'>
              <strong className='text-sm font-semibold'>{viewerUser.login}</strong>
            </div>
          ) : null}
          <div className='mt-2 block w-full'>
            <ReviewMarkdownComposer
              ref={textareaRef}
              value={body}
              onChange={setBody}
              onKeyDown={handleKeyDown}
              placeholder='Leave a reply'
              rows={3}
              disabled={isSubmitting}
              aria-label='Reply'
            />
          </div>
          {!hasToken ? (
            <p className='mt-2 text-xs text-muted-foreground'>
              Add a GitHub token in the diffy popup to reply.
            </p>
          ) : null}
          {error ? <p className='mt-2 text-xs text-destructive'>{error}</p> : null}
          <div className={reviewComposerActionsClassName}>
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
              {isSubmitting ? 'Posting…' : 'Reply'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
