import type { DiffsThemeNames } from '@pierre/diffs';
import { IconPaint } from '@tabler/icons-react';

import { DIFF_THEMES } from '@/lib/diff/themes/prefs';
import { useDiffThemeContext } from '@/providers/DiffThemeProvider';

import { HeaderPopoverListbox, type HeaderPopoverOption } from './HeaderPopoverListbox';

const THEME_OPTIONS: readonly HeaderPopoverOption<DiffsThemeNames>[] = DIFF_THEMES.map((id) => ({
  value: id,
  label: id,
}));

export function ThemePicker() {
  const { theme, setTheme } = useDiffThemeContext();

  return (
    <HeaderPopoverListbox
      icon={
        <IconPaint
          size={20}
          stroke={2}
        />
      }
      label={`Theme: ${theme}`}
      menuLabel='Theme'
      options={THEME_OPTIONS}
      value={theme}
      onSelect={(next) => {
        void setTheme(next);
      }}
    />
  );
}
