import { IconFiles, IconMessage } from '@tabler/icons-react';
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
    <div className='gprv-sidebar-pr-stats-bar'>
      <div
        className='gprv-sidebar-pr-stats'
        aria-label={`${pullRequest.changed_files} files changed, ${pullRequest.additions} additions, ${pullRequest.deletions} deletions`}
      >
        <IconFiles
          size={16}
          stroke={1.5}
        />
        <span className='gprv-stat-files'>
          {pullRequest.changed_files} file{pullRequest.changed_files === 1 ? '' : 's'}
        </span>
        <span className='gprv-stat-additions'>+{pullRequest.additions}</span>
        <span className='gprv-stat-deletions'>−{pullRequest.deletions}</span>
      </div>
      <div className='gprv-sidebar-pr-comments'>
        <IconMessage
          size={16}
          stroke={1.5}
        />
        <span>
          {reviewCommentCount === 0
            ? '0'
            : `${reviewCommentCount}
          `}
        </span>
      </div>
    </div>
  );
});
