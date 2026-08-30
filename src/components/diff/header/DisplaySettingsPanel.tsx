import {
  IconColorAuto,
  IconColorDark,
  IconColorLight,
  IconImage,
  IconListUnordered,
  IconThemes,
  IconType,
} from '@pierre/icons';
import type { ColorMode } from '@pierre/theming';
import { useEffect, useState, type KeyboardEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CodeViewDisplayPrefs } from '@/lib/diff/display-prefs';
import {
  CODE_FONT_FEATURE_OPTIONS,
  CODE_FONT_OPTIONS,
  MAX_CODE_FONT_SIZE,
  MAX_CODE_LINE_HEIGHT,
  MIN_CODE_FONT_SIZE,
  MIN_CODE_LINE_HEIGHT,
  normalizeCodeFontSize,
  normalizeCodeLineHeight,
  sanitizeFontFamilyName,
  sanitizeFontFeatures,
  TREE_FONT_OPTIONS,
  type CodeFontFeaturesPreset,
  type CodeFontPreset,
  type TreeFontPreset,
} from '@/lib/diff/font-prefs';
import { diffyThemeCatalog } from '@/lib/theming/themeCatalog';
import { cn } from '@/lib/utils';
import { useThemeSelection } from '@/providers/theming/useThemeSelection';

import { DIFF_INDICATOR_OPTIONS, IMAGE_COMPARE_MODE_OPTIONS } from './displaySettingsOptions';
import {
  OVERFLOW_MENU_ICON,
  OVERFLOW_MENU_SECTION_ICON,
  OverflowMenuBackHeader,
  OverflowMenuItem,
  overflowMenuItemClassName,
  OverflowMenuPanel,
  OverflowMenuPickerItem,
  OverflowMenuSettingsRow,
  OverflowMenuSettingsSection,
} from './overflowMenuUi';
import { SegmentedControl } from './SegmentedControl';
import { SettingsSwitch } from './SettingsSwitch';

type SettingsView = 'main' | 'light' | 'dark';

type DisplaySettingsScope = 'appearance' | 'display';

const MODE_OPTIONS = [
  {
    value: 'system' as const,
    label: 'Auto',
    icon: <IconColorAuto {...OVERFLOW_MENU_ICON} />,
  },
  {
    value: 'light' as const,
    label: 'Light',
    icon: <IconColorLight {...OVERFLOW_MENU_ICON} />,
  },
  {
    value: 'dark' as const,
    label: 'Dark',
    icon: <IconColorDark {...OVERFLOW_MENU_ICON} />,
  },
];

type DisplaySettingsPanelProps = {
  id: string;
  onClose: () => void;
  onBack?: () => void;
  backLabel?: string;
  active?: boolean;
  embedded?: boolean;
  scope?: DisplaySettingsScope;
} & (
  | {
      scope?: 'display';
      displayPrefs: CodeViewDisplayPrefs;
      onChange: (partial: Partial<CodeViewDisplayPrefs>) => void;
    }
  | {
      scope: 'appearance';
      displayPrefs?: never;
      onChange?: never;
    }
);

