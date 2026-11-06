import type { CSSProperties } from 'react';

import { deriveChromeTokens } from '@/domains/theming/model/derive-chrome-tokens';
import type { ChromeMapping } from '@/domains/theming/model/diffy-chrome-mapping';
import type { ActiveThemeSnapshot } from '@/domains/theming/model/theme-source';

export function chromeThemeProps(
  active: ActiveThemeSnapshot,
  mapping: ChromeMapping,
): { style: CSSProperties } {
  const theme = active.theme;
  if (theme == null) return { style: {} };
  return { style: mapping(deriveChromeTokens(theme), theme) ?? {} };
}
