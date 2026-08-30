import { IconCheck, IconComment, IconX } from '@pierre/icons';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ReviewEvent } from '@/lib/github/review-write';
import { formatSelectedLineRangeLabel } from '@/lib/review/format-line-range';
import { useReview } from '@/providers/ReviewContext';
import { useReviewQueueContext } from '@/providers/ReviewQueueContext';

import { ReviewCommentBody } from './ReviewCommentBody';
import { ReviewMarkdownComposer } from './ReviewMarkdownComposer';

const EVENT_OPTIONS: ReadonlyArray<{ value: ReviewEvent; label: string }> = [
  { value: 'COMMENT', label: 'Comment' },
  { value: 'APPROVE', label: 'Approve' },
  { value: 'REQUEST_CHANGES', label: 'Request changes' },
];

function canPublishReview(event: ReviewEvent, queuedCount: number, body: string): boolean {
  if (event === 'APPROVE') {
    return true;
  }

  if (event === 'REQUEST_CHANGES') {
    return Boolean(body.trim());
  }

  return queuedCount > 0 || Boolean(body.trim());
}

export function PublishReviewDialog() {
  const {
    queue,
    removeQueuedById: onRemoveQueued,
    publishReview: onPublish,
    discardQueue: onDiscardAll,
    closePublishDialog: onClose,
  } = useReviewQueueContext();
  const { meta } = useReview();
  const [event, setEvent] = useState<ReviewEvent>('COMMENT');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus({ preventScroll: true });
  }, []);

  const handlePublish = useCallback(async () => {
    if (event === 'REQUEST_CHANGES' && !body.trim()) {
      setError('A summary is required when requesting changes.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onPublish(event, body);
    } catch (publishError: unknown) {
      setError(publishError instanceof Error ? publishError.message : String(publishError));
      setIsSubmitting(false);
    }
  }, [body, event, onPublish]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && !isSubmitting) {
        onClose();
      }
    },
    [isSubmitting, onClose],
  );

  return (
    <Dialog
      open
      onOpenChange={handleOpenChange}
    >
      <DialogContent
        className='diffy-dialog flex max-h-[80vh] w-[calc(100%-3rem)] max-w-lg flex-col gap-0 p-0 sm:max-w-lg'
        showCloseButton={false}
      >
        <DialogHeader className='flex-row items-center justify-between space-y-0 border-b px-4 py-3.5'>
          <DialogTitle>Publish review</DialogTitle>
          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            onClick={onClose}
            disabled={isSubmitting}
            aria-label='Close'
          >
            <IconX size={16} />
          </Button>
        </DialogHeader>

        <ScrollArea className='max-h-[min(60vh,520px)]'>
          <div className='flex flex-col gap-4 p-4'>
            <section className='flex flex-col gap-2'>
              <Label className='text-xs text-muted-foreground'>
                {queue.length} queued {queue.length === 1 ? 'comment' : 'comments'}
              </Label>
              {queue.length > 0 ? (
                <ul className='flex flex-col gap-2'>
                  {queue.map((entry) => (
                    <li
                      key={entry.queuedId}
                      className='relative rounded-lg border bg-card p-2.5 pr-9'
                    >
                      <div className='mb-1 flex gap-2'>
                        <span className='truncate text-xs font-semibold'>{entry.path}</span>
                        <span className='shrink-0 text-xs text-muted-foreground'>
                          {formatSelectedLineRangeLabel(entry.range)}
                        </span>
                      </div>
                      <ReviewCommentBody
                        body={entry.body}
                        pullRequestRef={meta.pullRequestRef}
                        clamp
                        className='mt-0'
                      />
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon-xs'
                        className='absolute top-2 right-2 text-muted-foreground'
                        onClick={() => onRemoveQueued(entry.queuedId)}
                        disabled={isSubmitting}
                        aria-label='Remove queued comment'
                      >
                        <IconX size={14} />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className='text-sm text-muted-foreground'>
                  No queued comments. Choose a verdict below. Add a summary or inline comments if
                  you want.
                </p>
              )}
            </section>

            <section className='flex flex-col gap-2'>
              <Label htmlFor='publish-review-summary'>Summary (optional)</Label>
              <ReviewMarkdownComposer
                ref={textareaRef}
                id='publish-review-summary'
                value={body}
                onChange={setBody}
                placeholder='Leave an overall comment'
                rows={3}
                disabled={isSubmitting}
              />
            </section>

            <section className='flex flex-col gap-2'>
              <Label>Verdict</Label>
              <ToggleGroup
                variant='outline'
                spacing={0}
                value={[event]}
                onValueChange={(next) => {
                  const selected = next[0];
                  if (selected) {
                    setEvent(selected as ReviewEvent);
                  }
                }}
                className='w-full'
              >
                {EVENT_OPTIONS.map((option) => (
                  <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    disabled={isSubmitting}
                    className='flex-1 gap-1.5'
                  >
                    {option.value === 'APPROVE' ? (
                      <IconCheck size={14} />
                    ) : option.value === 'COMMENT' ? (
                      <IconComment size={14} />
                    ) : (
                      <IconX size={14} />
                    )}
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </section>

            {error ? <p className='text-sm text-destructive'>{error}</p> : null}
          </div>
        </ScrollArea>

        <DialogFooter className='flex-row items-center justify-between gap-2 border-t bg-muted/30 px-4 py-3 sm:justify-between'>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={onDiscardAll}
            disabled={isSubmitting || queue.length === 0}
          >
            Discard all
          </Button>
          <div className='flex gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type='button'
              size='sm'
              onClick={() => void handlePublish()}
              disabled={isSubmitting || !canPublishReview(event, queue.length, body)}
            >
              {isSubmitting ? 'Publishing…' : 'Publish'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
