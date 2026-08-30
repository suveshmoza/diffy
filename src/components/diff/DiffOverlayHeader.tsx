import { IconConvo, IconSidebarLeft, IconX } from '@pierre/icons';
import { memo, useCallback } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CodeViewDisplayPrefs } from '@/lib/diff/display-prefs';
import type { DiffLayout } from '@/lib/diff/layout-prefs';
import { type GitHubPullRequest, type RateLimitState } from '@/lib/github/api';
import { isStandaloneOverlay } from '@/lib/overlay/standalone';
import { cn } from '@/lib/utils';
import { useReviewQueueContext } from '@/providers/ReviewQueueContext';
import { useSidebarContext } from '@/providers/SidebarContext';

import { AppearanceSettingsMenu } from './header/AppearanceSettingsMenu';
import { BranchContextPopover } from './header/BranchContextPopover';
import { CollapseAllToggle } from './header/CollapseAllToggle';
import { DiffLayoutToggle } from './header/DiffLayoutToggle';
import { HeaderOverflowMenu } from './header/HeaderOverflowMenu';
import { HeaderStatusStrip } from './header/HeaderStatusStrip';

type DiffOverlayHeaderProps = {
  pullRequest: GitHubPullRequest;
  pullRequestUrl: string;
  diffLayout: DiffLayout;
  displayPrefs: CodeViewDisplayPrefs;
  reviewCommentsLoadError?: string | null;
  rateLimit?: RateLimitState | null;
  viewedFilesError?: string | null;
  canReview?: boolean;
  onDiffLayoutChange: (layout: DiffLayout) => void;
  onDisplayPrefsChange: (partial: Partial<CodeViewDisplayPrefs>) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onClose: () => void;
  allCollapsed?: boolean;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
};

export const DiffOverlayHeader = memo(function DiffOverlayHeader({
  pullRequest,
  pullRequestUrl,
  diffLayout,
  displayPrefs,
  reviewCommentsLoadError,
  rateLimit,
  viewedFilesError,
  canReview = false,
  onDiffLayoutChange,
  onDisplayPrefsChange,
  onRefresh,
  isRefreshing = false,
  onClose,
  allCollapsed = false,
  onExpandAll,
  onCollapseAll,
}: DiffOverlayHeaderProps) {
  const { isSidebarCollapsed, toggleSidebar } = useSidebarContext();
  const { isBatchMode, queue, toggleBatchMode, openPublishDialog } = useReviewQueueContext();
  const queuedCount = queue.length;
  const { base, head } = pullRequest;
  const isRateLimitExhausted = rateLimit != null && rateLimit.remaining <= 0;
  const isStandalone = isStandaloneOverlay();
  const canOpenInNewTab = !isStandalone;
  const openInNewTab = useCallback(() => {
    const url = browser.runtime.getURL(`/overlay.html?pr=${encodeURIComponent(pullRequestUrl)}`);
    window.open(url, '_blank');
  }, [pullRequestUrl]);

  return (
    <div
      className={cn(
        'shrink-0 border-b border-border',
        isRateLimitExhausted && 'border-destructive/40',
      )}
    >
      <header className='flex min-h-11.25 items-center gap-3 bg-background px-2 py-1 text-foreground'>
        <Button
          variant='ghost'
          size='icon-sm'
          type='button'
          onClick={toggleSidebar}
          aria-label={isSidebarCollapsed ? 'Show file list' : 'Hide file list'}
          aria-pressed={!isSidebarCollapsed}
          title={isSidebarCollapsed ? 'Show files' : 'Hide files'}
        >
          <IconSidebarLeft />
        </Button>

        <div className='flex min-w-0 flex-1 flex-col justify-center gap-0.5'>
          <div className='flex min-w-0 items-center gap-2'>
            <Badge
              variant='outline'
              className='shrink-0 border-primary/30 bg-primary/15 text-primary'
            >
              #{pullRequest.number}
            </Badge>
            <strong
              className='min-w-0 flex-1 truncate text-sm font-semibold leading-snug'
              title={pullRequest.title}
            >
              {pullRequest.title}
            </strong>
          </div>
          <BranchContextPopover
            baseRef={base.ref}
            headRef={head.ref}
          />
        </div>

        <div className='inline-flex shrink-0 items-center gap-1'>
          {canReview ? (
            <div className='inline-flex items-center gap-1'>
              <Button
                type='button'
                variant={isBatchMode ? 'secondary' : 'outline'}
                size='sm'
                onClick={toggleBatchMode}
                aria-pressed={isBatchMode}
                title={
                  isBatchMode
                    ? 'Comments are collected into one review. Click to stop collecting.'
                    : 'Collect comments into a single review before publishing'
                }
              >
                <IconConvo size={15} />
                {isBatchMode ? 'Reviewing' : 'Review'}
              </Button>
              {isBatchMode ? (
                <Button
                  type='button'
                  variant='default'
                  size='sm'
                  onClick={openPublishDialog}
                  title={
                    queuedCount > 0
                      ? 'Review and publish queued comments'
                      : 'Submit your review verdict to GitHub'
                  }
                >
                  {queuedCount > 0 ? `Publish (${queuedCount})` : 'Finish'}
                </Button>
              ) : null}
            </div>
          ) : null}

          <DiffLayoutToggle
            value={diffLayout}
            onChange={onDiffLayoutChange}
          />

          {onExpandAll && onCollapseAll ? (
            <CollapseAllToggle
              allCollapsed={allCollapsed}
              onExpandAll={onExpandAll}
              onCollapseAll={onCollapseAll}
            />
          ) : null}

          <AppearanceSettingsMenu />

          <HeaderOverflowMenu
            displayPrefs={displayPrefs}
            onDisplayPrefsChange={onDisplayPrefsChange}
            isRefreshing={isRefreshing}
            canRefresh={Boolean(onRefresh)}
            canOpenInNewTab={canOpenInNewTab}
            onRefresh={onRefresh}
            onOpenInNewTab={openInNewTab}
          />

          {!isStandalone ? (
            <Button
              type='button'
              variant='ghost'
              size='icon-sm'
              onClick={onClose}
              aria-label='Close diff viewer'
              title='Close'
            >
              <IconX />
            </Button>
          ) : null}
        </div>
      </header>

      <HeaderStatusStrip
        reviewCommentsLoadError={reviewCommentsLoadError}
        rateLimit={rateLimit}
        viewedFilesError={viewedFilesError}
      />
    </div>
  );
});
