import { IconCiWarning } from '@pierre/icons';
import { memo, useMemo } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import type { RateLimitState } from '@/lib/github/api';
import { cn } from '@/lib/utils';

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
    <Alert
      variant={hasDanger ? 'destructive' : 'default'}
      className={cn(
        'rounded-none border-0 border-b px-3 py-1.5',
        !hasDanger &&
          'bg-amber-500/10 text-amber-100 **:data-[slot=alert-description]:text-amber-100/90',
      )}
      role='status'
      aria-live='polite'
    >
      <IconCiWarning aria-hidden='true' />
      <AlertDescription className='truncate text-xs'>
        {items.map((item, index) => (
          <span key={item.id}>
            {index > 0 ? <span className='text-muted-foreground'> · </span> : null}
            <span title={item.title}>{item.label}</span>
          </span>
        ))}
      </AlertDescription>
    </Alert>
  );
});
