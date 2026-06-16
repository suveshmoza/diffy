import { useCallback, useId, useRef, useState, type ReactNode } from 'react';

import { usePopoverDismiss } from '@/hooks/usePopoverDismiss';

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
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  usePopoverDismiss(isOpen, rootRef, close);

  const handleSelect = useCallback(
    (next: T) => {
      onSelect(next);
      close();
    },
    [close, onSelect],
  );

  return (
    <div
      ref={rootRef}
      className='gprv-header-popover'
    >
      <button
        type='button'
        className='gprv-header-icon-button gprv-header-popover-trigger'
        aria-label={label}
        aria-haspopup='listbox'
        aria-expanded={isOpen}
        aria-controls={listboxId}
        title={label}
        onClick={() => setIsOpen((open) => !open)}
      >
        {icon}
      </button>

      {isOpen ? (
        <ul
          id={listboxId}
          className='gprv-header-popover-menu'
          role='listbox'
          aria-label={menuLabel}
        >
          {options.map((option) => (
            <li key={option.value}>
              <button
                type='button'
                className='gprv-header-popover-option'
                role='option'
                aria-selected={option.value === value}
                data-selected={option.value === value ? '' : undefined}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
