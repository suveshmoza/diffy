import type { DiffsThemeNames } from '@pierre/diffs';
import {
  IconColumns,
  IconLayoutRows,
  IconLayoutSidebar,
  IconPaint,
  IconX,
} from '@tabler/icons-react';
import { memo, useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react';

import type { DiffLayout } from '@/lib/diff/layout-prefs';
import { DIFF_THEMES } from '@/lib/diff/themes/prefs';
import type { GitHubPullRequest } from '@/lib/github/api';
import { useDiffThemeContext } from '@/providers/DiffThemeProvider';
import { useSidebarContext } from '@/providers/SidebarContext';

type DiffOverlayHeaderProps = {
  pullRequest: GitHubPullRequest;
  diffLayout: DiffLayout;
  reviewCommentsLoadError?: string | null;
  onDiffLayoutChange: (layout: DiffLayout) => void;
  onClose: () => void;
  themeStyle?: CSSProperties;
};

export const DiffOverlayHeader = memo(function DiffOverlayHeader({
  pullRequest,
  diffLayout,
  reviewCommentsLoadError,
  onDiffLayoutChange,
  onClose,
  themeStyle,
}: DiffOverlayHeaderProps) {
  const { isSidebarCollapsed, toggleSidebar } = useSidebarContext();
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

function ThemePicker() {
  const { theme, setTheme } = useDiffThemeContext();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const selectTheme = useCallback(
    (next: DiffsThemeNames) => {
      void setTheme(next);
      close();
    },
    [close, setTheme],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }

      close();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [close, isOpen]);

  return (
    <div
      ref={rootRef}
      className='gprv-theme-picker'
    >
      <button
        type='button'
        className='gprv-header-icon-button gprv-theme-picker-trigger'
        aria-label={`Theme: ${theme}`}
        aria-haspopup='listbox'
        aria-expanded={isOpen}
        aria-controls={listboxId}
        title={`Theme: ${theme}`}
        onClick={() => setIsOpen((open) => !open)}
      >
        <IconPaint
          size={20}
          stroke={2}
        />
      </button>

      {isOpen ? (
        <ul
          id={listboxId}
          className='gprv-theme-picker-menu'
          role='listbox'
          aria-label='Theme'
        >
          {DIFF_THEMES.map((id) => (
            <li key={id}>
              <button
                type='button'
                className='gprv-theme-picker-option'
                role='option'
                aria-selected={id === theme}
                data-selected={id === theme ? '' : undefined}
                onClick={() => selectTheme(id)}
              >
                {id}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
