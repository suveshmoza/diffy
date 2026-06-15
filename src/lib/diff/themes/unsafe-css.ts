import type { DiffsThemeNames } from '@pierre/diffs';
import { resolveTheme } from '@pierre/diffs';
import diffsBaseCSS from '@pierre/diffs/dist/style.js';

import { diffThemeType } from '@/lib/diff/themes/prefs';

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

function themeSurfaceColors(resolved: Awaited<ReturnType<typeof resolveTheme>>) {
  const colors = resolved.colors ?? {};
  return {
    bg: colors['editor.background'] ?? resolved.bg ?? '#ffffff',
    fg: colors['editor.foreground'] ?? resolved.fg ?? '#000000',
  };
}

/**
 * Pierre wraps `unsafeCSS` in `@layer unsafe`, which beats per-theme styles in
 * `@layer rendered`. Append explicit :host overrides so backgrounds follow the
 * user's picked theme instead of `color-scheme: system` / OS light-dark().
 */
function themeHostOverride(theme: DiffsThemeNames, bg: string, fg: string) {
  const scheme = diffThemeType(theme);
  // const border = `color-mix(in srgb, ${fg} 22%, ${bg})`;

  return `
:host {
  box-sizing: border-box;
  color-scheme: ${scheme} !important;
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

export function buildFallbackCodeViewUnsafeCss(theme: DiffsThemeNames): string {
  const scheme = diffThemeType(theme);
  const bg = scheme === 'light' ? '#ffffff' : '#0d1117';
  const fg = scheme === 'light' ? '#1f2328' : '#e6edf3';

  return BASE_UNSAFE_CSS + REVIEW_ANNOTATION_OVERFLOW_CSS + themeHostOverride(theme, bg, fg);
}

export async function buildCodeViewUnsafeCss(theme: DiffsThemeNames): Promise<string> {
  try {
    const resolved = await resolveTheme(theme);
    const { bg, fg } = themeSurfaceColors(resolved);

    return BASE_UNSAFE_CSS + REVIEW_ANNOTATION_OVERFLOW_CSS + themeHostOverride(theme, bg, fg);
  } catch {
    return buildFallbackCodeViewUnsafeCss(theme);
  }
}
