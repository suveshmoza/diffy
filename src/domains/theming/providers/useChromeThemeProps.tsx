import { type CSSProperties, useMemo } from 'react';

import { chromeThemeProps } from '@/domains/theming/model/chrome-theme-props';
import type { ChromeMapping } from '@/domains/theming/model/diffy-chrome-mapping';
import { useThemeSource } from '@/domains/theming/providers/useThemeSource';

export function useChromeThemeProps(mapping: ChromeMapping): { style: CSSProperties } {
  const { activeTheme } = useThemeSource();
  return useMemo(() => chromeThemeProps(activeTheme, mapping), [activeTheme, mapping]);
}
