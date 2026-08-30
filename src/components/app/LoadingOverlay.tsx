import { useState } from 'react';

import type { LoadProgress } from '@/lib/github/api';

import { ChromeModal } from './ChromeModal';

type LoadingOverlayProps = {
  onClose: () => void;
  progress?: LoadProgress | null;
};

function formatProgress(progress: LoadProgress): string {
  switch (progress.phase) {
    case 'metadata':
      return 'Fetching pull request metadata…';
    case 'files':
      return progress.total > 0
        ? `Fetching changed files (${progress.loaded}/${progress.total})…`
        : 'Fetching changed files…';
    case 'comments':
      return 'Fetching review comments…';
    case 'diff':
      return 'Fetching diff…';
    case 'building':
      return 'Building diff viewer…';
    default:
      return 'Loading…';
  }
}

function progressPercent(progress: LoadProgress): number | null {
  if (progress.total <= 1) return null;
  return Math.round((progress.loaded / progress.total) * 100);
}

export function LoadingOverlay({ onClose, progress }: LoadingOverlayProps) {
  const message = progress
    ? formatProgress(progress)
    : 'Fetching pull request metadata and changed files…';

  const rawPct = progress ? progressPercent(progress) : null;
  const [maxPct, setMaxPct] = useState(0);

  if (!progress) {
    if (maxPct !== 0) {
      setMaxPct(0);
    }
  } else if (rawPct !== null && rawPct > maxPct) {
    setMaxPct(rawPct);
  }

  const displayPct = Math.min(maxPct, 100);
  const complete = displayPct >= 100;

  const statusMessage = complete ? 'Opening diff viewer…' : message;
  const hint = complete ? 'Almost there…' : 'Large pull requests may take a few seconds.';

  return (
    <ChromeModal
      title='Loading PR diff…'
      onClose={onClose}
    >
      <div className='flex h-full min-h-0 items-center justify-center overflow-auto'>
        <div
          className='grid max-w-lg justify-items-center gap-5 px-6 py-8 text-center'
          role='status'
          aria-live='polite'
          aria-label='Loading pull request diff'
        >
          {!complete && (
            <div
              className='h-1.5 w-full overflow-hidden rounded-full bg-border'
              role='progressbar'
              aria-valuenow={displayPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className='h-full rounded-full bg-primary transition-[width] duration-300 ease-out'
                style={{ width: `${displayPct}%` }}
              />
            </div>
          )}
          <p className='m-0 text-[15px] leading-normal text-foreground'>{statusMessage}</p>
          <p className='m-0 text-sm leading-normal text-muted-foreground'>{hint}</p>
        </div>
      </div>
    </ChromeModal>
  );
}
