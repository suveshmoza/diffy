import {
  IconAlertTriangle,
  IconArrowNarrowLeft,
  IconCaretUpDown,
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconLayoutSidebar,
  IconMessages,
  IconRefresh,
  IconX,
} from '@tabler/icons-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

import { IconCaretDownUp } from '@/components/icons/CaretDownUp';
import type { CodeViewDisplayPrefs } from '@/lib/diff/display-prefs';
import type { DiffLayout } from '@/lib/diff/layout-prefs';
import { type GitHubPullRequest, type RateLimitState } from '@/lib/github/api';
import { isStandaloneOverlay } from '@/lib/overlay/standalone';
import type { ViewedProgress } from '@/lib/review/viewed-files';
import { useReviewQueueContext } from '@/providers/ReviewQueueContext';
import { useSidebarContext } from '@/providers/SidebarContext';

import { ReviewProgress } from '../review/ReviewProgress';
import { DiffLayoutToggle } from './header/DiffLayoutToggle';
import { DisplaySettingsMenu } from './header/DisplaySettingsMenu';
import { HeaderOverflowMenu } from './header/HeaderOverflowMenu';

type DiffOverlayHeaderProps = {
  pullRequest: GitHubPullRequest;
  pullRequestUrl: string;
  diffLayout: DiffLayout;
  displayPrefs: CodeViewDisplayPrefs;
  reviewCommentsLoadError?: string | null;
  rateLimit?: RateLimitState | null;
  viewedFilesError?: string | null;
  reviewProgress?: ViewedProgress | null;
  canReview?: boolean;
  onJumpToNextUnviewed?: () => void;
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
  reviewProgress,
  canReview = false,
  onJumpToNextUnviewed,
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
  const isRateLimitLow = rateLimit != null && rateLimit.remaining >= 0 && rateLimit.remaining <= 10;
  const isRateLimitExhausted = rateLimit != null && rateLimit.remaining <= 0;
  const isStandalone = isStandaloneOverlay();
  const canOpenInNewTab = !isStandalone;
  const openInNewTab = useCallback(() => {
    const url = browser.runtime.getURL(`/overlay.html?pr=${encodeURIComponent(pullRequestUrl)}`);
    window.open(url, '_blank');
  }, [pullRequestUrl]);

  return (
    <header
      className={`gprv-header gprv-diff-header${isRateLimitExhausted ? ' gprv-diff-header-rate-limited' : ''}`}
    >
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
        <div className='gprv-title'>
          <div className='gprv-title-stack'>
            <span className='gprv-pr-badge'>#{pullRequest.number}</span>
            <div className='gprv-title-content'>
              <strong title={pullRequest.title}>{pullRequest.title}</strong>
              <div className='gprv-title-meta'>
                <span className='gprv-branches'>
                  <span className='gprv-branches-base'>
                    <CopyableBranch name={base.ref} />
                    <IconArrowNarrowLeft
                      className='gprv-branch-arrow'
                      size={20}
                      aria-hidden='true'
                    />
                  </span>
                  <CopyableBranch name={head.ref} />
                </span>
              </div>
            </div>
          </div>
        </div>

        {reviewCommentsLoadError ? (
          <p
            className='gprv-review-load-error'
            title={reviewCommentsLoadError}
          >
            Review comments unavailable
          </p>
        ) : null}
        {isRateLimitLow ? (
          <p
            className={`gprv-rate-limit-warning${isRateLimitExhausted ? ' gprv-rate-limit-exhausted' : ''}`}
            title={
              isRateLimitExhausted
                ? 'API rate limit exhausted. Add a token in the diffy popup.'
                : `${rateLimit.remaining} requests remaining — add a token to avoid hitting the limit.`
            }
          >
            <IconAlertTriangle
              size={12}
              stroke={2}
              style={{ flexShrink: 0 }}
            />
            {isRateLimitExhausted ? 'API limit exhausted' : `${rateLimit.remaining} req remaining`}
          </p>
        ) : null}
        {viewedFilesError ? (
          <p
            className='gprv-viewed-files-error'
            title={viewedFilesError}
          >
            <IconAlertTriangle
              size={12}
              stroke={2}
              style={{ flexShrink: 0 }}
            />
            Viewed sync failed
          </p>
        ) : null}

        {reviewProgress && onJumpToNextUnviewed ? (
          <ReviewProgress
            viewed={reviewProgress.viewed}
            total={reviewProgress.total}
            onJumpToNextUnviewed={onJumpToNextUnviewed}
          />
        ) : null}
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
                <span className='gprv-review-cta-label gprv-review-cta-label-full'>
                  {isBatchMode ? 'Reviewing' : 'Start Review'}
                </span>
                <span className='gprv-review-cta-label gprv-review-cta-label-compact'>
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
                  <span className='gprv-publish-cta-label-full'>
                    {queuedCount > 0 ? `Publish (${queuedCount})` : 'Finish review'}
                  </span>
                  <span className='gprv-publish-cta-label-compact'>
                    {queuedCount > 0 ? `Publish (${queuedCount})` : 'Finish'}
                  </span>
                </button>
              ) : null}
            </>
          ) : null}
        </div>

        <div className='gprv-header-desktop-actions'>
          <button
            className='gprv-header-icon-button'
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

          <DiffLayoutToggle
            value={diffLayout}
            onChange={onDiffLayoutChange}
          />

          {onExpandAll && onCollapseAll ? (
            <button
              className='gprv-header-icon-button'
              type='button'
              onClick={allCollapsed ? onExpandAll : onCollapseAll}
              aria-label={allCollapsed ? 'Expand all files' : 'Collapse all files'}
              title={allCollapsed ? 'Expand all files' : 'Collapse all files'}
            >
              {allCollapsed ? (
                <IconCaretDownUp
                  size={16}
                  strokeWidth={2}
                />
              ) : (
                <IconCaretUpDown
                  size={16}
                  stroke={2}
                />
              )}
            </button>
          ) : null}

          {onRefresh ? (
            <button
              className='gprv-header-icon-button'
              type='button'
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-busy={isRefreshing}
              aria-label='Refresh pull request data'
              title='Refresh'
            >
              <IconRefresh
                size={16}
                stroke={2}
                className={isRefreshing ? 'gprv-loading-spinner' : undefined}
              />
            </button>
          ) : null}

          {canOpenInNewTab ? (
            <button
              className='gprv-header-icon-button'
              type='button'
              onClick={openInNewTab}
              aria-label='Open in new tab'
              title='Open in new tab'
            >
              <IconExternalLink
                size={16}
                stroke={2}
              />
            </button>
          ) : null}

          <DisplaySettingsMenu
            displayPrefs={displayPrefs}
            onChange={onDisplayPrefsChange}
          />
        </div>

        <div className='gprv-header-compact-actions'>
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
        </div>

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
  );
});

function CopyableBranch({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (resetTimerRef.current != null) {
        window.clearTimeout(resetTimerRef.current);
      }
    },
    [],
  );

  const copy = useCallback(async () => {
    setCopied(true);
    if (resetTimerRef.current != null) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => setCopied(false), 750);

    try {
      await navigator.clipboard.writeText(name);
    } catch {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
      setCopied(false);
      // Clipboard access can be denied by browser or extension permissions.
    }
  }, [name]);

  return (
    <button
      type='button'
      className='gprv-copyable-branch'
      title={`Copy ${name}`}
      aria-label={copied ? `Copied branch ${name}` : `Copy branch ${name}`}
      onClick={() => void copy()}
    >
      <span className='gprv-branch'>{name}</span>
      <span
        className='gprv-branch-copy-status'
        data-copied={copied ? '' : undefined}
        aria-hidden='true'
      >
        <IconCopy
          className='gprv-branch-copy-icon'
          size={14}
          stroke={2}
        />
        <IconCheck
          className='gprv-branch-check-icon'
          size={14}
          stroke={2.5}
        />
      </span>
    </button>
  );
}
