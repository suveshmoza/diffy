import type { ReviewEvent } from '@/lib/github/review-write';

export function canPublishReview(
  event: ReviewEvent,
  queuedCount: number,
  body: string,
): boolean {
  if (event === 'APPROVE') {
    return true;
  }

  if (event === 'REQUEST_CHANGES') {
    return Boolean(body.trim());
  }

  return queuedCount > 0 || Boolean(body.trim());
}

export function publishButtonLabel(event: ReviewEvent, isSubmitting: boolean): string {
  if (isSubmitting) {
    return 'Publishing…';
  }

  switch (event) {
    case 'APPROVE':
      return 'Approve';
    case 'REQUEST_CHANGES':
      return 'Request changes';
    default:
      return 'Submit review';
  }
}

export function verdictHelperText(event: ReviewEvent, queuedCount: number): string {
  switch (event) {
    case 'APPROVE':
      return 'Approve this pull request. A summary and inline comments are optional.';
    case 'REQUEST_CHANGES':
      return 'Request changes requires a summary explaining what should be updated.';
    default:
      return queuedCount > 0
        ? `Submit ${queuedCount} inline ${queuedCount === 1 ? 'comment' : 'comments'} with optional summary feedback.`
        : 'Add a summary, queue inline comments on the diff, or switch to Approve.';
  }
}

export function summaryLabel(event: ReviewEvent): string {
  return event === 'REQUEST_CHANGES' ? 'Summary (required)' : 'Summary (optional)';
}

export function summaryPlaceholder(event: ReviewEvent): string {
  return event === 'REQUEST_CHANGES'
    ? 'Explain what needs to change before this can merge…'
    : 'Leave an overall comment (optional)';
}
