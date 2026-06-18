import { IconGhost2, IconAlertTriangle } from '@tabler/icons-react';

import { isGitHubRateLimitError } from '@/lib/github/api';

import { ChromeModal } from './ChromeModal';

type ErrorOverlayProps = {
  message: string;
  onRetry: () => void;
  onClose: () => void;
};

export function ErrorOverlay({ message, onRetry, onClose }: ErrorOverlayProps) {
  const isRateLimit = isGitHubRateLimitError(message);

  return (
    <ChromeModal
      title={isRateLimit ? 'Rate limit reached' : 'Unable to load PR diff'}
      onClose={onClose}
    >
      <div className='gprv-modal-body'>
        <div className='gprv-error-panel'>
          {isRateLimit ? (
            <IconAlertTriangle
              size={128}
              stroke={2}
              color='var(--gprv-danger)'
            />
          ) : (
            <IconGhost2
              size={128}
              stroke={2}
              color='var(--gprv-error)'
            />
          )}
          <p className='gprv-error-summary'>
            {isRateLimit
              ? 'GitHub API rate limit exceeded.'
              : 'Something went wrong while loading this pull request.'}
          </p>
          <p className='gprv-error-hint'>
            {isRateLimit
              ? 'Add a GitHub token in the diffy popup for a higher rate limit, or wait a few minutes and try again.'
              : 'If this is a private repo or you are rate-limited, add a GitHub token in the diffy popup.'}
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
