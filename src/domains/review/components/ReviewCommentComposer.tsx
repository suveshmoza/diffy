import type { SelectedLineRange } from '@pierre/diffs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { GitHubPullRequestReviewComment } from '@/domains/github/api';
import { useGitHubAuth } from '@/domains/github/auth/GitHubAuthProvider';
import { createImmediateReviewComment } from '@/domains/github/review-write';
import { useCommentSubmit } from '@/domains/review/hooks/useCommentSubmit';
import { formatSelectedLineRangeLabel } from '@/domains/review/model/format-line-range';
import { useReview } from '@/domains/review/providers/ReviewContext';

import { ReviewComposerActions } from './review-composer/ReviewComposerActions';
import { ReviewComposerAuthor } from './review-composer/ReviewComposerAuthor';
import { ReviewComposerForm } from './review-composer/ReviewComposerForm';
import { createComposerValidator } from './review-composer/validation';
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
  const { hasToken } = useGitHubAuth();
  const {
    meta: { pullRequestRef, headSha: commitId },
  } = useReview();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState(initialBody);

  useEffect(() => {
    textareaRef.current?.focus({ preventScroll: true });
  }, []);

  const validate = useMemo(
    () =>
      createComposerValidator({
        hasToken,
        empty: 'Write a comment before submitting.',
        missingToken: 'Add a GitHub token in the diffy extension popup to comment.',
      }),
    [hasToken],
  );

  const { error, errorId, isSubmitting, onSubmit, reset } = useCommentSubmit({
    body,
    validate,
    submit: (trimmedBody) => {
      if (isBatchMode && onQueue) {
        onQueue(trimmedBody);
        return;
      }

      return createImmediateReviewComment(pullRequestRef, {
        body: trimmedBody,
        commitId,
        path,
        range,
      }).then(onSuccess);
    },
  });

  const handleBodyChange = useCallback(
    (nextBody: string) => {
      reset();
      setBody(nextBody);
      onBodyChange?.(nextBody);
    },
    [onBodyChange, reset],
  );

  return (
    <ReviewComposerForm
      className='box-border w-full min-w-0 max-w-full p-1 whitespace-normal text-foreground'
      onSubmit={onSubmit}
      onCancel={onCancel}
    >
      <div className='box-border w-full min-w-0 max-w-[90%] rounded-[10px] border border-border bg-card p-4 text-foreground shadow-sm lg:max-w-full'>
        <p className='mb-2.5 text-xs font-semibold text-foreground/65'>
          {formatSelectedLineRangeLabel(range)}
        </p>
        <ReviewComposerAuthor>
          <div className='mt-2 block w-full'>
            <ReviewMarkdownComposer
              ref={textareaRef}
              value={body}
              onChange={handleBodyChange}
              placeholder='Leave a comment'
              rows={3}
              disabled={isSubmitting}
              aria-label='Comment'
              aria-invalid={error != null}
              aria-describedby={error ? errorId : undefined}
            />
          </div>
          <ReviewComposerActions
            error={error}
            errorId={errorId}
            tokenHint={hasToken ? null : 'Add a GitHub token in the diffy popup to post comments.'}
            isSubmitting={isSubmitting}
            submitLabel={isBatchMode ? 'Add to review' : 'Comment'}
            submittingLabel='Posting…'
            onCancel={onCancel}
          />
        </ReviewComposerAuthor>
      </div>
    </ReviewComposerForm>
  );
}
