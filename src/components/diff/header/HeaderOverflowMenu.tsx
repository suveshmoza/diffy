import {
  IconCaretUpDown,
  IconChevronRight,
  IconColumns,
  IconDotsVertical,
  IconExternalLink,
  IconLayoutRows,
  IconRefresh,
  IconSettings,
} from '@tabler/icons-react';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { IconCaretDownUp } from '@/components/icons/CaretDownUp';
import { usePopoverDismiss } from '@/hooks/usePopoverDismiss';
import type { CodeViewDisplayPrefs } from '@/lib/diff/display-prefs';
import type { DiffLayout } from '@/lib/diff/layout-prefs';

import { DisplaySettingsPanel } from './DisplaySettingsPanel';

type HeaderOverflowMenuProps = {
  diffLayout: DiffLayout;
  displayPrefs: CodeViewDisplayPrefs;
  allCollapsed: boolean;
  isRefreshing: boolean;
  canExpandOrCollapse: boolean;
  canRefresh: boolean;
  canOpenInNewTab: boolean;
  onDiffLayoutChange: (layout: DiffLayout) => void;
  onDisplayPrefsChange: (partial: Partial<CodeViewDisplayPrefs>) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  onRefresh?: () => void;
  onOpenInNewTab: () => void;
};

type OverflowView = 'actions' | 'settings';
type TransitionDirection = 'none' | 'forward' | 'back';

export function HeaderOverflowMenu({
  diffLayout,
  displayPrefs,
  allCollapsed,
  isRefreshing,
  canExpandOrCollapse,
  canRefresh,
  canOpenInNewTab,
  onDiffLayoutChange,
  onDisplayPrefsChange,
  onExpandAll,
  onCollapseAll,
  onRefresh,
  onOpenInNewTab,
}: HeaderOverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<OverflowView>('actions');
  const [transitionDirection, setTransitionDirection] = useState<TransitionDirection>('none');
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const isSideBySide = diffLayout === 'switched';

  const close = useCallback(() => {
    setIsOpen(false);
    setView('actions');
    setTransitionDirection('none');
  }, []);

  usePopoverDismiss(isOpen, rootRef, close);

  useEffect(() => {
    if (!isOpen || view !== 'actions') {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      menuRef.current
        ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
        ?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, view]);

  const runAction = useCallback(
    (action: () => void) => {
      action();
      close();
      triggerRef.current?.focus();
    },
    [close],
  );

  const openSettings = useCallback(() => {
    setTransitionDirection('forward');
    setView('settings');
  }, []);

  const returnToActions = useCallback(() => {
    setTransitionDirection('back');
    setView('actions');
  }, []);

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (view !== 'actions' || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      return;
    }

    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)'),
    );
    if (items.length === 0) {
      return;
    }

    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    let nextIndex = 0;

    if (event.key === 'End') {
      nextIndex = items.length - 1;
    } else if (event.key === 'ArrowDown') {
      nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
    } else if (event.key === 'ArrowUp') {
      nextIndex =
        currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
    }

    items[nextIndex]?.focus();
  };

  const nextLayout = isSideBySide ? 'stacked' : 'switched';

  return (
    <div
      ref={rootRef}
      className='gprv-header-popover gprv-header-overflow'
    >
      <button
        ref={triggerRef}
        type='button'
        className='gprv-header-icon-button gprv-header-popover-trigger'
        aria-label='More header actions'
        aria-haspopup='menu'
        aria-expanded={isOpen}
        aria-controls={panelId}
        title='More'
        onClick={() => {
          if (isOpen) {
            close();
            return;
          }
          setView('actions');
          setTransitionDirection('none');
          setIsOpen(true);
        }}
      >
        <IconDotsVertical
          size={16}
          stroke={2}
        />
      </button>

      {isOpen ? (
        <div
          ref={menuRef}
          id={panelId}
          className='gprv-header-popover-menu gprv-header-overflow-menu'
          role={view === 'actions' ? 'menu' : 'dialog'}
          aria-label={view === 'actions' ? 'Header actions' : 'Settings'}
          onKeyDown={handleMenuKeyDown}
        >
          <div
            key={view}
            className='gprv-header-overflow-view'
            data-direction={transitionDirection}
          >
            {view === 'actions' ? (
              <>
                <OverflowAction
                  icon={
                    isSideBySide ? (
                      <IconColumns
                        size={16}
                        stroke={2}
                      />
                    ) : (
                      <IconLayoutRows
                        size={16}
                        stroke={2}
                      />
                    )
                  }
                  label={isSideBySide ? 'Use unified diff' : 'Use side-by-side diff'}
                  onClick={() => runAction(() => onDiffLayoutChange(nextLayout))}
                />
                {canExpandOrCollapse ? (
                  <OverflowAction
                    icon={
                      allCollapsed ? (
                        <IconCaretDownUp
                          size={16}
                          strokeWidth={2}
                        />
                      ) : (
                        <IconCaretUpDown
                          size={16}
                          stroke={2}
                        />
                      )
                    }
                    label={allCollapsed ? 'Expand all files' : 'Collapse all files'}
                    onClick={() =>
                      runAction(() => {
                        if (allCollapsed) {
                          onExpandAll?.();
                        } else {
                          onCollapseAll?.();
                        }
                      })
                    }
                  />
                ) : null}
                {canRefresh ? (
                  <OverflowAction
                    icon={
                      <IconRefresh
                        className={isRefreshing ? 'gprv-loading-spinner' : undefined}
                        size={16}
                        stroke={2}
                      />
                    }
                    label={
                      isRefreshing ? 'Refreshing pull request data' : 'Refresh pull request data'
                    }
                    disabled={isRefreshing}
                    onClick={() => runAction(() => onRefresh?.())}
                  />
                ) : null}
                {canOpenInNewTab ? (
                  <OverflowAction
                    icon={
                      <IconExternalLink
                        size={16}
                        stroke={2}
                      />
                    }
                    label='Open in new tab'
                    onClick={() => runAction(onOpenInNewTab)}
                  />
                ) : null}
                <OverflowAction
                  icon={
                    <IconSettings
                      size={16}
                      stroke={2}
                    />
                  }
                  label='Settings'
                  suffix={
                    <IconChevronRight
                      size={14}
                      stroke={2}
                    />
                  }
                  onClick={openSettings}
                />
              </>
            ) : (
              <DisplaySettingsPanel
                id={`${panelId}-settings`}
                displayPrefs={displayPrefs}
                onChange={onDisplayPrefsChange}
                onClose={close}
                onBack={returnToActions}
                embedded
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type OverflowActionProps = {
  icon: ReactNode;
  label: string;
  suffix?: ReactNode;
  disabled?: boolean;
  onClick: () => void;
};

function OverflowAction({ icon, label, suffix, disabled = false, onClick }: OverflowActionProps) {
  return (
    <button
      type='button'
      className='gprv-header-popover-option gprv-header-overflow-option'
      role='menuitem'
      disabled={disabled}
      onClick={onClick}
    >
      <span className='gprv-header-overflow-option-icon'>{icon}</span>
      <span className='gprv-header-overflow-option-label'>{label}</span>
      {suffix ? <span className='gprv-header-overflow-option-suffix'>{suffix}</span> : null}
    </button>
  );
}
