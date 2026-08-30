import { IconAlertTriangle } from '@tabler/icons-react';
import { memo, useMemo } from 'react';

import type { RateLimitState } from '@/lib/github/api';

type HeaderStatusStripProps = {
  reviewCommentsLoadError?: string | null;
  rateLimit?: RateLimitState | null;
  viewedFilesError?: string | null;
};

type StatusItem = {
  id: string;
  label: string;
  title: string;
  tone: 'warning' | 'danger';
};

export const HeaderStatusStrip = memo(function HeaderStatusStrip({
  reviewCommentsLoadError,
  rateLimit,
  viewedFilesError,
}: HeaderStatusStripProps) {
  const items = useMemo(() => {
    const next: StatusItem[] = [];

    if (reviewCommentsLoadError) {
      next.push({
        id: 'review-comments',
        label: 'Review comments unavailable',
        title: reviewCommentsLoadError,
        tone: 'warning',
      });
    }

    if (rateLimit != null && rateLimit.remaining >= 0 && rateLimit.remaining <= 10) {
      const exhausted = rateLimit.remaining <= 0;
      next.push({
        id: 'rate-limit',
        label: exhausted ? 'API limit exhausted' : `${rateLimit.remaining} API requests remaining`,
        title: exhausted
          ? 'API rate limit exhausted. Add a token in the diffy popup.'
          : `${rateLimit.remaining} requests remaining — add a token to avoid hitting the limit.`,
        tone: exhausted ? 'danger' : 'warning',
      });
    }

    if (viewedFilesError) {
      next.push({
        id: 'viewed-files',
        label: 'Viewed sync failed',
        title: viewedFilesError,
        tone: 'warning',
      });
    }

    return next;
  }, [rateLimit, reviewCommentsLoadError, viewedFilesError]);

  if (items.length === 0) {
    return null;
  }

  const hasDanger = items.some((item) => item.tone === 'danger');

  return (
    <div
      className={`gprv-header-status-strip${hasDanger ? ' gprv-header-status-strip-danger' : ''}`}
      role='status'
      aria-live='polite'
    >
      <IconAlertTriangle
        size={14}
        stroke={2}
        className='gprv-header-status-icon'
        aria-hidden='true'
      />
      <p className='gprv-header-status-messages'>
        {items.map((item, index) => (
          <span key={item.id}>
            {index > 0 ? <span className='gprv-header-status-separator'> · </span> : null}
            <span title={item.title}>{item.label}</span>
          </span>
        ))}
      </p>
    </div>
  );
});
