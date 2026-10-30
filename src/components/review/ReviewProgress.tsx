import { IconCheck } from '@pierre/icons';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type ReviewProgressProps = {
  viewed: number;
  total: number;
  onJumpToNextUnviewed: () => void;
};

export function ReviewProgress({ viewed, total, onJumpToNextUnviewed }: ReviewProgressProps) {
  if (total <= 0) {
    return null;
  }

  const isComplete = viewed >= total;
  const percent = Math.min(Math.max((viewed / total) * 100, 0), 100);
  const progressValue = viewed > 0 ? Math.max(percent, 2) : 0;

  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      className={cn(
        'group h-auto w-full flex-col items-stretch gap-2 px-3 py-2.5 font-normal',
        'disabled:opacity-100',
        isComplete &&
          'border-green-500/50 bg-green-500/15 text-green-700 hover:border-green-500/50 hover:bg-green-500/15 disabled:border-green-500/50 disabled:bg-green-500/15 dark:border-green-500/50 dark:bg-green-500/15 dark:text-green-400 dark:hover:border-green-500/50 dark:hover:bg-green-500/15 dark:disabled:border-green-500/50 dark:disabled:bg-green-500/15',
      )}
      onClick={onJumpToNextUnviewed}
      disabled={isComplete}
      title={isComplete ? 'All files viewed' : 'Jump to next unviewed file'}
      aria-label={
        isComplete
          ? `All ${total} files viewed`
          : `${viewed} of ${total} files viewed. Jump to next unviewed file`
      }
    >
      <span className='flex w-full items-center justify-between gap-2 text-xs'>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 font-medium tabular-nums',
            isComplete && 'text-green-700 dark:text-green-400',
          )}
        >
          {isComplete ? `All ${total} viewed` : `${viewed} of ${total} viewed`}
        </span>
        {isComplete ? (
          <IconCheck
            className='text-green-700 dark:text-green-400'
            size={16}
          />
        ) : null}
      </span>

      <Progress
        value={progressValue}
        aria-hidden='true'
        className={cn(
          'h-1.5 w-full',
          '**:data-[slot=progress-indicator]:motion-reduce:transition-none',
          isComplete
            ? '**:data-[slot=progress-track]:bg-green-500/25 **:data-[slot=progress-indicator]:bg-green-700 dark:**:data-[slot=progress-indicator]:bg-green-400'
            : '**:data-[slot=progress-track]:bg-muted/80',
        )}
      />
    </Button>
  );
}
