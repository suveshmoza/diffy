import { IconLoader } from '@tabler/icons-react';

import { ChromeModal } from './ChromeModal';

type LoadingOverlayProps = {
  onClose: () => void;
};

export function LoadingOverlay({ onClose }: LoadingOverlayProps) {
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
          <p className='gprv-loading-summary'>Fetching pull request metadata and changed files…</p>
          <p className='gprv-loading-hint'>Large pull requests may take a few seconds.</p>
        </div>
      </div>
    </ChromeModal>
  );
}
