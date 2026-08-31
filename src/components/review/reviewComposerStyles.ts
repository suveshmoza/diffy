import { cn } from '@/lib/utils';

export const reviewTextareaClassName = cn(
  'flex min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none',
  'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
  'disabled:cursor-not-allowed disabled:opacity-50',
);

export const reviewComposerToolbarClassName = 'flex items-center';

export const reviewPreviewPaneClassName = cn(
  'flex min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm',
);
