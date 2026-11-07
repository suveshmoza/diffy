import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { GitHubPullRequestReviewComment } from '@/domains/github/api';
import { useGitHubAuth } from '@/domains/github/auth/GitHubAuthProvider';
import { useCommentSubmit } from '@/domains/review/hooks/useCommentSubmit';

import { ReviewComposerActions } from './review-composer/ReviewComposerActions';
import { ReviewComposerForm } from './review-composer/ReviewComposerForm';
import { createComposerValidator } from './review-composer/validation';
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

  useEffect(() => {
    const textarea = textareaRef.current;
    textarea?.focus({ preventScroll: true });
    if (textarea) {
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
  }, []);

  const validate = useMemo(
    () =>
      createComposerValidator({
        hasToken,
        empty: 'Write a comment before saving.',
        missingToken: 'Add a GitHub token in the diffy extension popup to edit comments.',
      }),
    [hasToken],
  );

  const { error, errorId, isSubmitting, onSubmit, reset } = useCommentSubmit({
    body,
    validate,
    submit: onSave,
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
      className='mt-1 grid gap-2'
      onSubmit={onSubmit}
      onCancel={onCancel}
    >
      <div className='mt-2 block w-full'>
        <ReviewMarkdownComposer
          ref={textareaRef}
          value={body}
          onChange={handleBodyChange}
          placeholder='Edit comment'
          rows={3}
          disabled={isSubmitting}
          aria-label='Edit comment'
          aria-invalid={error != null}
          aria-describedby={error ? errorId : undefined}
        />
      </div>
      <ReviewComposerActions
        error={error}
        errorId={errorId}
        tokenHint={hasToken ? null : 'Add a GitHub token in the diffy popup to edit comments.'}
        isSubmitting={isSubmitting}
        submitLabel='Save'
        submittingLabel='Saving…'
        onCancel={onCancel}
        hintSpacing={false}
      />
    </ReviewComposerForm>
  );
}
