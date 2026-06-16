import type { ReactNode } from 'react';

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

type SegmentedControlProps<T extends string> = {
  ariaLabel: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Allow buttons to wrap onto multiple rows when labels are long. */
  wrap?: boolean;
};

/** Inline single-select control rendered as a row of mutually exclusive buttons. */
export function SegmentedControl<T extends string>({
  ariaLabel,
  options,
  value,
  onChange,
  wrap = false,
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
          <span className='gprv-segmented-text'>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
