import { memo } from 'react';

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
};

export const DiffOverlayHeader = memo(function DiffOverlayHeader({
  pullRequest,
  diffLayout,
  isSidebarCollapsed,
  reviewCommentsLoadError,
  onToggleSidebar,
  onDiffLayoutChange,
  onClose,
}: DiffOverlayHeaderProps) {
  const { base, head } = pullRequest;

  return (
    <header className='gprv-header gprv-diff-header'>
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
          <SidebarIcon />
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
          <CloseIcon />
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
        <SplitViewIcon />
      </button>
      <button
        type='button'
        data-active={value === 'stacked' ? '' : undefined}
        onClick={() => onChange('stacked')}
        aria-label='Unified diff'
        title='Unified'
      >
        <UnifiedViewIcon />
      </button>
    </div>
  );
}

function SidebarIcon() {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='16'
      height='16'
      fill='currentColor'
      viewBox='0 0 24 24'
      aria-hidden='true'
    >
      {/* <!--Boxicons v3.0.8 https://boxicons.com | License  https://docs.boxicons.com/free--> */}
      <path d='m20,4H4c-1.1,0-2,.9-2,2v12c0,1.1.9,2,2,2h16c1.1,0,2-.9,2-2V6c0-1.1-.9-2-2-2ZM4,6h6v12h-6V6Zm8,12V6h8v12s-8,0-8,0Z' />
      <path d='M6 8H8V10H6z' />
      <path d='M6 12H8V14H6z' />
    </svg>
  );
}

function SplitViewIcon() {
  return (
    <svg
      viewBox='0 0 16 16'
      width='16'
      height='16'
      fill='currentColor'
      aria-hidden='true'
    >
      <path d='M1.75 2h12.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0 1 14.25 14H1.75A1.75 1.75 0 0 1 0 12.25v-8.5C0 2.784.784 2 1.75 2ZM3.5 3.5v9h4.25v-9Zm5.75 0v9H14.25v-9Z' />
    </svg>
  );
}

function UnifiedViewIcon() {
  return (
    <svg
      viewBox='0 0 16 16'
      width='16'
      height='16'
      fill='currentColor'
      aria-hidden='true'
    >
      <path d='M1.75 2h12.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0 1 14.25 14H1.75A1.75 1.75 0 0 1 0 12.25v-8.5C0 2.784.784 2 1.75 2ZM3.5 3.5v9h9v-9Z' />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox='0 0 16 16'
      width='16'
      height='16'
      fill='currentColor'
      aria-hidden='true'
    >
      <path d='M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z' />
    </svg>
  );
}
