import {
  IconAlertTriangle,
  IconExternalLink,
  IconLayoutSidebar,
  IconMessages,
  IconX,
} from '@tabler/icons-react';
import { memo } from 'react';

import type { CodeViewDisplayPrefs } from '@/lib/diff/display-prefs';
import type { DiffLayout } from '@/lib/diff/layout-prefs';
import { type GitHubPullRequest, type RateLimitState } from '@/lib/github/api';
import type { ViewedProgress } from '@/lib/review/viewed-files';
import { useSidebarContext } from '@/providers/SidebarContext';

import { ReviewProgress } from '../review/ReviewProgress';
import { DiffLayoutToggle } from './header/DiffLayoutToggle';
import { DisplaySettingsMenu } from './header/DisplaySettingsMenu';
import { ThemePicker } from './header/ThemePicker';

type DiffOverlayHeaderProps = {
  pullRequest: GitHubPullRequest;
  pullRequestUrl: string;
  diffLayout: DiffLayout;
  displayPrefs: CodeViewDisplayPrefs;
  reviewCommentsLoadError?: string | null;
  rateLimit?: RateLimitState | null;
  viewedFilesError?: string | null;
  reviewProgress?: ViewedProgress | null;
  isBatchMode?: boolean;
  queuedCount?: number;
  canReview?: boolean;
  onJumpToNextUnviewed?: () => void;
  onToggleBatchMode?: () => void;
  onOpenPublish?: () => void;
  onDiffLayoutChange: (layout: DiffLayout) => void;
  onDisplayPrefsChange: (partial: Partial<CodeViewDisplayPrefs>) => void;
  onClose: () => void;
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
  isBatchMode = false,
  queuedCount = 0,
  canReview = false,
  onJumpToNextUnviewed,
  onToggleBatchMode,
  onOpenPublish,
  onDiffLayoutChange,
  onDisplayPrefsChange,
  onClose,
}: DiffOverlayHeaderProps) {
  const { isSidebarCollapsed, toggleSidebar } = useSidebarContext();
  const { base } = pullRequest;
  const isRateLimitLow = rateLimit != null && rateLimit.remaining >= 0 && rateLimit.remaining <= 10;
  const isRateLimitExhausted = rateLimit != null && rateLimit.remaining <= 0;

  return (
    <header
      className={`gprv-header gprv-diff-header${isRateLimitExhausted ? ' gprv-diff-header-rate-limited' : ''}`}
    >
      <div className='gprv-header-leading'>
        <div className='gprv-title'>
          <div className='gprv-title-stack'>
            <span className='gprv-pr-badge'>#{pullRequest.number}</span>
            <div className='gprv-title-content'>
              <strong title={pullRequest.title}>{pullRequest.title}</strong>
              <div className='gprv-title-meta'>
                <span
                  className='gprv-repo'
                  title={base.repo.full_name}
                >
                  {base.repo.full_name}
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
        {canReview ? (
          <>
            <button
              className={`gprv-review-cta${isBatchMode ? ' gprv-review-cta-active' : ''}`}
              type='button'
              onClick={onToggleBatchMode}
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
              {isBatchMode ? 'Reviewing' : 'Start Review'}
            </button>
            {isBatchMode ? (
              <button
                className='gprv-publish-cta'
                type='button'
                onClick={onOpenPublish}
                title={
                  queuedCount > 0
                    ? 'Review and publish queued comments'
                    : 'Submit your review verdict to GitHub'
                }
              >
                {queuedCount > 0 ? `Publish (${queuedCount})` : 'Finish review'}
              </button>
            ) : null}
          </>
        ) : null}

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

        <ThemePicker />

        <DisplaySettingsMenu
          displayPrefs={displayPrefs}
          onChange={onDisplayPrefsChange}
        />

        {window !== window.parent ? (
          <button
            className='gprv-header-icon-button'
            type='button'
            onClick={() => {
              const url = browser.runtime.getURL(
                `/overlay.html?pr=${encodeURIComponent(pullRequestUrl)}`,
              );
              window.open(url, '_blank');
            }}
            aria-label='Open in new tab'
            title='Open in new tab'
          >
            <IconExternalLink
              size={16}
              stroke={2}
            />
          </button>
        ) : null}

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
      </div>
    </header>
  );
});
