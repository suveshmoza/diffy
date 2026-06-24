import { IconSettings } from '@tabler/icons-react';
import { lazy, Suspense, useCallback, useId, useRef, useState } from 'react';

import { usePopoverDismiss } from '@/hooks/usePopoverDismiss';
import type { CodeViewDisplayPrefs } from '@/lib/diff/display-prefs';

const DisplaySettingsPanel = lazy(() => import('./DisplaySettingsPanel'));

type DisplaySettingsMenuProps = {
  displayPrefs: CodeViewDisplayPrefs;
  onChange: (partial: Partial<CodeViewDisplayPrefs>) => void;
};

/**
 * Settings popover trigger. The panel body is code-split and only fetched the
 * first time the menu opens. Selecting options keeps the popover open; it is
 * dismissed only by clicking outside or pressing Escape.
 */
export function DisplaySettingsMenu({ displayPrefs, onChange }: DisplaySettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  usePopoverDismiss(isOpen, rootRef, close);

  return (
    <div
      ref={rootRef}
      className='gprv-header-popover'
    >
      <button
        type='button'
        className='gprv-header-icon-button gprv-header-popover-trigger'
        aria-label='Display settings'
        aria-haspopup='dialog'
        aria-expanded={isOpen}
        aria-controls={panelId}
        title='Display settings'
        onClick={() => setIsOpen((open) => !open)}
      >
        <IconSettings
          size={16}
          stroke={2}
        />
      </button>

      {isOpen ? (
        <Suspense fallback={null}>
          <DisplaySettingsPanel
            id={panelId}
            displayPrefs={displayPrefs}
            onChange={onChange}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
