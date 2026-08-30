import { IconDiffSplit, IconDiffUnified } from '@pierre/icons';

import { Button } from '@/components/ui/button';
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
    <Button
      type='button'
      variant='ghost'
      size='icon-sm'
      onClick={() => onChange(nextLayout)}
      aria-label={`Switch to ${nextLabel}`}
      title={`Switch to ${nextLabel}`}
    >
      {isSideBySide ? <IconDiffSplit size={16} /> : <IconDiffUnified size={16} />}
    </Button>
  );
}
