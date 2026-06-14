import { IconColumns, IconLayoutRows, IconLayoutSidebar, IconX } from '@tabler/icons-react';
import { memo, type CSSProperties } from 'react';

import type { DiffLayout } from '@/lib/diff-layout-prefs';
import type { GitHubPullRequest } from '@/lib/github';

type DiffOverlayHeaderProps = {
  pullRequest: GitHubPullRequest;
  diffLayout: DiffLayout;
  isSidebarCollapsed: boolean;
  reviewCommentsLoadError?: string | null;
  onToggleSidebar: () => void;
  onDiffLayoutChange: (layout: DiffLayout) => void;
  onClose: () => void;
  themeStyle?: CSSProperties;
};

export const DiffOverlayHeader = memo(function DiffOverlayHeader({
  pullRequest,
  diffLayout,
  isSidebarCollapsed,
  reviewCommentsLoadError,
  onToggleSidebar,
  onDiffLayoutChange,
  onClose,
  themeStyle,
}: DiffOverlayHeaderProps) {
  const { base, head } = pullRequest;

  return (
    <header
      className='gprv-header gprv-diff-header'
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
        </div>
      </div>

      <div className='gprv-header-toolbar'>
        <button
          className='gprv-header-icon-button'
          type='button'
          onClick={onToggleSidebar}
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

function DiffLayoutToggle({
  value,
  onChange,
}: {
  value: DiffLayout;
  onChange: (layout: DiffLayout) => void;
}) {
  return (
    <div
      className='gprv-layout-toggle'
      role='group'
      aria-label='Diff layout'
    >
      <button
        type='button'
        data-active={value === 'switched' ? '' : undefined}
        onClick={() => onChange('switched')}
        aria-label='Side-by-side diff'
        title='Side by side'
      >
        <IconColumns
          size={20}
          stroke={2}
        />
      </button>
      <button
        type='button'
        data-active={value === 'stacked' ? '' : undefined}
        onClick={() => onChange('stacked')}
        aria-label='Unified diff'
        title='Unified'
      >
        <IconLayoutRows
          size={20}
          stroke={2}
        />
      </button>
    </div>
  );
}
