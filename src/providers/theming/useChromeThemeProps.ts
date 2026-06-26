import { createThemeResolver } from '@pierre/theming';
import { type CSSProperties, useMemo } from 'react';

import { chromeThemeProps } from '@/lib/theming/chromeThemeProps';
import type { ChromeMapping } from '@/lib/theming/diffyChromeMapping';
import { fixedSource, type ThemeInput } from '@/lib/theming/ThemeSource';
import { useThemeResolver, useThemeSource } from '@/providers/theming/useThemeSource';

export function useChromeThemeProps(
  mapping: ChromeMapping,
  theme?: ThemeInput,
): { style: CSSProperties } {
  const providerSource = useThemeSource();
  const contextResolver = useThemeResolver();
  const colorScheme = providerSource.activeTheme.colorScheme;
  const localResolver = useMemo(() => createThemeResolver(), []);
  const resolver = contextResolver ?? localResolver;
  const override = useMemo(() => {
    if (theme == null) return undefined;
    return fixedSource(theme, { resolver, colorScheme });
  }, [theme, resolver, colorScheme]);
  const { activeTheme } = useThemeSource(override);
  return useMemo(() => chromeThemeProps(activeTheme, mapping), [activeTheme, mapping]);
}