export function DisplaySettingsPanel(props: DisplaySettingsPanelProps) {
  const {
    id,
    onClose,
    onBack,
    backLabel,
    active = true,
    embedded = false,
    scope = 'display',
  } = props;
  const displayPrefs = scope === 'display' ? props.displayPrefs : null;
  const onChange = scope === 'display' ? props.onChange : null;
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
  const [prevActive, setPrevActive] = useState(active);
  if (active !== prevActive) {
    setPrevActive(active);
    if (!active) {
      setView('main');
    }
  }

  const [customCodeFontDraft, setCustomCodeFontDraft] = useState(
    displayPrefs?.codeFont.custom ?? '',
  );
  const [prevCodeFontCustom, setPrevCodeFontCustom] = useState(displayPrefs?.codeFont.custom);
  if (displayPrefs && displayPrefs.codeFont.custom !== prevCodeFontCustom) {
    setPrevCodeFontCustom(displayPrefs.codeFont.custom);
    setCustomCodeFontDraft(displayPrefs.codeFont.custom ?? '');
  }

  const [customTreeFontDraft, setCustomTreeFontDraft] = useState(
    displayPrefs?.treeFont.custom ?? '',
  );
  const [prevTreeFontCustom, setPrevTreeFontCustom] = useState(displayPrefs?.treeFont.custom);
  if (displayPrefs && displayPrefs.treeFont.custom !== prevTreeFontCustom) {
    setPrevTreeFontCustom(displayPrefs.treeFont.custom);
    setCustomTreeFontDraft(displayPrefs.treeFont.custom ?? '');
  }

  const [customFontFeaturesDraft, setCustomFontFeaturesDraft] = useState(
    displayPrefs?.codeFontFeatures.custom ?? '',
  );
  const [prevFontFeaturesCustom, setPrevFontFeaturesCustom] = useState(
    displayPrefs?.codeFontFeatures.custom,
  );
  if (displayPrefs && displayPrefs.codeFontFeatures.custom !== prevFontFeaturesCustom) {
    setPrevFontFeaturesCustom(displayPrefs.codeFontFeatures.custom);
    setCustomFontFeaturesDraft(displayPrefs.codeFontFeatures.custom ?? '');
  }

  const openNestedView = (nextView: Exclude<SettingsView, 'main'>) => {
    setView(nextView);
  };

  const returnToMainView = () => {
    setView('main');
  };
  const themesAreCustom =
    lightThemeName !== diffyThemeCatalog.defaultLightThemeName ||
    darkThemeName !== diffyThemeCatalog.defaultDarkThemeName;

  const commitCustomCodeFont = () => {
    if (!displayPrefs || !onChange) {
      return;
    }
    const custom = sanitizeFontFamilyName(customCodeFontDraft);
    setCustomCodeFontDraft(custom);
    onChange({ codeFont: { preset: 'custom', custom } });
  };

  const commitCustomTreeFont = () => {
    if (!displayPrefs || !onChange) {
      return;
    }
    const custom = sanitizeFontFamilyName(customTreeFontDraft);
    setCustomTreeFontDraft(custom);
    onChange({ treeFont: { preset: 'custom', custom } });
  };

  const commitCustomFontFeatures = () => {
    if (!displayPrefs || !onChange) {
      return;
    }
    const custom = sanitizeFontFeatures(customFontFeaturesDraft);
    setCustomFontFeaturesDraft(custom);
    onChange({ codeFontFeatures: { preset: 'custom', custom } });
  };

  if (scope === 'appearance' && (view === 'light' || view === 'dark')) {
    const themeNames = view === 'light' ? lightThemeNames : darkThemeNames;
    const selectedThemeName = view === 'light' ? lightThemeName : darkThemeName;
    const label = view === 'light' ? 'Light themes' : 'Dark themes';

    return (
      <OverflowMenuPanel
        id={id}
        ariaLabel={label}
        className='p-0'
      >
        <OverflowMenuBackHeader
          label={label}
          onClick={returnToMainView}
        />
        <ul
          className='flex flex-col gap-0.5 p-1'
          role='listbox'
          aria-label={label}
        >
          {themeNames.map((themeName) => {
            const isSelected = themeName === selectedThemeName;
            return (
              <li key={themeName}>
                <OverflowMenuItem
                  label={themeName}
                  selected={isSelected}
                  role='option'
                  onClick={() => {
                    pickTheme(view, themeName);
                    onClose();
                  }}
                />
              </li>
            );
          })}
        </ul>
      </OverflowMenuPanel>
    );
  }

  const panelLabel = scope === 'appearance' ? 'Appearance settings' : 'Display settings';
  const resolvedBackLabel = backLabel ?? panelLabel;

  const mainContent = (
    <div className={cn('flex flex-col gap-1', !embedded && 'p-1 pt-0')}>
      {scope === 'display' && displayPrefs && onChange ? (
        <>
          <OverflowMenuSettingsSection
            id={`${id}-display-label`}
            label='Display'
            icon={<IconListUnordered {...OVERFLOW_MENU_SECTION_ICON} />}
          >
            <OverflowMenuSettingsRow label='Diff indicators'>
              <SegmentedControl
                ariaLabel='Diff indicators'
                options={DIFF_INDICATOR_OPTIONS}
                value={displayPrefs.diffIndicators}
                onChange={(diffIndicators) => onChange({ diffIndicators })}
                showLabels={false}
              />
            </OverflowMenuSettingsRow>

            <OverflowMenuSettingsRow label='Line numbers'>
              <SettingsSwitch
                label='Line numbers'
                checked={!displayPrefs.disableLineNumbers}
                onChange={(show) => onChange({ disableLineNumbers: !show })}
              />
            </OverflowMenuSettingsRow>

            <OverflowMenuSettingsRow label='Word wrap'>
              <SettingsSwitch
                label='Word wrap'
                checked={displayPrefs.overflow === 'wrap'}
                onChange={(wrap) => onChange({ overflow: wrap ? 'wrap' : 'scroll' })}
              />
            </OverflowMenuSettingsRow>
          </OverflowMenuSettingsSection>

          <OverflowMenuSettingsSection
            id={`${id}-fonts-label`}
            label='Fonts'
            icon={<IconType {...OVERFLOW_MENU_SECTION_ICON} />}
          >
            <FontPresetSelectRow
              id={`${id}-code-font`}
              label='Code font'
              options={CODE_FONT_OPTIONS}
              value={displayPrefs.codeFont.preset}
              onValueChange={(preset: CodeFontPreset) => {
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
              }}
            />
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

            <FontPresetSelectRow
              id={`${id}-tree-font`}
              label='File tree font'
              options={TREE_FONT_OPTIONS}
              value={displayPrefs.treeFont.preset}
              onValueChange={(preset: TreeFontPreset) => {
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
              }}
            />
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

            <OverflowMenuSettingsRow label='Size'>
              <CodeMetricInput
                id={`${id}-font-size`}
                ariaLabel='Code font size'
                value={displayPrefs.codeFontSize}
                min={MIN_CODE_FONT_SIZE}
                max={MAX_CODE_FONT_SIZE}
                normalize={normalizeCodeFontSize}
                onChange={(codeFontSize) => onChange({ codeFontSize })}
              />
            </OverflowMenuSettingsRow>

            <OverflowMenuSettingsRow label='Line height'>
              <CodeMetricInput
                id={`${id}-line-height`}
                ariaLabel='Code line height'
                value={displayPrefs.codeLineHeight}
                min={MIN_CODE_LINE_HEIGHT}
                max={MAX_CODE_LINE_HEIGHT}
                normalize={normalizeCodeLineHeight}
                onChange={(codeLineHeight) => onChange({ codeLineHeight })}
              />
            </OverflowMenuSettingsRow>

            <FontPresetSelectRow
              id={`${id}-font-features`}
              label='Features'
              options={CODE_FONT_FEATURE_OPTIONS}
              value={displayPrefs.codeFontFeatures.preset}
              onValueChange={(preset: CodeFontFeaturesPreset) => {
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
              }}
            />
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
          </OverflowMenuSettingsSection>

          <OverflowMenuSettingsSection
            id={`${id}-images-label`}
            label='Images'
            icon={<IconImage {...OVERFLOW_MENU_SECTION_ICON} />}
            isLast
          >
            <OverflowMenuSettingsRow label='Compare mode'>
              <SegmentedControl
                ariaLabel='Default image comparison mode'
                options={IMAGE_COMPARE_MODE_OPTIONS}
                value={displayPrefs.imageCompareMode}
                onChange={(imageCompareMode) => onChange({ imageCompareMode })}
              />
            </OverflowMenuSettingsRow>
            <OverflowMenuSettingsRow label='Checkerboard'>
              <SettingsSwitch
                label='Image transparency checkerboard'
                checked={displayPrefs.imageCheckerboard}
                onChange={(imageCheckerboard) => onChange({ imageCheckerboard })}
              />
            </OverflowMenuSettingsRow>
          </OverflowMenuSettingsSection>
        </>
      ) : (
        <OverflowMenuSettingsSection
          id={`${id}-appearance-label`}
          label='Appearance'
          icon={<IconThemes {...OVERFLOW_MENU_SECTION_ICON} />}
          isLast
        >
          <OverflowMenuSettingsRow label='Color mode'>
            <SegmentedControl
              ariaLabel='Color mode'
              options={MODE_OPTIONS}
              value={colorMode}
              onChange={(mode: ColorMode) => setColorMode(mode)}
              showLabels={false}
            />
          </OverflowMenuSettingsRow>

          <OverflowMenuPickerItem
            icon={<IconColorLight {...OVERFLOW_MENU_ICON} />}
            label='Light theme'
            value={lightThemeName}
            onClick={() => openNestedView('light')}
          />
          <OverflowMenuPickerItem
            icon={<IconColorDark {...OVERFLOW_MENU_ICON} />}
            label='Dark theme'
            value={darkThemeName}
            onClick={() => openNestedView('dark')}
          />
          {themesAreCustom ? (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className={cn(overflowMenuItemClassName, 'text-muted-foreground')}
              onClick={() => {
                setLightThemeName(diffyThemeCatalog.defaultLightThemeName);
                setDarkThemeName(diffyThemeCatalog.defaultDarkThemeName);
              }}
            >
              Reset to default themes
            </Button>
          ) : null}
        </OverflowMenuSettingsSection>
      )}
    </div>
  );

  if (embedded) {
    return mainContent;
  }

  return (
    <OverflowMenuPanel
      id={id}
      ariaLabel={panelLabel}
      className='p-0'
    >
      {onBack ? (
        <OverflowMenuBackHeader
          label={resolvedBackLabel}
          onClick={onBack}
        />
      ) : null}
      {mainContent}
    </OverflowMenuPanel>
  );
}

