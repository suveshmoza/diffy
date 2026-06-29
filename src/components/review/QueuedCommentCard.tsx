import type { SelectedLineRange } from '@pierre/diffs';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

import { formatSelectedLineRangeLabel } from '@/lib/review/format-line-range';
import { useReview } from '@/providers/ReviewContext';
import { useReviewQueueContext } from '@/providers/ReviewQueueContext';

type QueuedCommentCardProps = {
  queuedId: string;
  itemId: string;
  body: string;
  range: SelectedLineRange;
};

export function QueuedCommentCard({ queuedId, itemId, body, range }: QueuedCommentCardProps) {
  const { removeQueued, editQueued } = useReviewQueueContext();
  const { actions } = useReview();
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
    <div className='gprv-review-thread-shell'>
      <div
        className='gprv-review-thread gprv-review-queued'
        onMouseEnter={onHighlight}
        onMouseLeave={onClearHighlight}
      >
        <p className='gprv-review-line-range'>{formatSelectedLineRangeLabel(range)}</p>
        <div className='gprv-review-queued-header'>
          <span className='gprv-queued-badge'>Queued</span>
          {!isEditing ? (
            <div className='gprv-review-comment-actions'>
              <button
                type='button'
                className='gprv-review-comment-action'
                onClick={startEdit}
                aria-label='Edit queued comment'
                title='Edit queued comment'
              >
                Edit
              </button>
              <button
                type='button'
                className='gprv-review-comment-action'
                onClick={onRemove}
                aria-label='Delete queued comment'
                title='Delete queued comment'
              >
                Delete
              </button>
            </div>
          ) : null}
        </div>
        {isEditing ? (
          <div className='gprv-review-queued-edit'>
            <textarea
              ref={editRef}
              className='gprv-review-composer-input'
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
            />
            <div className='gprv-review-composer-actions'>
              <button
                type='button'
                className='gprv-review-composer-button gprv-review-composer-button-secondary'
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
              <button
                type='button'
                className='gprv-review-composer-button gprv-review-composer-button-primary'
                onClick={save}
                disabled={!draft.trim()}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <p className='gprv-review-queued-body'>{body}</p>
        )}
      </div>
    </div>
  );
}
