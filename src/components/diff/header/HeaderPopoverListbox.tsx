import { useCallback, useId, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { OverflowMenuItem } from './overflowMenuUi';

export type HeaderPopoverOption<T extends string> = {
  value: T;
  label: string;
};

type HeaderPopoverListboxProps<T extends string> = {
  icon: ReactNode;
  /** Accessible label for the trigger (also used as its tooltip). */
  label: string;
  /** Accessible label for the listbox. */
  menuLabel: string;
  options: readonly HeaderPopoverOption<T>[];
  value: T;
  onSelect: (next: T) => void;
};

/**
 * Single-select popover rendered as an ARIA listbox. Selecting an option
 * closes the popover, matching native select semantics.
 */
export function HeaderPopoverListbox<T extends string>({
  icon,
  label,
  menuLabel,
  options,
  value,
  onSelect,
}: HeaderPopoverListboxProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const listboxId = useId();

  const handleSelect = useCallback(
    (next: T) => {
      onSelect(next);
      setIsOpen(false);
    },
    [onSelect],
  );

  return (
    <Popover
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <PopoverTrigger
        render={
          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            aria-label={label}
            aria-haspopup='listbox'
            aria-expanded={isOpen}
            aria-controls={isOpen ? listboxId : undefined}
            title={label}
          />
        }
      >
        {icon}
      </PopoverTrigger>
      <PopoverContent
        id={listboxId}
        align='end'
        className='w-44 p-1'
      >
        <ul
          role='listbox'
          aria-label={menuLabel}
          className='flex flex-col gap-0.5'
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value}>
                <OverflowMenuItem
                  label={option.label}
                  selected={isSelected}
                  role='option'
                  onClick={() => handleSelect(option.value)}
                />
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
