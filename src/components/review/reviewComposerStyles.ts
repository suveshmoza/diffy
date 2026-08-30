import { cn } from '@/lib/utils';

export const reviewTextareaClassName = cn(
  'flex min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none',
  'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
  'disabled:cursor-not-allowed disabled:opacity-50',
);

export const reviewThreadShellClassName =
  'box-border w-full min-w-0 max-w-full p-3.5 whitespace-normal text-foreground lg:max-w-lg';

export const reviewThreadCardClassName =
  'box-border w-full min-w-0 max-w-[90%] rounded-[10px] border border-border bg-card p-4 text-foreground shadow-sm lg:max-w-full';

export const reviewCommentRowClassName = 'flex w-full min-w-0 max-w-full items-start gap-2';

export const reviewAvatarClassName =
  'inline-flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-[11px] font-bold text-primary';

export const reviewCommentContentClassName = 'min-w-0 max-w-full flex-1';

export const reviewLineRangeClassName = 'mb-2.5 text-xs font-semibold text-foreground/65';

export const reviewComposerActionsClassName = 'mt-2.5 flex flex-wrap justify-end gap-2';
