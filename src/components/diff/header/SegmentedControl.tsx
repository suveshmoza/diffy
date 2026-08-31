import type { ReactNode } from 'react';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

export type SegmentOption<T extends string | number> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

type SegmentedControlProps<T extends string | number> = {
  ariaLabel: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Allow buttons to wrap onto multiple rows when labels are long. */
  wrap?: boolean;
  /** Hide visible labels while retaining accessible names. */
  showLabels?: boolean;
};

/** Inline single-select control rendered as a row of mutually exclusive buttons. */
export function SegmentedControl<T extends string | number>({
  ariaLabel,
  options,
  value,
  onChange,
  wrap = false,
  showLabels = true,
}: SegmentedControlProps<T>) {
  const stringValue = String(value);

  return (
    <ToggleGroup
      variant='outline'
      spacing={0}
      value={[stringValue]}
      onValueChange={(next) => {
        const selected = next[0];
        if (selected == null || selected === '') {
          return;
        }
        onChange(selected as T);
      }}
      aria-label={ariaLabel}
      className={cn(wrap && 'h-auto flex-wrap')}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={String(option.value)}
          aria-label={showLabels ? undefined : option.label}
          title={option.label}
          size='default'
          className={cn(
            'not-aria-pressed:bg-transparent not-aria-pressed:hover:bg-muted/70 not-aria-pressed:hover:text-foreground',
            'aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm',
            'aria-pressed:hover:bg-background aria-pressed:hover:text-foreground',
            !showLabels && 'px-2',
          )}
        >
          {option.icon || showLabels ? (
            <span className='inline-flex items-center gap-1.5'>
              {option.icon ? (
                <span
                  className='inline-flex shrink-0'
                  aria-hidden='true'
                >
                  {option.icon}
                </span>
              ) : null}
              {showLabels ? <span>{option.label}</span> : null}
            </span>
          ) : null}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
