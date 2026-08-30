import { IconCheck, IconCiWarning } from '@pierre/icons';

import { Badge } from '@/components/ui/badge';
import type { FileViewedState } from '@/lib/github/graphql';
import { cn } from '@/lib/utils';

type FileViewedCheckboxProps = {
  state: FileViewedState | undefined;
  disabled?: boolean;
  onToggle: (next: boolean) => void;
};

export function FileViewedCheckbox({ state, disabled = false, onToggle }: FileViewedCheckboxProps) {
  const isViewed = state === 'VIEWED';
  const isDismissed = state === 'DISMISSED';

  return (
    <span className='inline-flex items-center gap-2'>
      {isDismissed ? (
        <Badge
          variant='destructive'
          className='h-5 gap-1 px-1.5 text-[11px] font-semibold'
          title='This file changed since you last viewed it.'
        >
          <IconCiWarning
            size={11}
            aria-hidden='true'
          />
          Changed since viewed
        </Badge>
      ) : null}
      <label
        className={cn(
          'inline-flex items-center gap-1.5 text-xs font-semibold select-none',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          isViewed ? 'text-foreground' : 'text-muted-foreground',
        )}
        title={isViewed ? 'Mark as not viewed' : 'Mark as viewed'}
        onClick={(event) => event.stopPropagation()}
      >
        <input
          type='checkbox'
          className='sr-only'
          checked={isViewed}
          disabled={disabled}
          onChange={(event) => onToggle(event.target.checked)}
        />
        <span
          className={cn(
            'inline-flex size-4 shrink-0 items-center justify-center rounded border-[1.5px] border-border',
            isViewed && 'border-primary bg-primary text-primary-foreground',
          )}
          aria-hidden='true'
        >
          <IconCheck
            size={11}
            className={cn('transition-opacity', isViewed ? 'opacity-100' : 'opacity-0')}
          />
        </span>
        Viewed
      </label>
    </span>
  );
}
