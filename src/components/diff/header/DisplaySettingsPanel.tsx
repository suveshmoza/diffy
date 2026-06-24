import type { CodeViewDisplayPrefs } from '@/lib/diff/display-prefs';

import { DIFF_INDICATOR_OPTIONS } from './displaySettingsOptions';
import { SettingsSwitch } from './SettingsSwitch';

type DisplaySettingsPanelProps = {
  id: string;
  displayPrefs: CodeViewDisplayPrefs;
  onChange: (partial: Partial<CodeViewDisplayPrefs>) => void;
};

/**
 * Body of the display settings popover. Loaded lazily so its controls and
 * icons stay out of the initial header bundle until the menu is first opened.
 */
export default function DisplaySettingsPanel({
  id,
  displayPrefs,
  onChange,
}: DisplaySettingsPanelProps) {
  return (
    <div
      id={id}
      className='gprv-settings-menu'
      role='dialog'
      aria-label='Display settings'
    >
      <div className='gprv-settings-row'>
        <span className='gprv-settings-row-label'>Diff indicators</span>
        <div
          className='gprv-settings-icon-group'
          role='group'
          aria-label='Diff indicators'
        >
          {DIFF_INDICATOR_OPTIONS.map((option) => (
            <button
              key={option.value}
              type='button'
              className='gprv-settings-icon-button'
              data-active={displayPrefs.diffIndicators === option.value ? '' : undefined}
              aria-pressed={displayPrefs.diffIndicators === option.value}
              title={option.label}
              onClick={() => onChange({ diffIndicators: option.value })}
            >
              {option.icon}
            </button>
          ))}
        </div>
      </div>

      <div className='gprv-settings-row'>
        <span className='gprv-settings-row-label'>Line numbers</span>
        <SettingsSwitch
          label='Line numbers'
          checked={!displayPrefs.disableLineNumbers}
          onChange={(show) => onChange({ disableLineNumbers: !show })}
        />
      </div>

      <div className='gprv-settings-row'>
        <span className='gprv-settings-row-label'>Word wrap</span>
        <SettingsSwitch
          label='Word wrap'
          checked={displayPrefs.overflow === 'wrap'}
          onChange={(wrap) => onChange({ overflow: wrap ? 'wrap' : 'scroll' })}
        />
      </div>
    </div>
  );
}
