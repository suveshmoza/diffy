import type { ReactNode } from 'react';

import type { CodeViewDisplayPrefs } from '@/lib/diff/display-prefs';

import {
  DIFF_INDICATOR_OPTIONS,
  HUNK_SEPARATOR_OPTIONS,
  LINE_NUMBER_OPTIONS,
  OVERFLOW_OPTIONS,
} from './displaySettingsOptions';
import { SegmentedControl } from './SegmentedControl';

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
      <SettingsGroup label='Diff indicators'>
        <SegmentedControl
          ariaLabel='Diff indicators'
          options={DIFF_INDICATOR_OPTIONS}
          value={displayPrefs.diffIndicators}
          onChange={(diffIndicators) => onChange({ diffIndicators })}
        />
      </SettingsGroup>

      <SettingsGroup label='Hunk separators'>
        <SegmentedControl
          ariaLabel='Hunk separators'
          options={HUNK_SEPARATOR_OPTIONS}
          value={displayPrefs.hunkSeparators}
          onChange={(hunkSeparators) => onChange({ hunkSeparators })}
          wrap
        />
      </SettingsGroup>

      <SettingsGroup label='Line numbers'>
        <SegmentedControl
          ariaLabel='Line numbers'
          options={LINE_NUMBER_OPTIONS}
          value={displayPrefs.disableLineNumbers ? 'hide' : 'show'}
          onChange={(choice) => onChange({ disableLineNumbers: choice === 'hide' })}
        />
      </SettingsGroup>

      <SettingsGroup label='Line overflow'>
        <SegmentedControl
          ariaLabel='Line overflow'
          options={OVERFLOW_OPTIONS}
          value={displayPrefs.overflow}
          onChange={(overflow) => onChange({ overflow })}
        />
      </SettingsGroup>
    </div>
  );
}

function SettingsGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='gprv-settings-group'>
      <span className='gprv-settings-label'>{label}</span>
      {children}
    </div>
  );
}
