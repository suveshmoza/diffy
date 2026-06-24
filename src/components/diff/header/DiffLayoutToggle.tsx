import { IconColumns, IconLayoutRows } from '@tabler/icons-react';

import type { DiffLayout } from '@/lib/diff/layout-prefs';

type DiffLayoutToggleProps = {
  value: DiffLayout;
  onChange: (layout: DiffLayout) => void;
};

export function DiffLayoutToggle({ value, onChange }: DiffLayoutToggleProps) {
  const isSideBySide = value === 'switched';
  const nextLayout = isSideBySide ? 'stacked' : 'switched';
  const nextLabel = isSideBySide ? 'unified diff' : 'side-by-side diff';

  return (
    <button
      type='button'
      className='gprv-header-icon-button'
      onClick={() => onChange(nextLayout)}
      aria-label={`Switch to ${nextLabel}`}
      title={`Switch to ${nextLabel}`}
    >
      {isSideBySide ? (
        <IconColumns
          size={16}
          stroke={2}
        />
      ) : (
        <IconLayoutRows
          size={16}
          stroke={2}
        />
      )}
    </button>
  );
}
