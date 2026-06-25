import { IconAlertTriangle, IconCheck } from '@tabler/icons-react';

import type { FileViewedState } from '@/lib/github/graphql';

type FileViewedCheckboxProps = {
  state: FileViewedState | undefined;
  disabled?: boolean;
  onToggle: (next: boolean) => void;
};

export function FileViewedCheckbox({ state, disabled = false, onToggle }: FileViewedCheckboxProps) {
  const isViewed = state === 'VIEWED';
  const isDismissed = state === 'DISMISSED';

  return (
    <span className='gprv-viewed-control'>
      {isDismissed ? (
        <span
          className='gprv-file-dismissed-badge'
          title='This file changed since you last viewed it.'
        >
          <IconAlertTriangle
            size={11}
            stroke={2}
          />
          Changed since viewed
        </span>
      ) : null}
      <label
        className={`gprv-viewed-checkbox${isViewed ? ' gprv-viewed-checkbox-checked' : ''}`}
        title={isViewed ? 'Mark as not viewed' : 'Mark as viewed'}
        onClick={(event) => event.stopPropagation()}
      >
        <input
          type='checkbox'
          checked={isViewed}
          disabled={disabled}
          onChange={(event) => onToggle(event.target.checked)}
        />
        <span
          className='gprv-viewed-checkbox-box'
          aria-hidden='true'
        >
          <IconCheck
            size={11}
            stroke={3}
          />
        </span>
        Viewed
      </label>
    </span>
  );
}
