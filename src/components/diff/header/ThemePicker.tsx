import type { ColorMode } from '@pierre/theming';
import { IconChevronLeft, IconMoon, IconPaint, IconSun, IconSunMoon } from '@tabler/icons-react';
import { useCallback, useId, useRef, useState } from 'react';

import { usePopoverDismiss } from '@/hooks/usePopoverDismiss';
import { diffyThemeCatalog } from '@/lib/theming/themeCatalog';
import { useThemeSelection } from '@/providers/theming/useThemeSelection';

import { SegmentedControl } from './SegmentedControl';

type ThemePickerView = 'main' | 'light' | 'dark';

const MODE_OPTIONS = [
  {
    value: 'system' as const,
    label: 'Auto',
    icon: (
      <IconSunMoon
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

export function ThemePicker() {
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

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<ThemePickerView>('main');
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const close = useCallback(() => {
    setIsOpen(false);
    setView('main');
  }, []);

  usePopoverDismiss(isOpen, rootRef, close);

  const themesAreCustom =
    lightThemeName !== diffyThemeCatalog.defaultLightThemeName ||
    darkThemeName !== diffyThemeCatalog.defaultDarkThemeName;

  const activeThemeName =
    colorMode === 'dark'
      ? darkThemeName
      : colorMode === 'light'
        ? lightThemeName
        : `${lightThemeName} / ${darkThemeName}`;

  return (
    <div
      ref={rootRef}
      className='gprv-header-popover'
    >
      <button
        type='button'
        className='gprv-header-icon-button gprv-header-popover-trigger'
        aria-label={`Theme: ${activeThemeName}`}
        aria-haspopup='dialog'
        aria-expanded={isOpen}
        aria-controls={listboxId}
        title={`Theme: ${activeThemeName}`}
        onClick={() => setIsOpen((open) => !open)}
      >
        <IconPaint
          size={16}
          stroke={2}
        />
      </button>

      {isOpen ? (
        <div
          id={listboxId}
          className='gprv-header-popover-menu gprv-theme-picker-menu'
          role='dialog'
          aria-label='Theme settings'
        >
          {view === 'main' ? (
            <>
              <div className='gprv-theme-picker-section'>
                <SegmentedControl
                  ariaLabel='Color mode'
                  options={MODE_OPTIONS}
                  value={colorMode}
                  onChange={(mode: ColorMode) => setColorMode(mode)}
                />
              </div>
              <button
                type='button'
                className='gprv-header-popover-option gprv-theme-picker-row'
                onClick={() => setView('light')}
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
                onClick={() => setView('dark')}
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
            </>
          ) : (
            <>
              <button
                type='button'
                className='gprv-header-popover-option gprv-theme-picker-back'
                onClick={() => setView('main')}
              >
                <IconChevronLeft
                  size={14}
                  stroke={2}
                />
                <span>{view === 'light' ? 'Light themes' : 'Dark themes'}</span>
              </button>
              <ul
                className='gprv-theme-picker-list'
                role='listbox'
                aria-label={view === 'light' ? 'Light themes' : 'Dark themes'}
              >
                {(view === 'light' ? lightThemeNames : darkThemeNames).map((themeName) => {
                  const isSelected =
                    view === 'light' ? themeName === lightThemeName : themeName === darkThemeName;
                  return (
                    <li key={themeName}>
                      <button
                        type='button'
                        className='gprv-header-popover-option'
                        role='option'
                        aria-selected={isSelected}
                        data-selected={isSelected ? '' : undefined}
                        onClick={() => {
                          pickTheme(view === 'light' ? 'light' : 'dark', themeName);
                          close();
                        }}
                      >
                        {themeName}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
