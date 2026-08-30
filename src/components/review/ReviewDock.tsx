import { IconCheck, IconComment, IconX } from '@pierre/icons';
import { useCallback, useEffect, useRef, useState } from 'react';

import { SegmentedControl } from '@/components/diff/header/SegmentedControl';
import { IconChevronDown } from '@/components/icons/Chevron';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ReviewEvent } from '@/lib/github/review-write';
import {
  canPublishReview,
  confirmDiscardQueuedComments,
  getStopReviewLabel,
  publishButtonLabel,
  summaryLabel,
  summaryPlaceholder,
  verdictHelperText,
} from '@/lib/review/publish-review';
import { cn } from '@/lib/utils';
import { useReviewQueueContext } from '@/providers/ReviewQueueContext';

import { ReviewMarkdownComposer } from './ReviewMarkdownComposer';

const VERDICT_OPTIONS = [
  {
    value: 'COMMENT' as const,
    label: 'Comment',
    icon: <IconComment size={14} />,
  },
  {
    value: 'APPROVE' as const,
    label: 'Approve',
    icon: <IconCheck size={14} />,
  },
  {
    value: 'REQUEST_CHANGES' as const,
    label: 'Request changes',
    icon: <IconX size={14} />,
  },
];

export function ReviewDock() {
  const {
    pullRequestRef,
    queue,
    isReviewDockExpanded,
    expandReviewDock,
    collapseReviewDock,
    publishReview: onPublish,
    discardQueue: onDiscardAll,
    stopReview,
  } = useReviewQueueContext();
  const [event, setEvent] = useState<ReviewEvent>('COMMENT');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canPublish = canPublishReview(event, queue.length, body);
  const queuedCount = queue.length;
  const stopReviewLabel = getStopReviewLabel(queuedCount);

  useEffect(() => {
    if (!isReviewDockExpanded) {
      return;
    }
    textareaRef.current?.focus({ preventScroll: true });
  }, [isReviewDockExpanded]);

  const handleBodyChange = useCallback((next: string) => {
    setBody(next);
    setError(null);
  }, []);

  const handleEventChange = useCallback((next: ReviewEvent) => {
    setEvent(next);
    setError(null);
  }, []);

  const handlePublish = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await onPublish(event, body);
    } catch (publishError: unknown) {
      setError(publishError instanceof Error ? publishError.message : String(publishError));
      setIsSubmitting(false);
    }
  }, [body, event, onPublish]);

  useEffect(() => {
    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (!(keyboardEvent.metaKey || keyboardEvent.ctrlKey) || keyboardEvent.key !== 'Enter') {
        return;
      }

      if (!isReviewDockExpanded || isSubmitting || !canPublish) {
        return;
      }

      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
      void handlePublish();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [canPublish, handlePublish, isReviewDockExpanded, isSubmitting]);

  const handleDiscardAll = useCallback(() => {
    if (queuedCount === 0) {
      return;
    }

    if (!confirmDiscardQueuedComments(queuedCount)) {
      return;
    }

    onDiscardAll();
  }, [onDiscardAll, queuedCount]);

  if (!isReviewDockExpanded) {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center gap-3 border-t border-border bg-card px-3 py-2',
          'shadow-[0_-4px_24px_-8px_rgb(0_0_0/0.18)]',
        )}
        role='region'
        aria-label='Review in progress'
      >
        <div className='flex min-w-0 flex-1 items-center gap-2'>
          <span className='shrink-0 text-sm font-medium text-foreground'>Review in progress</span>
          {queuedCount > 0 ? (
            <Badge variant='secondary'>{queuedCount}</Badge>
          ) : (
            <span className='truncate text-xs text-muted-foreground'>
              Add comments on the diff or write a summary below
            </span>
          )}
        </div>
        <Button
          type='button'
          size='sm'
          onClick={expandReviewDock}
        >
          Finish review
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex max-h-[min(40vh,420px)] shrink-0 flex-col overflow-hidden border-t border-border bg-card',
        'shadow-[0_-4px_24px_-8px_rgb(0_0_0/0.18)]',
      )}
      role='region'
      aria-label='Finish review'
    >
      <div className='flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-2'>
        <div className='flex min-w-0 items-center gap-2'>
          <h2 className='text-sm font-semibold text-foreground'>Finish review</h2>
          {queuedCount > 0 ? <Badge variant='secondary'>{queuedCount}</Badge> : null}
        </div>
        <div className='flex shrink-0 items-center gap-1'>
          <Button
            type='button'
            variant='destructive'
            size='xs'
            onClick={stopReview}
            disabled={isSubmitting}
          >
            {stopReviewLabel}
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            onClick={collapseReviewDock}
            disabled={isSubmitting}
            aria-label='Collapse review dock'
            title='Collapse'
          >
            <IconChevronDown size={16} />
          </Button>
        </div>
      </div>

      <ScrollArea className='min-h-0 flex-1'>
        <div className='flex flex-col gap-4 px-3 py-3'>
          <section className='space-y-2'>
            <Label
              htmlFor='review-dock-summary'
              className='text-sm font-medium'
            >
              {summaryLabel(event)}
            </Label>
            <ReviewMarkdownComposer
              ref={textareaRef}
              id='review-dock-summary'
              value={body}
              onChange={handleBodyChange}
              placeholder={summaryPlaceholder(event)}
              rows={3}
              disabled={isSubmitting}
              pullRequestRef={pullRequestRef}
              aria-label='Review summary'
            />
          </section>

          <section className='space-y-2'>
            <Label className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
              Verdict
            </Label>
            <SegmentedControl
              ariaLabel='Review verdict'
              options={VERDICT_OPTIONS}
              value={event}
              onChange={handleEventChange}
            />
            <p className='text-xs leading-relaxed text-muted-foreground'>
              {verdictHelperText(event, queuedCount)}
            </p>
          </section>

          {error ? <p className='text-sm text-destructive'>{error}</p> : null}
        </div>
      </ScrollArea>

      <div className='flex shrink-0 flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2'>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={handleDiscardAll}
          disabled={isSubmitting || queuedCount === 0}
        >
          Discard all
        </Button>
        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={collapseReviewDock}
            disabled={isSubmitting}
          >
            Collapse
          </Button>
          <Button
            type='button'
            size='sm'
            onClick={() => void handlePublish()}
            disabled={isSubmitting || !canPublish}
          >
            {publishButtonLabel(event, isSubmitting)}
          </Button>
        </div>
      </div>
    </div>
  );
}
