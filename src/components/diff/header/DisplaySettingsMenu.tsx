import { IconSettings } from '@tabler/icons-react';
import { useCallback, useId, useRef, useState } from 'react';

import { usePopoverDismiss } from '@/hooks/usePopoverDismiss';
import type { CodeViewDisplayPrefs } from '@/lib/diff/display-prefs';

import { DisplaySettingsPanel } from './DisplaySettingsPanel';

type DisplaySettingsMenuProps = {
  displayPrefs: CodeViewDisplayPrefs;
  onChange: (partial: Partial<CodeViewDisplayPrefs>) => void;
};

/** Settings popover trigger for display and appearance preferences. */
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
        aria-label='Settings'
        aria-haspopup='dialog'
        aria-expanded={isOpen}
        aria-controls={panelId}
        title='Settings'
        onClick={() => setIsOpen((open) => !open)}
      >
        <IconSettings
          size={16}
          stroke={2}
        />
      </button>

      {isOpen ? (
        <DisplaySettingsPanel
          id={panelId}
          displayPrefs={displayPrefs}
          onChange={onChange}
          onClose={close}
        />
      ) : null}
    </div>
  );
}
