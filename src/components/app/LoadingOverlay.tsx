import { useState } from 'react';

import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress';
import type { LoadProgress } from '@/lib/github/api';

import { ChromeModal } from './ChromeModal';

type LoadingOverlayProps = {
  onClose: () => void;
  progress?: LoadProgress | null;
  /** Data is fetched; waiting on theme resolution or viewer mount. */
  opening?: boolean;
};

function formatProgress(progress: LoadProgress): string {
  switch (progress.phase) {
    case 'metadata':
      return 'Loading metadata…';
    case 'files':
      return progress.total > 0
        ? `Loading files (${progress.loaded}/${progress.total})…`
        : 'Loading files…';
    case 'comments':
      return 'Loading comments…';
    case 'diff':
      return 'Loading diff…';
    case 'building':
      return 'Building viewer…';
    default:
      return 'Loading…';
  }
}

function progressPercent(progress: LoadProgress): number | null {
  if (progress.total <= 1) {
    return null;
  }
  return Math.round((progress.loaded / progress.total) * 100);
}

export function LoadingOverlay({ onClose, progress, opening = false }: LoadingOverlayProps) {
  const message = progress ? formatProgress(progress) : 'Loading PR…';

  const rawPct = progress ? progressPercent(progress) : null;
  const [maxPct, setMaxPct] = useState(0);

  if (!progress && !opening) {
    if (maxPct !== 0) {
      setMaxPct(0);
    }
  } else if (rawPct !== null && rawPct > maxPct) {
    setMaxPct(rawPct);
  }

  const displayPct = Math.min(maxPct, 100);
  const isOpening = opening || displayPct >= 100;
  const progressValue = isOpening ? 100 : displayPct;
  const progressLabel = isOpening ? 'Opening diff viewer…' : message;

  return (
    <ChromeModal
      title={'Loading PR...'}
      onClose={onClose}
    >
      <div className='flex h-full min-h-0 items-center justify-center overflow-auto px-6 py-8'>
        <div className='w-full max-w-lg'>
          <Progress
            value={progressValue}
            className='w-full'
          >
            <ProgressLabel className='min-w-0 flex-1 text-left text-[15px] font-normal leading-normal text-foreground'>
              {progressLabel}
            </ProgressLabel>
            <ProgressValue />
          </Progress>

          {!isOpening ? (
            <p className='m-0 mt-5 text-center text-sm leading-normal text-muted-foreground'>
              Large pull requests may take a few seconds.
            </p>
          ) : null}
        </div>
      </div>
    </ChromeModal>
  );
}
