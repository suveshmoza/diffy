import { useCallback, useMemo, useRef, useState } from 'react';

import type { GitHubPullRequestRef, GitHubPullRequestReviewComment } from '@/domains/github/api';
import { useGitHubAuth } from '@/domains/github/auth/GitHubAuthProvider';
import { createReviewCommentReply } from '@/domains/github/review-write';
import { useCommentSubmit } from '@/domains/review/hooks/useCommentSubmit';
import { cn } from '@/shared/utils';

import { ReviewComposerActions } from './review-composer/ReviewComposerActions';
import { ReviewComposerAuthor } from './review-composer/ReviewComposerAuthor';
import { ReviewComposerForm } from './review-composer/ReviewComposerForm';
import { createComposerValidator } from './review-composer/validation';
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
  const { hasToken } = useGitHubAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState('');

  const validate = useMemo(
    () =>
      createComposerValidator({
        hasToken,
        empty: 'Write a reply before submitting.',
        missingToken: 'Add a GitHub token in the diffy extension popup to reply.',
      }),
    [hasToken],
  );

  const { error, errorId, isSubmitting, onSubmit, reset } = useCommentSubmit({
    body,
    validate,
    submit: (trimmedBody) =>
      createReviewCommentReply(pullRequestRef, {
        body: trimmedBody,
        inReplyToId,
      }).then(onSuccess),
  });

  const handleBodyChange = useCallback(
    (nextBody: string) => {
      reset();
      setBody(nextBody);
    },
    [reset],
  );

  return (
    <ReviewComposerForm
      className={cn('mt-2 max-w-full min-w-0', nested ? 'ml-0' : 'ml-8')}
      onSubmit={onSubmit}
      onCancel={onCancel}
    >
      <ReviewComposerAuthor>
        <div className='mt-2 block w-full'>
          <ReviewMarkdownComposer
            ref={textareaRef}
            value={body}
            onChange={handleBodyChange}
            placeholder='Leave a reply'
            rows={3}
            disabled={isSubmitting}
            aria-label='Reply'
            aria-invalid={error != null}
            aria-describedby={error ? errorId : undefined}
          />
        </div>
        <ReviewComposerActions
          error={error}
          errorId={errorId}
          tokenHint={hasToken ? null : 'Add a GitHub token in the diffy popup to reply.'}
          isSubmitting={isSubmitting}
          submitLabel='Reply'
          submittingLabel='Posting…'
          onCancel={onCancel}
        />
      </ReviewComposerAuthor>
    </ReviewComposerForm>
  );
}
