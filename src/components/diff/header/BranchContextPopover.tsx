import { IconArrow, IconCheck, IconCopy } from '@pierre/icons';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type BranchContextPopoverProps = {
  baseRef: string;
  headRef: string;
};

export const BranchContextPopover = memo(function BranchContextPopover({
  baseRef,
  headRef,
}: BranchContextPopoverProps) {
  const summary = `${baseRef} ← ${headRef}`;

  return (
    <div className='w-fit max-w-full self-start'>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='h-auto w-fit max-w-full justify-start px-0 py-0 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground data-popup-open:text-foreground'
              title={summary}
            />
          }
        >
          <span className='inline-flex min-w-0 max-w-full items-center gap-1'>
            <span className='truncate font-mono'>{baseRef}</span>
            <IconArrow
              className='shrink-0 opacity-70'
              size={14}
              aria-hidden='true'
            />
            <span className='truncate font-mono'>{headRef}</span>
          </span>
        </PopoverTrigger>
        <PopoverContent
          align='start'
          side='bottom'
          className='w-80'
        >
          <PopoverHeader>
            <PopoverTitle>Branch names</PopoverTitle>
          </PopoverHeader>
          <div className='flex flex-col gap-2'>
            <CopyableBranchRow
              label='Base'
              name={baseRef}
            />
            <CopyableBranchRow
              label='Head'
              name={headRef}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
});

type CopyableBranchRowProps = {
  label: string;
  name: string;
};

function CopyableBranchRow({ label, name }: CopyableBranchRowProps) {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (resetTimerRef.current != null) {
        window.clearTimeout(resetTimerRef.current);
      }
    },
    [],
  );

  const copy = useCallback(async () => {
    setCopied(true);
    if (resetTimerRef.current != null) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => setCopied(false), 750);

    try {
      await navigator.clipboard.writeText(name);
    } catch {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
      setCopied(false);
    }
  }, [name]);

  return (
    <div className='flex flex-col gap-1'>
      <span className='text-xs font-medium text-muted-foreground'>{label}</span>
      <Button
        type='button'
        variant='outline'
        size='sm'
        className='h-auto w-full justify-between gap-2 px-2 py-1.5 font-mono text-xs font-normal'
        title={`Copy ${name}`}
        aria-label={copied ? `Copied branch ${name}` : `Copy branch ${name}`}
        onClick={() => void copy()}
      >
        <code className='min-w-0 truncate'>{name}</code>
        <span
          className='relative size-3.5 shrink-0'
          aria-hidden='true'
        >
          <IconCopy
            className={cn(
              'absolute inset-0 transition-all',
              copied ? 'scale-75 opacity-0' : 'scale-100 opacity-70',
            )}
            size={14}
          />
          <IconCheck
            className={cn(
              'absolute inset-0 text-green-500 transition-all',
              copied ? 'scale-100 opacity-100' : 'scale-75 opacity-0',
            )}
            size={14}
          />
        </span>
      </Button>
    </div>
  );
}
