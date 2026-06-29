import { IconCheck, IconMessageCircle, IconX } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';

import type { ReviewEvent } from '@/lib/github/review-write';
import { formatSelectedLineRangeLabel } from '@/lib/review/format-line-range';
import { useReviewQueueContext } from '@/providers/ReviewQueueContext';

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

  const handleKeyDown = useCallback(
    (keyEvent: KeyboardEvent) => {
      keyEvent.stopPropagation();
      if (keyEvent.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    },
    [isSubmitting, onClose],
  );

  return (
    <div
      className='gprv-publish-overlay'
      onKeyDown={handleKeyDown}
    >
      <div
        className='gprv-publish-backdrop'
        onClick={isSubmitting ? undefined : onClose}
      />
      <div
        className='gprv-publish-dialog'
        role='dialog'
        aria-modal='true'
        aria-label='Publish review'
      >
        <header className='gprv-publish-header'>
          <h2 className='gprv-publish-title'>Publish review</h2>
          <button
            type='button'
            className='gprv-header-icon-button'
            onClick={onClose}
            disabled={isSubmitting}
            aria-label='Close'
          >
            <IconX
              size={16}
              stroke={2}
            />
          </button>
        </header>

        <div className='gprv-publish-body'>
          <section className='gprv-publish-section'>
            <p className='gprv-publish-section-label'>
              {queue.length} queued {queue.length === 1 ? 'comment' : 'comments'}
            </p>
            {queue.length > 0 ? (
              <ul className='gprv-publish-queue-list'>
                {queue.map((entry) => (
                  <li
                    key={entry.queuedId}
                    className='gprv-publish-queue-item'
                  >
                    <div className='gprv-publish-queue-meta'>
                      <span className='gprv-publish-queue-path'>{entry.path}</span>
                      <span className='gprv-publish-queue-range'>
                        {formatSelectedLineRangeLabel(entry.range)}
                      </span>
                    </div>
                    <p className='gprv-publish-queue-body'>{entry.body}</p>
                    <button
                      type='button'
                      className='gprv-publish-queue-remove'
                      onClick={() => onRemoveQueued(entry.queuedId)}
                      disabled={isSubmitting}
                      aria-label='Remove queued comment'
                    >
                      <IconX
                        size={14}
                        stroke={2}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className='gprv-publish-empty'>
                No queued comments. Choose a verdict below. Add a summary or inline comments if you
                want.
              </p>
            )}
          </section>

          <section className='gprv-publish-section'>
            <label className='gprv-publish-section-label'>Summary (optional)</label>
            <textarea
              ref={textareaRef}
              className='gprv-review-composer-input'
              value={body}
              onChange={(changeEvent) => setBody(changeEvent.target.value)}
              placeholder='Leave an overall comment'
              rows={3}
              disabled={isSubmitting}
            />
          </section>

          <section className='gprv-publish-section'>
            <span className='gprv-publish-section-label'>Verdict</span>
            <div className='gprv-publish-verdict'>
              {EVENT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`gprv-publish-verdict-option${event === option.value ? ' gprv-publish-verdict-option-active' : ''}`}
                >
                  <input
                    type='radio'
                    name='gprv-review-event'
                    value={option.value}
                    checked={event === option.value}
                    onChange={() => setEvent(option.value)}
                    disabled={isSubmitting}
                  />
                  {option.value === 'APPROVE' ? (
                    <IconCheck
                      size={14}
                      stroke={2}
                    />
                  ) : option.value === 'COMMENT' ? (
                    <IconMessageCircle
                      size={14}
                      stroke={2}
                    />
                  ) : (
                    <IconX
                      size={14}
                      stroke={2}
                    />
                  )}
                  {option.label}
                </label>
              ))}
            </div>
          </section>

          {error ? <p className='gprv-review-composer-error'>{error}</p> : null}
        </div>

        <footer className='gprv-publish-footer'>
          <button
            type='button'
            className='gprv-review-composer-button gprv-review-composer-button-danger'
            onClick={onDiscardAll}
            disabled={isSubmitting || queue.length === 0}
          >
            Discard all
          </button>
          <div className='gprv-publish-footer-primary'>
            <button
              type='button'
              className='gprv-review-composer-button gprv-review-composer-button-secondary'
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type='button'
              className='gprv-review-composer-button gprv-review-composer-button-primary'
              onClick={() => void handlePublish()}
              disabled={isSubmitting || !canPublishReview(event, queue.length, body)}
            >
              {isSubmitting ? 'Publishing…' : 'Publish review'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
