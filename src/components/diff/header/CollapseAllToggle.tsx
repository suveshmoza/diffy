import { IconChevrons, IconChevronsClose } from '@pierre/icons';

import { Button } from '@/components/ui/button';

type CollapseAllToggleProps = {
  allCollapsed: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
};

export function CollapseAllToggle({
  allCollapsed,
  onExpandAll,
  onCollapseAll,
}: CollapseAllToggleProps) {
  const label = allCollapsed ? 'Expand all files' : 'Collapse all files';

  return (
    <Button
      type='button'
      variant='ghost'
      size='icon-sm'
      onClick={() => (allCollapsed ? onExpandAll() : onCollapseAll())}
      aria-label={label}
      title={label}
    >
      {allCollapsed ? <IconChevronsClose /> : <IconChevrons />}
    </Button>
  );
}
