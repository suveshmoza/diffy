import type { ThemeLike } from '@pierre/theming';
import { normalizeThemeColors } from '@pierre/theming/color';
import type { CSSProperties } from 'react';

import type { ChromeTokens } from '@/lib/theming/deriveChromeTokens';
import {
  applyLegacyGprvTokens,
  applyShadcnSemanticTokens,
  mapShadcnSemanticTokens,
} from '@/lib/theming/mapShadcnSemanticTokens';

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

  const base = bg ?? chrome.background;
  const shadcn = mapShadcnSemanticTokens(chrome);
  const style: CSSProperties & Record<string, string> = {};

  if (bg != null) {
    style.backgroundColor = bg;
  }
  style.color = chrome.fg;

  applyShadcnSemanticTokens(style, shadcn);
  applyLegacyGprvTokens(style, {
    ...shadcn,
    fg: chrome.fg,
    base,
    additionFg: chrome.additionFg,
    separator: chrome.separator,
    surfaceShadow: chrome.surfaceShadow,
    scrollbarThumb: chrome.scrollbarThumb,
    scrollbarTrack: chrome.scrollbarTrack,
  });

  return style as CSSProperties;
};
