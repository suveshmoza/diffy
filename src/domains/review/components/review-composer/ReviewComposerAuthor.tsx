import type { ReactNode } from 'react';

import { useGitHubAuth } from '@/domains/github/auth/GitHubAuthProvider';

type ReviewComposerAuthorProps = {
  children: ReactNode;
};

/** Avatar + login header shared by the comment and reply composers. */
export function ReviewComposerAuthor({ children }: ReviewComposerAuthorProps) {
  const { viewerUser } = useGitHubAuth();
  const initials = viewerUser?.login.slice(0, 1).toUpperCase() ?? '?';

  return (
    <div className='flex w-full min-w-0 max-w-full items-start gap-2'>
      <span
        className='inline-flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-[11px] font-bold text-primary'
        aria-hidden='true'
      >
        {viewerUser?.avatar_url ? (
          <img
            src={viewerUser.avatar_url}
            alt=''
            width={24}
            height={24}
            loading='lazy'
            decoding='async'
            className='size-full object-cover'
          />
        ) : (
          initials
        )}
      </span>
      <div className='min-w-0 max-w-full flex-1'>
        {viewerUser ? (
          <div className='flex flex-wrap items-baseline gap-x-2 gap-y-0'>
            <strong className='text-sm font-semibold'>{viewerUser.login}</strong>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
