import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ReviewProgressProps = {
  viewed: number;
  total: number;
  onJumpToNextUnviewed: () => void;
};

export function ReviewProgress({ viewed, total, onJumpToNextUnviewed }: ReviewProgressProps) {
  if (total === 0) {
    return null;
  }

  const isComplete = viewed >= total;
  const percent = Math.round((viewed / total) * 100);

  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      className={cn(
        'h-auto w-full justify-between gap-2.5 px-2.5 py-1.5 font-normal',
        'border-[var(--trees-theme-input-border,var(--border))]',
        'bg-[var(--trees-theme-input-bg,var(--background))]',
        'text-[var(--trees-theme-sidebar-fg,var(--foreground))]',
        'hover:border-[var(--trees-theme-focus-ring,var(--ring))]',
        'hover:bg-[var(--trees-theme-input-bg,var(--background))]',
        isComplete &&
          'border-green-500/40 bg-green-500/5 hover:border-green-500/40 hover:bg-green-500/5',
      )}
      onClick={onJumpToNextUnviewed}
      disabled={isComplete}
      title={isComplete ? 'All files viewed' : 'Jump to next unviewed file'}
      aria-label={`${viewed} of ${total} files viewed`}
    >
      <span
        className='h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-muted/80'
        aria-hidden='true'
      >
        <span
          className={cn(
            'block h-full rounded-full transition-[width] duration-200',
            isComplete ? 'bg-green-500' : 'bg-primary',
          )}
          style={{ width: `${percent}%` }}
        />
      </span>
      <span className='shrink-0 text-xs font-semibold whitespace-nowrap tabular-nums'>
        {viewed} / {total} viewed
      </span>
    </Button>
  );
}
