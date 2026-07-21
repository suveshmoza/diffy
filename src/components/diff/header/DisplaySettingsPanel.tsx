import type { ColorMode } from '@pierre/theming';
import { IconChevronLeft, IconDeviceDesktop, IconMoon, IconSun } from '@tabler/icons-react';
import { useState } from 'react';

import type { CodeViewDisplayPrefs } from '@/lib/diff/display-prefs';
import { diffyThemeCatalog } from '@/lib/theming/themeCatalog';
import { useThemeSelection } from '@/providers/theming/useThemeSelection';

import { DIFF_INDICATOR_OPTIONS } from './displaySettingsOptions';
import { SegmentedControl } from './SegmentedControl';
import { SettingsSwitch } from './SettingsSwitch';

type SettingsView = 'main' | 'light' | 'dark';
type TransitionDirection = 'none' | 'forward' | 'back';

const MODE_OPTIONS = [
  {
    value: 'system' as const,
    label: 'Auto',
    icon: (
      <IconDeviceDesktop
        size={14}
        stroke={2}
      />
    ),
  },
  {
    value: 'light' as const,
    label: 'Light',
    icon: (
      <IconSun
        size={14}
        stroke={2}
      />
    ),
  },
  {
    value: 'dark' as const,
    label: 'Dark',
    icon: (
      <IconMoon
        size={14}
        stroke={2}
      />
    ),
  },
];

type DisplaySettingsPanelProps = {
  id: string;
  displayPrefs: CodeViewDisplayPrefs;
  onChange: (partial: Partial<CodeViewDisplayPrefs>) => void;
  onClose: () => void;
  onBack?: () => void;
  embedded?: boolean;
};

export function DisplaySettingsPanel({
  id,
  displayPrefs,
  onChange,
  onClose,
  onBack,
  embedded = false,
}: DisplaySettingsPanelProps) {
  const {
    colorMode,
    lightThemeName,
    darkThemeName,
    lightThemeNames,
    darkThemeNames,
    setColorMode,
    setLightThemeName,
    setDarkThemeName,
    pickTheme,
  } = useThemeSelection();
  const [view, setView] = useState<SettingsView>('main');
  const [transitionDirection, setTransitionDirection] = useState<TransitionDirection>('none');

  const openNestedView = (nextView: Exclude<SettingsView, 'main'>) => {
    setTransitionDirection('forward');
    setView(nextView);
  };

  const returnToMainView = () => {
    setTransitionDirection('back');
    setView('main');
  };

  const themesAreCustom =
    lightThemeName !== diffyThemeCatalog.defaultLightThemeName ||
    darkThemeName !== diffyThemeCatalog.defaultDarkThemeName;

  if (view !== 'main') {
    const themeNames = view === 'light' ? lightThemeNames : darkThemeNames;
    const selectedThemeName = view === 'light' ? lightThemeName : darkThemeName;
    const label = view === 'light' ? 'Light themes' : 'Dark themes';

    return (
      <div
        id={id}
        className={`gprv-settings-menu gprv-settings-menu-nested${embedded ? ' gprv-settings-menu-embedded' : ''}`}
        role='dialog'
        aria-label={label}
      >
        <div
          key={view}
          className='gprv-settings-menu-view gprv-settings-menu-view-nested'
          data-direction={transitionDirection}
        >
          <button
            type='button'
            className='gprv-header-popover-option gprv-theme-picker-back'
            onClick={returnToMainView}
          >
            <IconChevronLeft
              size={14}
              stroke={2}
            />
            <span>{label}</span>
          </button>
          <ul
            className='gprv-theme-picker-list'
            role='listbox'
            aria-label={label}
          >
            {themeNames.map((themeName) => {
              const isSelected = themeName === selectedThemeName;
              return (
                <li key={themeName}>
                  <button
                    type='button'
                    className='gprv-header-popover-option'
                    role='option'
                    aria-selected={isSelected}
                    data-selected={isSelected ? '' : undefined}
                    onClick={() => {
                      pickTheme(view, themeName);
                      onClose();
                    }}
                  >
                    {themeName}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div
      id={id}
      className={`gprv-settings-menu${embedded ? ' gprv-settings-menu-embedded' : ''}`}
      role='dialog'
      aria-label='Settings'
    >
      <div
        key={view}
        className='gprv-settings-menu-view'
        data-direction={transitionDirection}
      >
        {onBack ? (
          <button
            type='button'
            className='gprv-header-popover-option gprv-theme-picker-back'
            onClick={onBack}
          >
            <IconChevronLeft
              size={14}
              stroke={2}
            />
            <span>Header actions</span>
          </button>
        ) : null}
        <section
          className='gprv-settings-section'
          aria-labelledby={`${id}-display-label`}
        >
          <h3
            id={`${id}-display-label`}
            className='gprv-settings-section-label'
          >
            Display
          </h3>
          <div className='gprv-settings-section-content'>
            <div className='gprv-settings-row'>
              <span className='gprv-settings-row-label'>Diff indicators</span>
              <SegmentedControl
                ariaLabel='Diff indicators'
                options={DIFF_INDICATOR_OPTIONS}
                value={displayPrefs.diffIndicators}
                onChange={(diffIndicators) => onChange({ diffIndicators })}
                showLabels={false}
              />
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
        </section>

        <section
          className='gprv-settings-section'
          aria-labelledby={`${id}-appearance-label`}
        >
          <h3
            id={`${id}-appearance-label`}
            className='gprv-settings-section-label'
          >
            Appearance
          </h3>
          <div className='gprv-settings-section-content'>
            <div className='gprv-settings-row'>
              <span className='gprv-settings-row-label'>Color mode</span>
              <SegmentedControl
                ariaLabel='Color mode'
                options={MODE_OPTIONS}
                value={colorMode}
                onChange={(mode: ColorMode) => setColorMode(mode)}
                showLabels={false}
              />
            </div>

            <button
              type='button'
              className='gprv-header-popover-option gprv-theme-picker-row'
              onClick={() => openNestedView('light')}
            >
              <IconSun
                size={14}
                stroke={2}
              />
              <span className='gprv-theme-picker-row-label'>Light theme</span>
              <span className='gprv-theme-picker-row-value'>{lightThemeName}</span>
            </button>
            <button
              type='button'
              className='gprv-header-popover-option gprv-theme-picker-row'
              onClick={() => openNestedView('dark')}
            >
              <IconMoon
                size={14}
                stroke={2}
              />
              <span className='gprv-theme-picker-row-label'>Dark theme</span>
              <span className='gprv-theme-picker-row-value'>{darkThemeName}</span>
            </button>
            {themesAreCustom ? (
              <button
                type='button'
                className='gprv-header-popover-option gprv-theme-picker-reset'
                onClick={() => {
                  setLightThemeName(diffyThemeCatalog.defaultLightThemeName);
                  setDarkThemeName(diffyThemeCatalog.defaultDarkThemeName);
                }}
              >
                Reset to default themes
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
