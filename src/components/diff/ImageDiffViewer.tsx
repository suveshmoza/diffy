import { IconArrowsExpand } from '@pierre/icons';

import { IconSpinner } from '@/components/icons/Spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useImageDiffSources } from '@/hooks/useImageDiffSources';
import { formatDimensions, formatImageBytes, getResizeDelta } from '@/lib/diff/image-diff-meta';
import { formatFileChangeStatus, getImageDiffSides } from '@/lib/diff/media-files';
import type {
  GitHubPullRequest,
  GitHubPullRequestFile,
  GitHubPullRequestRef,
} from '@/lib/github/api';
import type { ReviewMediaImagePane } from '@/lib/review/comments';
import { cn } from '@/lib/utils';

const IMAGE_DIFF_CHECKERBOARD =
  'data-checkerboard:bg-background data-checkerboard:[background-image:linear-gradient(45deg,color-mix(in_srgb,var(--foreground)_8%,transparent)_25%,transparent_25%),linear-gradient(-45deg,color-mix(in_srgb,var(--foreground)_8%,transparent)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,color-mix(in_srgb,var(--foreground)_8%,transparent)_75%),linear-gradient(-45deg,transparent_75%,color-mix(in_srgb,var(--foreground)_8%,transparent)_75%)] data-checkerboard:[background-position:0_0,0_8px,8px_-8px,-8px_0] data-checkerboard:[background-size:16px_16px]';

type ImageDiffViewerProps = {
  file: GitHubPullRequestFile;
  pullRequest: GitHubPullRequest;
  pullRequestRef: GitHubPullRequestRef;
  pane: ReviewMediaImagePane;
  checkerboard: boolean;
  onExpand: (path: string) => void;
};

export function ImageDiffViewer({
  file,
  pullRequest,
  pullRequestRef,
  pane,
  checkerboard,
  onExpand,
}: ImageDiffViewerProps) {
  const sides = getImageDiffSides(file);
  const sources = useImageDiffSources({
    file,
    pullRequest,
    pullRequestRef,
    enabled: true,
    // Load both sides for resize metadata. Shared cache dedupes with the sibling pane.
    pane: 'only',
  });

  const showBefore = pane === 'before' || (pane === 'only' && sides.showBefore);
  const source = showBefore ? sources.before : sources.after;
  const sideLabel = showBefore ? 'before' : 'after';
  const resizeDelta = getResizeDelta(sources.before, sources.after);

  return (
    <div
      className='flex h-auto min-h-0 flex-col overflow-hidden bg-transparent'
      data-media-pane={pane}
      role='region'
      aria-label={`${file.filename} image (${sideLabel}, ${formatFileChangeStatus(file.status)})`}
    >
      <div className='min-h-0 flex-1 overflow-auto p-4'>
        {sources.status === 'loading' || sources.status === 'idle' ? (
          <div
            className='flex min-h-full flex-col items-center justify-center gap-2.5 text-center text-muted-foreground'
            role='status'
            aria-live='polite'
            aria-label='Loading media'
          >
            <IconSpinner
              size={28}
              className='animate-spin'
            />
            <p className='m-0 text-xs text-muted-foreground'>Loading media…</p>
          </div>
        ) : null}

        {sources.status === 'error' ? (
          <div className='flex min-h-full flex-col items-center justify-center gap-2.5 text-center text-muted-foreground'>
            <p className='m-0 text-sm text-foreground'>
              {sources.error ?? 'Failed to load image.'}
            </p>
          </div>
        ) : null}

        {sources.status === 'ready' && source ? (
          <figure className='m-0 flex min-h-0 min-w-0 flex-col gap-1.5'>
            <div
              className={cn(
                'group/frame relative flex min-h-40 max-h-[min(70vh,720px)] items-center justify-center overflow-auto bg-transparent p-3',
                IMAGE_DIFF_CHECKERBOARD,
              )}
              data-checkerboard={checkerboard ? '' : undefined}
            >
              <Button
                type='button'
                variant='outline'
                size='icon-sm'
                className='absolute top-2 right-2 z-1 bg-background/85 opacity-0 backdrop-blur-sm transition-opacity group-hover/frame:opacity-100 focus-visible:opacity-100'
                aria-label={`Expand ${file.filename} image comparison`}
                title='Expand image comparison'
                onClick={() => onExpand(file.filename)}
              >
                <IconArrowsExpand size={16} />
              </Button>
              <img
                className='block h-auto max-h-[min(66vh,680px)] w-auto max-w-full object-contain'
                src={source.url}
                alt={`${source.path} (${sideLabel})`}
              />
            </div>
            <figcaption className='flex flex-wrap items-center gap-x-2.5 gap-y-1.5 px-3 pb-1.5 text-[11px] leading-snug text-muted-foreground'>
              <span>
                {formatDimensions(source.width, source.height)} · {formatImageBytes(source.size)}
              </span>
              {!showBefore && resizeDelta?.changed ? (
                <Badge
                  variant='outline'
                  className='h-auto rounded-full border-primary/30 bg-primary/15 px-1.75 py-0.5 text-[11px] font-normal text-primary'
                >
                  Resized {resizeDelta.from} → {resizeDelta.to}
                </Badge>
              ) : null}
            </figcaption>
          </figure>
        ) : null}
      </div>
    </div>
  );
}
