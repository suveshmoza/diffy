import { IconLoader } from '@tabler/icons-react';

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

export function LoadingOverlay({ onClose, progress }: LoadingOverlayProps) {
  const message = progress
    ? formatProgress(progress)
    : 'Fetching pull request metadata and changed files…';

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
          <IconLoader
            size={48}
            stroke={2}
            className='gprv-loading-spinner'
          />
          <p className='gprv-loading-summary'>{message}</p>
          <p className='gprv-loading-hint'>Large pull requests may take a few seconds.</p>
        </div>
      </div>
    </ChromeModal>
  );
}
