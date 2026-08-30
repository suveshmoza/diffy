import { IconBrandGithub, IconBranch, IconPerson, IconPersonStatus, IconTag } from '@pierre/icons';
import { memo, type ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import type { GitHubPullRequest } from '@/lib/github/api';
import { cn } from '@/lib/utils';

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
  const stateLabel = isMerged ? 'Merged' : pullRequest.state === 'open' ? 'Open' : 'Closed';

  return (
    <footer className='shrink-0 border-t border-sidebar-border bg-sidebar px-3 py-2.5'>
      <table className='w-full border-collapse'>
        <tbody>
          <InfoRow
            icon={<IconBrandGithub size={14} />}
            label='Repository'
            isFirst
          >
            <span
              className='ml-auto block max-w-[13rem] truncate font-mono text-sm'
              title={pullRequest.base.repo.full_name}
            >
              {pullRequest.base.repo.full_name}
            </span>
          </InfoRow>
          <InfoRow
            icon={<IconBranch size={14} />}
            label='State'
          >
            <span className='inline-flex items-center justify-end gap-1.5'>
              <Badge
                variant='outline'
                className={cn(
                  'text-[11px]',
                  isMerged && 'border-purple-500/30 bg-purple-500/15 text-purple-400',
                  !isMerged &&
                    pullRequest.state === 'open' &&
                    'border-green-500/30 bg-green-500/15 text-green-500',
                  !isMerged &&
                    pullRequest.state === 'closed' &&
                    'border-destructive/30 bg-destructive/15 text-destructive',
                )}
              >
                {stateLabel}
              </Badge>
              {pullRequest.draft ? (
                <Badge
                  variant='outline'
                  className='text-[11px]'
                >
                  Draft
                </Badge>
              ) : null}
            </span>
          </InfoRow>
          <InfoRow
            icon={<IconPerson size={14} />}
            label='Author'
          >
            <span className='inline-flex items-center justify-end gap-1 text-sm'>
              {pullRequest.user?.avatar_url ? (
                <img
                  className='size-4 shrink-0 rounded-full'
                  src={pullRequest.user.avatar_url}
                  alt=''
                  width={16}
                  height={16}
                />
              ) : (
                <IconPersonStatus size={16} />
              )}
              <span>{pullRequest.user?.login ?? 'unknown'}</span>
            </span>
          </InfoRow>
          {pullRequest.labels.length > 0 ? (
            <InfoRow
              icon={<IconTag size={14} />}
              label='Labels'
            >
              <span className='inline-flex flex-wrap justify-end gap-1'>
                {pullRequest.labels.map((label) => (
                  <span
                    key={label.name}
                    className='rounded px-1.5 py-0.5 text-[10px] font-semibold'
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
            </InfoRow>
          ) : null}
        </tbody>
      </table>
    </footer>
  );
});

type InfoRowProps = {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  isFirst?: boolean;
};

function InfoRow({ icon, label, children, isFirst = false }: InfoRowProps) {
  return (
    <tr>
      <td className='py-0 align-top whitespace-nowrap text-[13px] text-muted-foreground'>
        <span className='inline-flex items-center gap-1.5'>
          {icon}
          {label}
        </span>
      </td>
      <td className={cn('py-0 pl-3 align-top text-right text-[13px]', !isFirst && 'pt-1.5')}>
        {children}
      </td>
    </tr>
  );
}
