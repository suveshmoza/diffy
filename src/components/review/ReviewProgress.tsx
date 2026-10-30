import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const exact = new Intl.NumberFormat('en');
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

// Exact with thousands separators (1,234), abbreviated only for extreme counts (12.4K).
const formatCount = (value: number) =>
  value >= 10_000 ? compact.format(value) : exact.format(value);

type ReviewProgressProps = {
  viewed: number;
  total: number;
  onJumpToNextUnviewed: () => void;
};

export function ReviewProgress({ viewed, total, onJumpToNextUnviewed }: ReviewProgressProps) {
  if (!Number.isFinite(total) || total <= 0) {
    return null;
  }

  const safeViewed = Number.isFinite(viewed) ? Math.min(Math.max(viewed, 0), total) : 0;
  const isComplete = safeViewed >= total;

  const viewedLabel = formatCount(safeViewed);
  const totalLabel = formatCount(total);
  const exactSummary = `${exact.format(safeViewed)} of ${exact.format(total)} files viewed`;

  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      className={cn(
        'group h-auto w-full justify-between gap-2.5 px-2.5 py-1.5 font-normal',
        'disabled:opacity-100',
        isComplete &&
          'border-green-500/40 bg-green-500/5 text-green-700 hover:border-green-500/40 hover:bg-green-500/5 disabled:border-green-500/40 disabled:bg-green-500/5 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-400 dark:hover:border-green-500/40 dark:hover:bg-green-500/10 dark:disabled:border-green-500/40 dark:disabled:bg-green-500/10',
      )}
      onClick={onJumpToNextUnviewed}
      disabled={isComplete}
      title={
        isComplete
          ? `All ${exact.format(total)} files viewed`
          : `${exactSummary}. Jump to next unviewed file`
      }
      aria-label={
        isComplete
          ? `All ${exact.format(total)} files viewed`
          : `${exactSummary}. Jump to next unviewed file`
      }
    >
      <Progress
        value={getBarValue(safeViewed, total)}
        aria-hidden='true'
        className={cn(
          // min-w keeps the bar visible next to long counts like "2,999 / 3,000 viewed".
          'h-1 min-w-8 flex-1',
          '**:data-[slot=progress-indicator]:motion-reduce:transition-none',
          isComplete
            ? '**:data-[slot=progress-track]:bg-green-500/25 **:data-[slot=progress-indicator]:bg-green-500'
            : '**:data-[slot=progress-track]:bg-muted/80',
        )}
      />
      <span
        className={cn(
          'shrink-0 text-xs font-semibold whitespace-nowrap tabular-nums',
          isComplete && 'text-green-700 dark:text-green-400',
        )}
      >
        {viewedLabel} / {totalLabel}
      </span>
    </Button>
  );
}

/**
 * Bar fill, 0–100. With thousands of files one viewed file is a fraction of a pixel, and
 * 2,999 / 3,000 is visually identical to done, so the bar is kept between 2% and 98%
 * until the review is actually complete.
 */
function getBarValue(viewed: number, total: number) {
  if (viewed <= 0) return 0;
  if (viewed >= total) return 100;
  return Math.min(Math.max((viewed / total) * 100, 2), 98);
}

/** Placeholder matching ReviewProgress footprint while viewed-file counts load. */
export function ReviewProgressSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex h-auto w-full items-center justify-between gap-2.5 rounded-lg border border-border bg-background px-2.5 py-1.5 dark:border-input dark:bg-input/30',
        className,
      )}
      aria-busy='true'
      aria-label='Loading review progress'
    >
      <div className='h-1 min-w-8 flex-1 animate-pulse rounded-full bg-muted/80' />
      <div className='h-3 w-14 shrink-0 animate-pulse rounded bg-muted/80' />
    </div>
  );
}
