import { IconBrandGithub, IconBranch, IconPerson } from '@pierre/icons';
import { memo } from 'react';

import type { GitHubPullRequest } from '@/lib/github/api';
import { Badge } from '@/shared/ui/badge';

import { AuthorAvatar } from './components/author-avatar';
import { PrStateBadge } from './components/pr-badge';
import { getPrState } from './components/pr-state';
import { PropertyList, Property, PropertyLabel, PropertyValue } from './components/property-list';

type SidebarPrInfoProps = {
  pullRequest: GitHubPullRequest;
};

export const SidebarPrInfo = memo(function SidebarPrInfo({ pullRequest }: SidebarPrInfoProps) {
  const repository = pullRequest.base.repo.full_name;
  const author = pullRequest.user?.login ?? 'unknown';

  return (
    <footer className='shrink-0 border-t border-sidebar-border bg-sidebar px-3 py-2.5'>
      <PropertyList>
        <Property>
          <PropertyLabel icon={<IconBrandGithub size={12} />}>Repository</PropertyLabel>
          <PropertyValue>
            <span
              className='truncate'
              title={repository}
            >
              {repository}
            </span>
          </PropertyValue>
        </Property>

        <Property>
          <PropertyLabel icon={<IconBranch size={12} />}>State</PropertyLabel>
          <PropertyValue>
            <PrStateBadge state={getPrState(pullRequest)} />
            {pullRequest.draft ? (
              <Badge
                variant='outline'
                className='text-[10px] font-medium text-muted-foreground'
              >
                Draft
              </Badge>
            ) : null}
          </PropertyValue>
        </Property>

        <Property>
          <PropertyLabel icon={<IconPerson size={12} />}>Author</PropertyLabel>
          <PropertyValue>
            <AuthorAvatar
              key={pullRequest.user?.avatar_url ?? author}
              login={author}
              src={pullRequest.user?.avatar_url}
            />

            <span
              className='truncate'
              title={author}
            >
              {author}
            </span>
          </PropertyValue>
        </Property>
      </PropertyList>
    </footer>
  );
});
