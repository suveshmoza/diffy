import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/utils';

import { PR_STATE, type PrState } from './pr-state';

export function PrStateBadge({ state }: { state: PrState }) {
  const { label, className } = PR_STATE[state];

  return (
    <Badge
      variant='outline'
      className={cn('gap-1.5 text-[10px] font-medium', className)}
    >
      {label}
    </Badge>
  );
}
