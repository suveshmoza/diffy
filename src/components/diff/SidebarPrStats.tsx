import { IconComment, IconFiles } from '@pierre/icons';
import { memo } from 'react';

import type { GitHubPullRequest } from '@/lib/github/api';
import { cn } from '@/lib/utils';

const exact = new Intl.NumberFormat('en');
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

// Keep small numbers exact, abbreviate huge ones so large PRs don't overflow the sidebar.
const formatCount = (value: number) =>
  value >= 10_000 ? compact.format(value) : exact.format(value);
const pluralize = (value: number, one: string, many: string) => (value === 1 ? one : many);

type SidebarPrStatsProps = {
  pullRequest: GitHubPullRequest;
  reviewCommentCount: number;
};

export const SidebarPrStats = memo(function SidebarPrStats({
  pullRequest,
  reviewCommentCount,
}: SidebarPrStatsProps) {
  const { changed_files: files, additions, deletions } = pullRequest;

  const summary = [
    `${files} ${pluralize(files, 'file', 'files')} changed`,
    `${additions} ${pluralize(additions, 'addition', 'additions')}`,
    `${deletions} ${pluralize(deletions, 'deletion', 'deletions')}`,
    `${reviewCommentCount} review ${pluralize(reviewCommentCount, 'comment', 'comments')}`,
  ].join(', ');

  return (
    <div className='flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 pt-2'>
      <p className='sr-only'>{summary}</p>

      <div
        aria-hidden
        className='inline-flex items-center gap-2 text-xs font-semibold tabular-nums'
      >
        <IconFiles
          size={14}
          className='text-muted-foreground'
        />
        <span className='text-muted-foreground'>
          {formatCount(files)} {pluralize(files, 'file', 'files')}
        </span>
        <span
          className='text-green-500'
          title={`${exact.format(additions)} additions`}
        >
          +{formatCount(additions)}
        </span>
        <span
          className='text-red-500'
          title={`${exact.format(deletions)} deletions`}
        >
          −{formatCount(deletions)}
        </span>
      </div>

      <div
        aria-hidden
        className={cn(
          'inline-flex items-center gap-1 text-xs tabular-nums text-muted-foreground',
          reviewCommentCount === 0 && 'opacity-60',
        )}
        title={`${exact.format(reviewCommentCount)} review ${pluralize(reviewCommentCount, 'comment', 'comments')}`}
      >
        <IconComment size={14} />
        <span>{formatCount(reviewCommentCount)}</span>
      </div>
    </div>
  );
});
