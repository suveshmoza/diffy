import { IconLayoutSidebar, IconMessages, IconX } from '@tabler/icons-react';
import { memo, useCallback } from 'react';

import type { CodeViewDisplayPrefs } from '@/lib/diff/display-prefs';
import type { DiffLayout } from '@/lib/diff/layout-prefs';
import { type GitHubPullRequest, type RateLimitState } from '@/lib/github/api';
import { isStandaloneOverlay } from '@/lib/overlay/standalone';
import { useReviewQueueContext } from '@/providers/ReviewQueueContext';
import { useSidebarContext } from '@/providers/SidebarContext';

import { BranchContextPopover } from './header/BranchContextPopover';
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
      className={`gprv-diff-header-shell${isRateLimitExhausted ? ' gprv-diff-header-rate-limited' : ''}`}
    >
      <header className='gprv-header gprv-diff-header'>
        <button
          className='gprv-header-icon-button gprv-header-sidebar-toggle'
          type='button'
          onClick={toggleSidebar}
          aria-label={isSidebarCollapsed ? 'Show file list' : 'Hide file list'}
          aria-pressed={!isSidebarCollapsed}
          title={isSidebarCollapsed ? 'Show files' : 'Hide files'}
        >
          <IconLayoutSidebar
            size={16}
            stroke={2}
          />
        </button>

        <div className='gprv-header-leading'>
          <div className='gprv-title gprv-title-compact'>
            <span className='gprv-pr-badge'>#{pullRequest.number}</span>
            <strong
              className='gprv-title-text'
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

        <div className='gprv-header-toolbar'>
          <div className='gprv-header-primary-actions'>
            {canReview ? (
              <>
                <button
                  className={`gprv-review-cta${isBatchMode ? ' gprv-review-cta-active' : ''}`}
                  type='button'
                  onClick={toggleBatchMode}
                  aria-pressed={isBatchMode}
                  title={
                    isBatchMode
                      ? 'Comments are collected into one review. Click to stop collecting.'
                      : 'Collect comments into a single review before publishing'
                  }
                >
                  <IconMessages
                    size={15}
                    stroke={2}
                  />
                  <span className='gprv-review-cta-label'>
                    {isBatchMode ? 'Reviewing' : 'Review'}
                  </span>
                </button>
                {isBatchMode ? (
                  <button
                    className='gprv-publish-cta'
                    type='button'
                    onClick={openPublishDialog}
                    title={
                      queuedCount > 0
                        ? 'Review and publish queued comments'
                        : 'Submit your review verdict to GitHub'
                    }
                  >
                    {queuedCount > 0 ? `Publish (${queuedCount})` : 'Finish'}
                  </button>
                ) : null}
              </>
            ) : null}
          </div>

          <DiffLayoutToggle
            value={diffLayout}
            onChange={onDiffLayoutChange}
          />

          <HeaderOverflowMenu
            diffLayout={diffLayout}
            displayPrefs={displayPrefs}
            allCollapsed={allCollapsed}
            isRefreshing={isRefreshing}
            canExpandOrCollapse={Boolean(onExpandAll && onCollapseAll)}
            canRefresh={Boolean(onRefresh)}
            canOpenInNewTab={canOpenInNewTab}
            onDiffLayoutChange={onDiffLayoutChange}
            onDisplayPrefsChange={onDisplayPrefsChange}
            onExpandAll={onExpandAll}
            onCollapseAll={onCollapseAll}
            onRefresh={onRefresh}
            onOpenInNewTab={openInNewTab}
          />

          {!isStandalone ? (
            <button
              className='gprv-close gprv-header-icon-button'
              type='button'
              onClick={onClose}
              aria-label='Close diff viewer'
              title='Close'
            >
              <IconX
                size={16}
                stroke={2}
              />
            </button>
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
