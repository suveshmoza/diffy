import type { GitHubTheme } from '@/lib/theme';

import { ChromeModal } from './ChromeModal';

type ErrorOverlayProps = {
  message: string;
  onRetry: () => void;
  onClose: () => void;
  theme: GitHubTheme;
};

export function ErrorOverlay({ message, onRetry, onClose, theme }: ErrorOverlayProps) {
  return (
    <ChromeModal
      title='Unable to load PR diff'
      onClose={onClose}
      theme={theme}
    >
      <div className='gprv-modal-body'>
        <div className='gprv-error-panel'>
          <div
            className='gprv-error-icon'
            aria-hidden='true'
          >
            !
          </div>
          <p className='gprv-error-summary'>
            Something went wrong while loading this pull request.
          </p>
          <p className='gprv-error-hint'>
            If this is a private repo or you are rate-limited, add a GitHub token in the diffy
            popup.
          </p>
          <div className='gprv-error-actions'>
            <button
              className='gprv-header-button'
              type='button'
              onClick={onRetry}
            >
              Try again
            </button>
          </div>
          <details className='gprv-error-details'>
            <summary>Technical details</summary>
            <pre>{message}</pre>
          </details>
        </div>
      </div>
    </ChromeModal>
  );
}
