import { IconArrowsExpand } from '@pierre/icons';

import { IconSpinner } from '@/components/icons/Spinner';
import { useImageDiffSources } from '@/hooks/useImageDiffSources';
import { formatDimensions, formatImageBytes, getResizeDelta } from '@/lib/diff/image-diff-meta';
import { formatFileChangeStatus, getImageDiffSides } from '@/lib/diff/media-files';
import type {
  GitHubPullRequest,
  GitHubPullRequestFile,
  GitHubPullRequestRef,
} from '@/lib/github/api';
import type { ReviewMediaImagePane } from '@/lib/review/comments';

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
      className='gprv-media-panel gprv-image-diff'
      data-media-pane={pane}
      role='region'
      aria-label={`${file.filename} image (${sideLabel}, ${formatFileChangeStatus(file.status)})`}
    >
      <div className='gprv-media-panel-body'>
        {sources.status === 'loading' || sources.status === 'idle' ? (
          <div
            className='gprv-media-panel-body-centered'
            role='status'
            aria-live='polite'
            aria-label='Loading media'
          >
            <IconSpinner
              size={28}
              className='gprv-loading-spinner'
            />
            <p className='gprv-media-panel-hint'>Loading media…</p>
          </div>
        ) : null}

        {sources.status === 'error' ? (
          <div className='gprv-media-panel-body-centered'>
            <p className='gprv-media-panel-message'>{sources.error ?? 'Failed to load image.'}</p>
          </div>
        ) : null}

        {sources.status === 'ready' && source ? (
          <figure className='gprv-image-diff-pane'>
            <div
              className='gprv-image-diff-frame'
              data-checkerboard={checkerboard ? '' : undefined}
            >
              <button
                type='button'
                className='gprv-image-diff-expand'
                aria-label={`Expand ${file.filename} image comparison`}
                title='Expand image comparison'
                onClick={() => onExpand(file.filename)}
              >
                <IconArrowsExpand size={16} />
              </button>
              <img
                className='gprv-image-diff-img'
                src={source.url}
                alt={`${source.path} (${sideLabel})`}
              />
            </div>
            <figcaption className='gprv-image-diff-caption'>
              <span>
                {formatDimensions(source.width, source.height)} · {formatImageBytes(source.size)}
              </span>
              {!showBefore && resizeDelta?.changed ? (
                <span className='gprv-image-diff-resized'>
                  Resized {resizeDelta.from} → {resizeDelta.to}
                </span>
              ) : null}
            </figcaption>
          </figure>
        ) : null}
      </div>
    </div>
  );
}