type FontPresetSelectRowProps<T extends string> = {
  id: string;
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onValueChange: (value: T) => void;
};

function FontPresetSelectRow<T extends string>({
  id,
  label,
  options,
  value,
  onValueChange,
}: FontPresetSelectRowProps<T>) {
  return (
    <OverflowMenuSettingsRow label={label}>
      <Select
        value={value}
        items={options}
        onValueChange={(next) => onValueChange(next as T)}
      >
        <SelectTrigger
          id={id}
          size='sm'
          className='w-38'
          aria-label={label}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align='end'>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </OverflowMenuSettingsRow>
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
    <div className='flex flex-col gap-1.5 px-2 py-1'>
      <Label
        htmlFor={id}
        className='text-xs text-muted-foreground'
      >
        {label}
      </Label>
      <Input
        id={id}
        type='text'
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete='off'
        autoCorrect='off'
        autoCapitalize='off'
        className='h-8 text-sm'
        onChange={(event) => onChange(event.target.value)}
        onBlur={onCommit}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

type CodeMetricInputProps = {
  id: string;
  ariaLabel: string;
  value: number;
  min: number;
  max: number;
  normalize: (value: unknown) => number;
  onChange: (value: number) => void;
};

function CodeMetricInput({
  id,
  ariaLabel,
  value,
  min,
  max,
  normalize,
  onChange,
}: CodeMetricInputProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const normalized = normalize(draft);
    setDraft(String(normalized));
    if (normalized !== value) {
      onChange(normalized);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    }
  };

  return (
    <div className='flex items-center gap-1.5'>
      <Input
        id={id}
        type='number'
        inputMode='numeric'
        min={min}
        max={max}
        value={draft}
        aria-label={ariaLabel}
        className='h-8 w-16 text-sm'
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
      <span className='text-xs text-muted-foreground'>px</span>
    </div>
  );
}
