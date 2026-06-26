import type { CSSProperties } from 'react';

import { deriveChromeTokens } from '@/lib/theming/deriveChromeTokens';
import type { ChromeMapping } from '@/lib/theming/diffyChromeMapping';
import type { ActiveThemeSnapshot } from '@/lib/theming/ThemeSource';

export type { ChromeMapping };

export function chromeThemeProps(
  active: ActiveThemeSnapshot,
  mapping: ChromeMapping,
): { style: CSSProperties } {
  const theme = active.theme;
  if (theme == null) return { style: {} };
  return { style: mapping(deriveChromeTokens(theme), theme) ?? {} };
}
