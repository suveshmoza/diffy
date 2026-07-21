import type { ColorMode } from '@pierre/theming';
import {
  IconChevronLeft,
  IconCode,
  IconDeviceDesktop,
  IconFolder,
  IconMoon,
  IconSun,
  IconTypography,
} from '@tabler/icons-react';
import { useEffect, useState, type KeyboardEvent } from 'react';

import type { CodeViewDisplayPrefs } from '@/lib/diff/display-prefs';
import {
  CODE_FONT_FEATURE_OPTIONS,
  CODE_FONT_OPTIONS,
  getCodeFontFeaturesLabel,
  getCodeFontLabel,
  getTreeFontLabel,
  sanitizeFontFamilyName,
  sanitizeFontFeatures,
  TREE_FONT_OPTIONS,
  type CodeFontFeaturesPreset,
} from '@/lib/diff/font-prefs';
import { diffyThemeCatalog } from '@/lib/theming/themeCatalog';
import { useThemeSelection } from '@/providers/theming/useThemeSelection';

import {
  CODE_FONT_SIZE_OPTIONS,
  CODE_LINE_HEIGHT_OPTIONS,
  DIFF_INDICATOR_OPTIONS,
} from './displaySettingsOptions';
import { SegmentedControl } from './SegmentedControl';
import { SettingsSwitch } from './SettingsSwitch';

