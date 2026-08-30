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
      <div className='gprv-modal-body gprv-modal-body-centered'>
        <div
          className='gprv-loading-panel'
          role='status'
          aria-live='polite'
          aria-label='Loading pull request diff'
        >
          {!complete && (
            <div
              className='gprv-progress-bar'
              role='progressbar'
              aria-valuenow={displayPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className='gprv-progress-bar-fill'
                style={{ width: `${displayPct}%` }}
              />
            </div>
          )}
          <p className='gprv-loading-summary'>{statusMessage}</p>
          <p className='gprv-loading-hint'>{hint}</p>
        </div>
      </div>
    </ChromeModal>
  );
}
