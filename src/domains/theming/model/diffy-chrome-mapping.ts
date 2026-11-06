import type { ThemeLike } from '@pierre/theming';
import { normalizeThemeColors } from '@pierre/theming/color';
import type { CSSProperties } from 'react';

import type { ChromeTokens } from '@/domains/theming/model/derive-chrome-tokens';
import {
  applyLegacyGprvTokens,
  applyShadcnSemanticTokens,
  mapShadcnSemanticTokens,
} from '@/domains/theming/model/map-shadcn-semantic-tokens';

export type ChromeMapping = (
  chrome: ChromeTokens | undefined,
  theme: ThemeLike,
) => CSSProperties | undefined;

export const diffyChromeMapping: ChromeMapping = (chrome, theme) => {
  const sidebarBg = normalizeThemeColors(theme).colors?.['sideBar.background'];
  const bg = typeof sidebarBg === 'string' && sidebarBg !== '' ? sidebarBg : undefined;

  if (chrome == null) {
    return bg != null ? ({ backgroundColor: bg } as CSSProperties) : undefined;
  }

  const shadcn = mapShadcnSemanticTokens(chrome);
  const style: CSSProperties & Record<string, string> = {};

  if (bg != null) {
    style.backgroundColor = bg;
  }
  style.color = chrome.fg;

  applyShadcnSemanticTokens(style, shadcn);
  applyLegacyGprvTokens(style, chrome.separator);

  return style as CSSProperties;
};