type SettingsView = 'main' | 'light' | 'dark' | 'code-font' | 'tree-font' | 'font-features';
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
  const [customCodeFontDraft, setCustomCodeFontDraft] = useState(
    displayPrefs.codeFont.custom ?? '',
  );
  const [customTreeFontDraft, setCustomTreeFontDraft] = useState(
    displayPrefs.treeFont.custom ?? '',
  );
  const [customFontFeaturesDraft, setCustomFontFeaturesDraft] = useState(
    displayPrefs.codeFontFeatures.custom ?? '',
  );

  useEffect(() => {
    setCustomCodeFontDraft(displayPrefs.codeFont.custom ?? '');
  }, [displayPrefs.codeFont.custom]);

  useEffect(() => {
    setCustomTreeFontDraft(displayPrefs.treeFont.custom ?? '');
  }, [displayPrefs.treeFont.custom]);

  useEffect(() => {
    setCustomFontFeaturesDraft(displayPrefs.codeFontFeatures.custom ?? '');
  }, [displayPrefs.codeFontFeatures.custom]);

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

  const commitCustomCodeFont = () => {
    const custom = sanitizeFontFamilyName(customCodeFontDraft);
    setCustomCodeFontDraft(custom);
    onChange({ codeFont: { preset: 'custom', custom } });
  };

  const commitCustomTreeFont = () => {
    const custom = sanitizeFontFamilyName(customTreeFontDraft);
    setCustomTreeFontDraft(custom);
    onChange({ treeFont: { preset: 'custom', custom } });
  };

  const commitCustomFontFeatures = () => {
    const custom = sanitizeFontFeatures(customFontFeaturesDraft);
    setCustomFontFeaturesDraft(custom);
    onChange({ codeFontFeatures: { preset: 'custom', custom } });
  };

  if (view === 'code-font') {
    return (
      <FontPickerView
        id={id}
        embedded={embedded}
        label='Code font'
        options={CODE_FONT_OPTIONS}
        value={displayPrefs.codeFont}
        customDraft={customCodeFontDraft}
        customPlaceholder='Berkeley Mono'
        transitionDirection={transitionDirection}
        onBack={returnToMainView}
        onCustomDraftChange={setCustomCodeFontDraft}
        onCommitCustom={commitCustomCodeFont}
        onSelectPreset={(preset) => {
          if (preset === 'custom') {
            onChange({
              codeFont: {
                preset: 'custom',
                custom: sanitizeFontFamilyName(customCodeFontDraft),
              },
            });
            return;
          }
          onChange({ codeFont: { preset } });
          returnToMainView();
        }}
      />
    );
  }

  if (view === 'tree-font') {
    return (
      <FontPickerView
        id={id}
        embedded={embedded}
        label='File tree font'
        options={TREE_FONT_OPTIONS}
        value={displayPrefs.treeFont}
        customDraft={customTreeFontDraft}
        customPlaceholder='SF Pro Text'
        transitionDirection={transitionDirection}
        onBack={returnToMainView}
        onCustomDraftChange={setCustomTreeFontDraft}
        onCommitCustom={commitCustomTreeFont}
        onSelectPreset={(preset) => {
          if (preset === 'custom') {
            onChange({
              treeFont: {
                preset: 'custom',
                custom: sanitizeFontFamilyName(customTreeFontDraft),
              },
            });
            return;
          }
          onChange({ treeFont: { preset } });
          returnToMainView();
        }}
      />
    );
  }

  if (view === 'font-features') {
    return (
      <FontPickerView
        id={id}
        embedded={embedded}
        label='Font features'
        options={CODE_FONT_FEATURE_OPTIONS}
        value={displayPrefs.codeFontFeatures}
        customDraft={customFontFeaturesDraft}
        customPlaceholder='"liga" 1, "calt" 1'
        transitionDirection={transitionDirection}
        onBack={returnToMainView}
        onCustomDraftChange={setCustomFontFeaturesDraft}
        onCommitCustom={commitCustomFontFeatures}
        onSelectPreset={(preset: CodeFontFeaturesPreset) => {
          if (preset === 'custom') {
            onChange({
              codeFontFeatures: {
                preset: 'custom',
                custom: sanitizeFontFeatures(customFontFeaturesDraft),
              },
            });
            return;
          }
          onChange({ codeFontFeatures: { preset } });
          returnToMainView();
        }}
      />
    );
  }

  if (view === 'light' || view === 'dark') {
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
          aria-labelledby={`${id}-fonts-label`}
        >
          <h3
            id={`${id}-fonts-label`}
            className='gprv-settings-section-label'
          >
            Fonts
          </h3>
          <div className='gprv-settings-section-content'>
            <button
              type='button'
              className='gprv-header-popover-option gprv-theme-picker-row'
              onClick={() => openNestedView('code-font')}
            >
              <IconCode
                size={14}
                stroke={2}
              />
              <span className='gprv-theme-picker-row-label'>Code font</span>
              <span className='gprv-theme-picker-row-value'>
                {getCodeFontLabel(displayPrefs.codeFont)}
              </span>
            </button>
            {displayPrefs.codeFont.preset === 'custom' ? (
              <CustomFontInput
                id={`${id}-code-font-custom`}
                label='Custom code font'
                value={customCodeFontDraft}
                placeholder='Berkeley Mono'
                onChange={setCustomCodeFontDraft}
                onCommit={commitCustomCodeFont}
              />
            ) : null}

            <button
              type='button'
              className='gprv-header-popover-option gprv-theme-picker-row'
              onClick={() => openNestedView('tree-font')}
            >
              <IconFolder
                size={14}
                stroke={2}
              />
              <span className='gprv-theme-picker-row-label'>File tree font</span>
              <span className='gprv-theme-picker-row-value'>
                {getTreeFontLabel(displayPrefs.treeFont)}
              </span>
            </button>
            {displayPrefs.treeFont.preset === 'custom' ? (
              <CustomFontInput
                id={`${id}-tree-font-custom`}
                label='Custom file tree font'
                value={customTreeFontDraft}
                placeholder='SF Pro Text'
                onChange={setCustomTreeFontDraft}
                onCommit={commitCustomTreeFont}
              />
            ) : null}

            <div className='gprv-settings-row'>
              <span className='gprv-settings-row-label'>Size</span>
              <SegmentedControl
                ariaLabel='Code font size'
                options={CODE_FONT_SIZE_OPTIONS}
                value={displayPrefs.codeFontSize}
                onChange={(codeFontSize) => onChange({ codeFontSize })}
              />
            </div>

            <div className='gprv-settings-row'>
              <span className='gprv-settings-row-label'>Line height</span>
              <SegmentedControl
                ariaLabel='Code line height'
                options={CODE_LINE_HEIGHT_OPTIONS}
                value={displayPrefs.codeLineHeight}
                onChange={(codeLineHeight) => onChange({ codeLineHeight })}
              />
            </div>

            <button
              type='button'
              className='gprv-header-popover-option gprv-theme-picker-row'
              onClick={() => openNestedView('font-features')}
            >
              <IconTypography
                size={14}
                stroke={2}
              />
              <span className='gprv-theme-picker-row-label'>Features</span>
              <span className='gprv-theme-picker-row-value'>
                {getCodeFontFeaturesLabel(displayPrefs.codeFontFeatures)}
              </span>
            </button>
            {displayPrefs.codeFontFeatures.preset === 'custom' ? (
              <CustomFontInput
                id={`${id}-font-features-custom`}
                label='Custom font features'
                value={customFontFeaturesDraft}
                placeholder='"liga" 1, "calt" 1'
                onChange={setCustomFontFeaturesDraft}
                onCommit={commitCustomFontFeatures}
              />
            ) : null}
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

type FontPickerViewProps<TPreset extends string> = {
  id: string;
  embedded: boolean;
  label: string;
  options: readonly { value: TPreset; label: string }[];
  value: FontPreferenceLike<TPreset>;
  customDraft: string;
  customPlaceholder: string;
  transitionDirection: TransitionDirection;
  onBack: () => void;
  onCustomDraftChange: (value: string) => void;
  onCommitCustom: () => void;
  onSelectPreset: (preset: TPreset) => void;
};

type FontPreferenceLike<TPreset extends string> = {
  preset: TPreset;
  custom?: string;
};

function FontPickerView<TPreset extends string>({
  id,
  embedded,
  label,
  options,
  value,
  customDraft,
  customPlaceholder,
  transitionDirection,
  onBack,
  onCustomDraftChange,
  onCommitCustom,
  onSelectPreset,
}: FontPickerViewProps<TPreset>) {
  return (
    <div
      id={id}
      className={`gprv-settings-menu gprv-settings-menu-nested${embedded ? ' gprv-settings-menu-embedded' : ''}`}
      role='dialog'
      aria-label={label}
    >
      <div
        key={label}
        className='gprv-settings-menu-view gprv-settings-menu-view-nested'
        data-direction={transitionDirection}
      >
        <button
          type='button'
          className='gprv-header-popover-option gprv-theme-picker-back'
          onClick={onBack}
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
          {options.map((option) => {
            const isSelected = option.value === value.preset;
            return (
              <li key={option.value}>
                <button
                  type='button'
                  className='gprv-header-popover-option'
                  role='option'
                  aria-selected={isSelected}
                  data-selected={isSelected ? '' : undefined}
                  onClick={() => onSelectPreset(option.value)}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
        {value.preset === ('custom' as TPreset) ? (
          <CustomFontInput
            id={`${id}-custom`}
            label={`Custom ${label.toLowerCase()}`}
            value={customDraft}
            placeholder={customPlaceholder}
            onChange={onCustomDraftChange}
            onCommit={onCommitCustom}
          />
        ) : null}
      </div>
    </div>
  );
}

type CustomFontInputProps = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onCommit: () => void;
};

function CustomFontInput({
  id,
  label,
  value,
  placeholder,
  onChange,
  onCommit,
}: CustomFontInputProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onCommit();
    }
  };

  return (
    <label
      className='gprv-font-custom-field'
      htmlFor={id}
    >
      <span className='gprv-font-custom-label'>{label}</span>
      <input
        id={id}
        className='gprv-font-custom-input'
        type='text'
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete='off'
        autoCorrect='off'
        autoCapitalize='off'
        onChange={(event) => onChange(event.target.value)}
        onBlur={onCommit}
        onKeyDown={handleKeyDown}
      />
    </label>
  );
}
