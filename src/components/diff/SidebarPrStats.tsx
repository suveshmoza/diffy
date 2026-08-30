import { IconComment, IconFiles } from '@pierre/icons';
import { memo } from 'react';

import type { GitHubPullRequest } from '@/lib/github/api';

type SidebarPrStatsProps = {
  pullRequest: GitHubPullRequest;
  reviewCommentCount: number;
};

export const SidebarPrStats = memo(function SidebarPrStats({
  pullRequest,
  reviewCommentCount,
}: SidebarPrStatsProps) {
  return (
    <div className='flex flex-wrap items-center justify-between gap-3 px-3 pt-2'>
      <div
        className='inline-flex items-center gap-2 text-sm font-semibold tabular-nums'
        aria-label={`${pullRequest.changed_files} files changed, ${pullRequest.additions} additions, ${pullRequest.deletions} deletions`}
      >
        <IconFiles
          size={16}
          className='text-muted-foreground'
        />
        <span className='text-muted-foreground'>
          {pullRequest.changed_files} file{pullRequest.changed_files === 1 ? '' : 's'}
        </span>
        <span className='text-green-500'>+{pullRequest.additions}</span>
        <span className='text-red-500'>−{pullRequest.deletions}</span>
      </div>
      <div className='inline-flex items-center gap-1 text-xs text-muted-foreground'>
        <IconComment size={16} />
        <span>{reviewCommentCount}</span>
      </div>
    </div>
  );
});
