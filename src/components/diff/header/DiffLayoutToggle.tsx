import { IconColumns, IconLayoutRows } from '@tabler/icons-react';

import type { DiffLayout } from '@/lib/diff/layout-prefs';

type DiffLayoutToggleProps = {
  value: DiffLayout;
  onChange: (layout: DiffLayout) => void;
};

export function DiffLayoutToggle({ value, onChange }: DiffLayoutToggleProps) {
  return (
    <div
      className='gprv-layout-toggle'
      role='group'
      aria-label='Diff layout'
    >
      <button
        type='button'
        data-active={value === 'switched' ? '' : undefined}
        onClick={() => onChange('switched')}
        aria-label='Side-by-side diff'
        title='Side by side'
      >
        <IconColumns
          size={20}
          stroke={2}
        />
      </button>
      <button
        type='button'
        data-active={value === 'stacked' ? '' : undefined}
        onClick={() => onChange('stacked')}
        aria-label='Unified diff'
        title='Unified'
      >
        <IconLayoutRows
          size={20}
          stroke={2}
        />
      </button>
    </div>
  );
}
