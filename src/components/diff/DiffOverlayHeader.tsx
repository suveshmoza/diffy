import { IconAlertTriangle, IconLayoutSidebar, IconUserCircle, IconX } from '@tabler/icons-react';
import { memo, type CSSProperties } from 'react';

import type { CodeViewDisplayPrefs } from '@/lib/diff/display-prefs';
import type { DiffLayout } from '@/lib/diff/layout-prefs';
import { formatRelativeDate } from '@/lib/diff/relative-date';
import { type GitHubPullRequest, type RateLimitState } from '@/lib/github/api';
import { useSidebarContext } from '@/providers/SidebarContext';

import { DiffLayoutToggle } from './header/DiffLayoutToggle';
import { DisplaySettingsMenu } from './header/DisplaySettingsMenu';
import { ThemePicker } from './header/ThemePicker';

function labelTextColor(bgColor: string): string {
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 160 ? '#1f2328' : '#ffffff';
}

type DiffOverlayHeaderProps = {
  pullRequest: GitHubPullRequest;
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
  const { base, head } = pullRequest;
  const isRateLimitLow = rateLimit != null && rateLimit.remaining >= 0 && rateLimit.remaining <= 10;
  const isRateLimitExhausted = rateLimit != null && rateLimit.remaining <= 0;

  const isMerged = pullRequest.state === 'closed' && pullRequest.merged_at != null;
  const stateBadgeClass = isMerged
    ? 'gprv-state-merged'
    : pullRequest.state === 'open'
      ? 'gprv-state-open'
      : 'gprv-state-closed';
  const stateLabel = isMerged ? 'Merged' : pullRequest.state === 'open' ? 'Open' : 'Closed';

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
            <span
              className='gprv-meta-sep'
              aria-hidden='true'
            >
              ·
            </span>
            <span className='gprv-branches'>
              <span
                className='gprv-branch'
                title={`Base: ${base.ref}`}
              >
                {base.ref}
              </span>
              <span
                className='gprv-branch-arrow'
                aria-hidden='true'
              >
                ←
              </span>
              <span
                className='gprv-branch'
                title={`Head: ${head.ref}`}
              >
                {head.ref}
              </span>
            </span>
          </div>

          <div className='gprv-pr-meta-row'>
            <span className='gprv-pr-author'>
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

            <span className={`gprv-pr-state-badge ${stateBadgeClass}`}>{stateLabel}</span>

            {pullRequest.draft ? <span className='gprv-pr-draft-badge'>Draft</span> : null}

            <span className='gprv-pr-date'>
              opened {formatRelativeDate(pullRequest.created_at)}
            </span>

            {pullRequest.labels.length > 0 ? (
              <span className='gprv-pr-labels'>
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
            ) : null}
          </div>
        </div>

        <div className='gprv-header-meta-stack'>
          <div
            className='gprv-header-stats'
            aria-label={`${pullRequest.changed_files} files changed, ${pullRequest.additions} additions, ${pullRequest.deletions} deletions`}
          >
            <span className='gprv-stat-files'>
              {pullRequest.changed_files} file{pullRequest.changed_files === 1 ? '' : 's'}
            </span>
            <span className='gprv-stat-additions'>+{pullRequest.additions}</span>
            <span className='gprv-stat-deletions'>−{pullRequest.deletions}</span>
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
              {isRateLimitExhausted
                ? 'API limit exhausted'
                : `${rateLimit.remaining} req remaining`}
            </p>
          ) : null}
        </div>
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
            size={20}
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
            size={20}
            stroke={2}
          />
        </button>
      </div>
    </header>
  );
});
