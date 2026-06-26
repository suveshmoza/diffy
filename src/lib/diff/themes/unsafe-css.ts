import diffsBaseCSS from '@pierre/diffs/dist/style.js';
import type { ColorScheme } from '@pierre/theming';
import type { ThemeLike } from '@pierre/theming';
import { normalizeThemeColors } from '@pierre/theming/color';

const BASE_UNSAFE_CSS = diffsBaseCSS;

const REVIEW_ANNOTATION_OVERFLOW_CSS = `
[data-annotation-content] {
  align-self: stretch;
  box-sizing: border-box;
  max-width: 100%;
  min-width: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  width: 100%;
  word-break: break-word;
}
`;

function themeSurfaceColors(resolved: ThemeLike) {
  const colors = normalizeThemeColors(resolved).colors ?? resolved.colors ?? {};
  return {
    bg: colors['editor.background'] ?? resolved.bg ?? '#ffffff',
    fg: colors['editor.foreground'] ?? resolved.fg ?? '#000000',
  };
}

function themeHostOverride(colorScheme: ColorScheme, bg: string, fg: string) {
  return `
:host {
  box-sizing: border-box;
  color-scheme: ${colorScheme} !important;
  --diffs-bg: ${bg} !important;
  --diffs-fg: ${fg} !important;
  --diffs-light: ${fg} !important;
  --diffs-dark: ${fg} !important;
  --diffs-light-bg: ${bg} !important;
  --diffs-dark-bg: ${bg} !important;
  background-color: ${bg} !important;
  color: ${fg} !important;
}
`;
}

export function buildFallbackCodeViewUnsafeCss(colorScheme: ColorScheme): string {
  const bg = colorScheme === 'light' ? '#ffffff' : '#0d1117';
  const fg = colorScheme === 'light' ? '#1f2328' : '#e6edf3';

  return BASE_UNSAFE_CSS + REVIEW_ANNOTATION_OVERFLOW_CSS + themeHostOverride(colorScheme, bg, fg);
}

export function buildCodeViewUnsafeCss(resolved: ThemeLike, colorScheme: ColorScheme): string {
  const { bg, fg } = themeSurfaceColors(resolved);
  return BASE_UNSAFE_CSS + REVIEW_ANNOTATION_OVERFLOW_CSS + themeHostOverride(colorScheme, bg, fg);
}
