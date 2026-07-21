import type { ReactNode } from 'react';

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
  return (
    <div
      className='gprv-segmented'
      data-wrap={wrap ? '' : undefined}
      role='group'
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type='button'
          className='gprv-segmented-button'
          data-active={option.value === value ? '' : undefined}
          aria-pressed={option.value === value}
          aria-label={showLabels ? undefined : option.label}
          title={option.label}
          onClick={() => onChange(option.value)}
        >
          {option.icon ? (
            <span
              className='gprv-segmented-icon'
              aria-hidden='true'
            >
              {option.icon}
            </span>
          ) : null}
          {showLabels ? <span className='gprv-segmented-text'>{option.label}</span> : null}
        </button>
      ))}
    </div>
  );
}
