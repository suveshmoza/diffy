import { IconCiWarning } from '@pierre/icons';

import { IconGhost } from '@/components/icons/Ghost';
import { Button } from '@/components/ui/button';
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
      <div className='min-h-0 overflow-auto'>
        <div className='mx-auto grid max-w-lg gap-5 px-6 pt-8 pb-10'>
          {isRateLimit ? (
            <IconCiWarning
              size={128}
              className='text-destructive'
            />
          ) : (
            <IconGhost
              size={128}
              className='text-destructive'
            />
          )}
          <p className='m-0 text-[15px] leading-normal text-foreground'>
            {isRateLimit
              ? 'GitHub API rate limit exceeded.'
              : 'Something went wrong while loading this pull request.'}
          </p>
          <p className='m-0 text-sm leading-normal text-muted-foreground'>
            {isRateLimit
              ? 'Add a GitHub token in the diffy popup for a higher rate limit, or wait a few minutes and try again.'
              : 'If this is a private repo or you are rate-limited, add a GitHub token in the diffy popup.'}
          </p>
          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              onClick={onRetry}
            >
              Try again
            </Button>
          </div>
          <details className='text-xs text-muted-foreground'>
            <summary className='cursor-pointer select-none'>Technical details</summary>
            <pre className='mt-2 max-h-35 overflow-auto rounded-lg border border-border bg-muted px-3 py-2.5 whitespace-pre-wrap wrap-break-word'>
              {message}
            </pre>
          </details>
        </div>
      </div>
    </ChromeModal>
  );
}
