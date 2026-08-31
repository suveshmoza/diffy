import type { SelectedLineRange } from '@pierre/diffs';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatSelectedLineRangeLabel } from '@/lib/review/format-line-range';
import { cn } from '@/lib/utils';
import { useReview } from '@/providers/ReviewContext';
import { useReviewQueueContext } from '@/providers/ReviewQueueContext';

import { ReviewCommentBody } from './ReviewCommentBody';
import { ReviewMarkdownComposer } from './ReviewMarkdownComposer';

type QueuedCommentCardProps = {
  queuedId: string;
  itemId: string;
  body: string;
  range: SelectedLineRange;
};

export function QueuedCommentCard({ queuedId, itemId, body, range }: QueuedCommentCardProps) {
  const { removeQueued, editQueued } = useReviewQueueContext();
  const { actions, meta } = useReview();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(body);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const onRemove = useCallback(
    () => removeQueued(queuedId, itemId),
    [itemId, queuedId, removeQueued],
  );
  const onHighlight = useCallback(
    () => actions.highlightRange({ id: itemId, range }),
    [actions, itemId, range],
  );
  const onClearHighlight = useCallback(() => actions.clearHighlight(), [actions]);

  useEffect(() => {
    if (isEditing) {
      editRef.current?.focus({ preventScroll: true });
    }
  }, [isEditing]);

  const startEdit = useCallback(() => {
    setDraft(body);
    setIsEditing(true);
  }, [body]);

  const save = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== body) {
      editQueued(queuedId, itemId, trimmed);
    }
    setIsEditing(false);
  }, [body, draft, editQueued, itemId, queuedId]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsEditing(false);
      } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        save();
      }
    },
    [save],
  );

  return (
    <div className='box-border w-full min-w-0 max-w-full p-3.5 whitespace-normal text-foreground lg:max-w-lg'>
      <div
        className={cn(
          'box-border w-full min-w-0 max-w-[90%] rounded-[10px] border border-border bg-card p-4 text-foreground shadow-sm lg:max-w-full',
          'border-dashed',
        )}
        onMouseEnter={onHighlight}
        onMouseLeave={onClearHighlight}
      >
        <p className='mb-2.5 text-xs font-semibold text-foreground/65'>
          {formatSelectedLineRangeLabel(range)}
        </p>
        <div className='mb-1.5 flex items-center justify-between'>
          <Badge
            variant='secondary'
            className='h-auto px-1.5 py-0.5 text-[11px] font-bold tracking-wide uppercase'
          >
            Queued
          </Badge>
          {!isEditing ? (
            <div className='inline-flex items-center gap-1'>
              <Button
                type='button'
                variant='ghost'
                size='xs'
                onClick={startEdit}
                aria-label='Edit queued comment'
                title='Edit queued comment'
              >
                Edit
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='xs'
                onClick={onRemove}
                aria-label='Delete queued comment'
                title='Delete queued comment'
              >
                Delete
              </Button>
            </div>
          ) : null}
        </div>
        {isEditing ? (
          <div className='flex flex-col gap-2'>
            <ReviewMarkdownComposer
              ref={editRef}
              value={draft}
              onChange={setDraft}
              onKeyDown={handleKeyDown}
              rows={3}
            />
            <div className='mt-2.5 flex flex-wrap justify-end gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button
                type='button'
                size='sm'
                onClick={save}
                disabled={!draft.trim()}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <ReviewCommentBody
            body={body}
            pullRequestRef={meta.pullRequestRef}
            className='mt-0'
          />
        )}
      </div>
    </div>
  );
}
