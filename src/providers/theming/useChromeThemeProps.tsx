import { type CSSProperties, useMemo } from 'react';

import { chromeThemeProps } from '@/lib/theming/chromeThemeProps';
import type { ChromeMapping } from '@/lib/theming/diffyChromeMapping';
import { useThemeSource } from '@/providers/theming/useThemeSource';

export function useChromeThemeProps(mapping: ChromeMapping): { style: CSSProperties } {
  const { activeTheme } = useThemeSource();
  return useMemo(() => chromeThemeProps(activeTheme, mapping), [activeTheme, mapping]);
}
