import { useCallback, useState } from 'react';

import type { GitHubPullRequestRef } from '@/lib/github';
import {
  createPendingReview,
  discardPendingReview,
  GitHubReviewWriteError,
  submitPendingReview,
  type ReviewSubmitEvent,
} from '@/lib/github-review-write';

type ReviewSessionBarProps = {
  pullRequestRef: GitHubPullRequestRef;
  commitId: string;
  pendingReviewId: number | null;
  pendingCommentCount: number;
  hasToken: boolean;
  isBusy: boolean;
  onPendingReviewIdChange: (reviewId: number | null) => void;
  onReviewSubmitted: () => void;
  onReviewDiscarded: () => void;
  onBusyChange: (busy: boolean) => void;
};

export function ReviewSessionBar({
  pullRequestRef,
  commitId,
  pendingReviewId,
  pendingCommentCount,
  hasToken,
  isBusy,
  onPendingReviewIdChange,
  onReviewSubmitted,
  onReviewDiscarded,
  onBusyChange,
}: ReviewSessionBarProps) {
  const [summary, setSummary] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleStartReview = useCallback(async () => {
    if (!hasToken) {
      setError('Add a GitHub token in the diffy popup to start a review.');
      return;
    }

    onBusyChange(true);
    setError(null);

    try {
      const review = await createPendingReview(pullRequestRef, commitId);
      onPendingReviewIdChange(review.id);
    } catch (startError: unknown) {
      setError(
        startError instanceof GitHubReviewWriteError
          ? startError.message
          : startError instanceof Error
            ? startError.message
            : String(startError),
      );
    } finally {
      onBusyChange(false);
    }
  }, [commitId, hasToken, onBusyChange, onPendingReviewIdChange, pullRequestRef]);

  const handleSubmitReview = useCallback(
    async (event: ReviewSubmitEvent) => {
      if (pendingReviewId == null) {
        return;
      }

      if (!hasToken) {
        setError('Add a GitHub token in the diffy popup to submit a review.');
        return;
      }

      onBusyChange(true);
      setError(null);

      try {
        await submitPendingReview(pullRequestRef, pendingReviewId, event, summary);
        setSummary('');
        onPendingReviewIdChange(null);
        onReviewSubmitted();
      } catch (submitError: unknown) {
        setError(
          submitError instanceof GitHubReviewWriteError
            ? submitError.message
            : submitError instanceof Error
              ? submitError.message
              : String(submitError),
        );
      } finally {
        onBusyChange(false);
      }
    },
    [
      hasToken,
      onBusyChange,
      onPendingReviewIdChange,
      onReviewSubmitted,
      pendingReviewId,
      pullRequestRef,
      summary,
    ],
  );

  const handleDiscardReview = useCallback(async () => {
    if (pendingReviewId == null) {
      return;
    }

    if (!hasToken) {
      setError('Add a GitHub token in the diffy popup to cancel a review.');
      return;
    }

    onBusyChange(true);
    setError(null);

    try {
      await discardPendingReview(pullRequestRef, pendingReviewId);
      setSummary('');
      onPendingReviewIdChange(null);
      onReviewDiscarded();
    } catch (discardError: unknown) {
      setError(
        discardError instanceof GitHubReviewWriteError
          ? discardError.message
          : discardError instanceof Error
            ? discardError.message
            : String(discardError),
      );
    } finally {
      onBusyChange(false);
    }
  }, [
    hasToken,
    onBusyChange,
    onPendingReviewIdChange,
    onReviewDiscarded,
    pendingReviewId,
    pullRequestRef,
  ]);

  if (pendingReviewId == null) {
    return (
      <div className='gprv-review-session-bar gprv-review-session-bar-idle'>
        <button
          type='button'
          className='gprv-review-session-start'
          onClick={() => void handleStartReview()}
          disabled={isBusy}
        >
          Start review
        </button>
        {error ? <p className='gprv-review-session-error'>{error}</p> : null}
      </div>
    );
  }

  const pendingLabel =
    pendingCommentCount === 1 ? '1 pending comment' : `${pendingCommentCount} pending comments`;

  return (
    <div className='gprv-review-session-bar gprv-review-session-bar-active'>
      <div className='gprv-review-session-summary'>
        <span className='gprv-review-session-pending-count'>{pendingLabel}</span>
        <label className='gprv-review-session-summary-field'>
          <span className='sr-only'>Review summary</span>
          <textarea
            className='gprv-review-session-summary-input'
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder='Write an optional summary for your review'
            rows={2}
            disabled={isBusy}
          />
        </label>
      </div>
      <div className='gprv-review-session-actions'>
        <button
          type='button'
          className='gprv-review-session-action gprv-review-session-action-secondary'
          onClick={() => void handleDiscardReview()}
          disabled={isBusy}
        >
          Cancel review
        </button>
        <button
          type='button'
          className='gprv-review-session-action'
          onClick={() => void handleSubmitReview('COMMENT')}
          disabled={isBusy}
        >
          Comment
        </button>
        <button
          type='button'
          className='gprv-review-session-action gprv-review-session-action-warning'
          onClick={() => void handleSubmitReview('REQUEST_CHANGES')}
          disabled={isBusy}
        >
          Request changes
        </button>
        <button
          type='button'
          className='gprv-review-session-action gprv-review-session-action-primary'
          onClick={() => void handleSubmitReview('APPROVE')}
          disabled={isBusy}
        >
          Approve
        </button>
      </div>
      {error ? <p className='gprv-review-session-error'>{error}</p> : null}
    </div>
  );
}
