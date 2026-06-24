import { IconAlertTriangle, IconExternalLink, IconLayoutSidebar, IconX } from '@tabler/icons-react';
import { memo, type CSSProperties } from 'react';

import type { CodeViewDisplayPrefs } from '@/lib/diff/display-prefs';
import type { DiffLayout } from '@/lib/diff/layout-prefs';
import { type GitHubPullRequest, type RateLimitState } from '@/lib/github/api';
import { useSidebarContext } from '@/providers/SidebarContext';

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
  onDiffLayoutChange: (layout: DiffLayout) => void;
  onDisplayPrefsChange: (partial: Partial<CodeViewDisplayPrefs>) => void;
  onClose: () => void;
  themeStyle?: CSSProperties;
};

export const DiffOverlayHeader = memo(function DiffOverlayHeader({
  pullRequest,
  pullRequestUrl,
  diffLayout,
  displayPrefs,
  reviewCommentsLoadError,
  rateLimit,
  onDiffLayoutChange,
  onDisplayPrefsChange,
  onClose,
  themeStyle,
}: DiffOverlayHeaderProps) {
  const { isSidebarCollapsed, toggleSidebar } = useSidebarContext();
  const { base } = pullRequest;
  const isRateLimitLow = rateLimit != null && rateLimit.remaining >= 0 && rateLimit.remaining <= 10;
  const isRateLimitExhausted = rateLimit != null && rateLimit.remaining <= 0;

  return (
    <header
      className={`gprv-header gprv-diff-header${isRateLimitExhausted ? ' gprv-diff-header-rate-limited' : ''}`}
      style={themeStyle}
    >
      <div className='gprv-header-leading'>
        <div className='gprv-title'>
          <div className='gprv-title-row'>
            <span className='gprv-pr-badge'>#{pullRequest.number}</span>
            <strong title={pullRequest.title}>{pullRequest.title}</strong>
          </div>
          <div className='gprv-title-meta'>
            <span
              className='gprv-repo'
              title={base.repo.full_name}
            >
              {base.repo.full_name}
            </span>
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
      </div>

      <div className='gprv-header-toolbar'>
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

        <span
          className='gprv-header-divider'
          aria-hidden='true'
        />

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
