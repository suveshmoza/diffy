import {
  IconGitBranch,
  IconGitPullRequest,
  IconTag,
  IconUser,
  IconUserCircle,
} from '@tabler/icons-react';
import { memo } from 'react';

import type { GitHubPullRequest } from '@/lib/github/api';

type SidebarPrInfoProps = {
  pullRequest: GitHubPullRequest;
};

function labelTextColor(bgColor: string): string {
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 160 ? '#1f2328' : '#ffffff';
}

export const SidebarPrInfo = memo(function SidebarPrInfo({ pullRequest }: SidebarPrInfoProps) {
  const isMerged = pullRequest.state === 'closed' && pullRequest.merged_at != null;
  const stateBadgeClass = isMerged
    ? 'gprv-state-merged'
    : pullRequest.state === 'open'
      ? 'gprv-state-open'
      : 'gprv-state-closed';
  const stateLabel = isMerged ? 'Merged' : pullRequest.state === 'open' ? 'Open' : 'Closed';

  return (
    <footer className='gprv-sidebar-pr-info'>
      <table className='gprv-sidebar-pr-table'>
        <tbody>
          <tr>
            <td className='gprv-pr-table-label'>
              <span className='gprv-pr-table-label-inner'>
                <IconGitBranch
                  size={14}
                  stroke={1.5}
                />
                Branches
              </span>
            </td>
            <td className='gprv-pr-table-value'>
              <span className='gprv-branch'>{pullRequest.base.ref}</span>
              <span className='gprv-branch-arrow'>←</span>
              <span className='gprv-branch'>{pullRequest.head.ref}</span>
            </td>
          </tr>
          <tr>
            <td className='gprv-pr-table-label'>
              <span className='gprv-pr-table-label-inner'>
                <IconGitPullRequest
                  size={14}
                  stroke={1.5}
                />
                State
              </span>
            </td>
            <td className='gprv-pr-table-value'>
              <span className={`gprv-pr-state-badge ${stateBadgeClass}`}>{stateLabel}</span>
              {pullRequest.draft ? <span className='gprv-pr-draft-badge'>Draft</span> : null}
            </td>
          </tr>
          <tr>
            <td className='gprv-pr-table-label'>
              <span className='gprv-pr-table-label-inner'>
                <IconUser
                  size={14}
                  stroke={1.5}
                />
                Author
              </span>
            </td>
            <td className='gprv-pr-table-value'>
              <span className='gprv-pr-table-author'>
                {pullRequest.user?.avatar_url ? (
                  <img
                    className='gprv-pr-avatar'
                    src={pullRequest.user.avatar_url}
                    alt=''
                    width={16}
                    height={16}
                  />
                ) : (
                  <IconUserCircle
                    size={16}
                    stroke={1.5}
                  />
                )}
                <span>{pullRequest.user?.login ?? 'unknown'}</span>
              </span>
            </td>
          </tr>
          {pullRequest.labels.length > 0 ? (
            <tr>
              <td className='gprv-pr-table-label'>
                <span className='gprv-pr-table-label-inner'>
                  <IconTag
                    size={14}
                    stroke={1.5}
                  />
                  Labels
                </span>
              </td>
              <td className='gprv-pr-table-value'>
                <span className='gprv-pr-table-labels'>
                  {pullRequest.labels.map((label) => (
                    <span
                      key={label.name}
                      className='gprv-pr-label'
                      style={{
                        backgroundColor: `#${label.color}`,
                        color: labelTextColor(label.color),
                      }}
                      title={label.description ?? label.name}
                    >
                      {label.name}
                    </span>
                  ))}
                </span>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </footer>
  );
});
