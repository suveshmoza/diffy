import type { ThemeLike } from '@pierre/theming';
import { normalizeThemeColors } from '@pierre/theming/color';
import type { CSSProperties } from 'react';

import type { ChromeTokens } from '@/lib/theming/deriveChromeTokens';

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

  const fg = chrome.fg;
  const base = bg ?? 'transparent';
  const style: CSSProperties & Record<string, string> = {};
  if (bg != null) style.backgroundColor = bg;
  style.color = fg;
  style['--gprv-bg'] = chrome.background;
  style['--gprv-panel-bg'] = bg ?? chrome.background;
  style['--gprv-control-bg'] = chrome.surfaceHover;
  style['--gprv-control-active-bg'] = chrome.surfaceSelected;
  style['--gprv-border'] = chrome.borderOpaque;
  style['--gprv-text'] = fg;
  style['--gprv-muted'] = chrome.mutedFg;
  style['--gprv-state'] = chrome.mutedFg;
  style['--gprv-accent'] = fg;
  style['--gprv-accent-subtle'] = chrome.surfaceHover;
  style['--gprv-success'] = chrome.additionFg;
  style['--gprv-danger'] = chrome.deletionFg;
  style['--gprv-shadow'] = chrome.surfaceShadow;
  style['--gprv-header-control-bg'] = chrome.surface;
  style['--gprv-header-control-border'] = chrome.surfaceBorder;
  style['--gprv-header-control-hover-bg'] = chrome.surfaceHover;
  style['--gprv-header-control-active-bg'] = chrome.surfaceSelected;
  style['--gprv-popover-bg'] = chrome.surface;
  style['--gprv-popover-surface'] = chrome.surface;
  style['--gprv-popover-fg'] = fg;
  style['--gprv-popover-muted-fg'] = chrome.mutedFg;
  style['--gprv-popover-hover-bg'] = chrome.surfaceHover;
  style['--gprv-popover-selected-bg'] = chrome.surfaceSelected;
  style['--gprv-popover-border'] = chrome.surfaceBorder;
  style['--gprv-popover-shadow'] = chrome.surfaceShadow;
  style['--gprv-segmented-bg'] = chrome.surfaceHover;
  style['--gprv-segmented-active-bg'] = chrome.surfaceSelected;
  style['--gprv-card-bg'] = `color-mix(in srgb, ${fg} 6%, ${base})`;
  style['--gprv-card-hover-bg'] = `color-mix(in srgb, ${fg} 12%, ${base})`;
  style['--gprv-card-border'] = `color-mix(in srgb, ${fg} 12%, ${base})`;
  style['--gprv-annotation-bg'] = chrome.surface;
  style['--gprv-annotation-fg'] = fg;
  style['--gprv-annotation-border'] = chrome.surfaceBorder;
  style['--gprv-annotation-hover-border'] = `color-mix(in srgb, ${fg} 28%, ${base})`;
  style['--gprv-annotation-shadow'] = chrome.surfaceShadow;
  style['--gprv-diff-separator'] = chrome.separator;
  style['--color-foreground'] = fg;
  style['--foreground'] = fg;
  style['--color-muted-foreground'] = chrome.mutedFg;
  style['--muted-foreground'] = chrome.mutedFg;
  style['--color-border'] = chrome.border;
  style['--border'] = chrome.border;
  style['--color-border-opaque'] = chrome.borderOpaque;
  style['--border-opaque'] = chrome.borderOpaque;
  style['--color-popover'] = chrome.surface;
  style['--popover'] = chrome.surface;
  style['--color-popover-foreground'] = fg;
  style['--popover-foreground'] = fg;
  style['--color-card'] = chrome.surface;
  style['--card'] = chrome.surface;
  style['--color-card-foreground'] = fg;
  style['--card-foreground'] = fg;
  style['--color-background'] = chrome.background;
  style['--background'] = chrome.background;
  style['--color-accent'] = chrome.surfaceHover;
  style['--accent'] = chrome.surfaceHover;
  style['--color-accent-foreground'] = fg;
  style['--accent-foreground'] = fg;
  style['--color-secondary'] = chrome.surfaceHover;
  style['--secondary'] = chrome.surfaceHover;
  style['--color-secondary-foreground'] = fg;
  style['--secondary-foreground'] = fg;
  style['--color-input'] = chrome.surfaceHover;
  style['--input'] = chrome.surfaceHover;
  style['--color-muted'] = chrome.surfaceHover;
  style['--muted'] = chrome.surfaceHover;
  style['--color-primary'] = fg;
  style['--primary'] = fg;
  style['--color-primary-foreground'] = chrome.background;
  style['--primary-foreground'] = chrome.background;
  style['--color-ring'] = chrome.ring;
  style['--ring'] = chrome.ring;
  if (chrome.scrollbarThumb != null) {
    style['--gprv-scrollbar-thumb-bg'] = chrome.scrollbarThumb;
  }
  if (chrome.scrollbarTrack != null) {
    style['--gprv-scrollbar-track-bg'] = chrome.scrollbarTrack;
  }
  return style as CSSProperties;
};
