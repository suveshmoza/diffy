import type { CSSProperties } from 'react';

const ANNOTATION_THEME_STYLE_KEYS = [
  '--gprv-annotation-bg',
  '--gprv-annotation-border',
  '--gprv-annotation-fg',
  '--gprv-annotation-hover-border',
  '--gprv-annotation-shadow',
  '--gprv-popover-muted-fg',
  '--gprv-diff-separator',
  '--gprv-scrollbar-thumb-bg',
  '--gprv-scrollbar-track-bg',
] as const;

/** Subset of chrome vars scoped onto the CodeView host for inline annotations. */
export function buildAnnotationThemeStyle(
  themeChromeStyle: CSSProperties | undefined,
): CSSProperties | undefined {
  if (themeChromeStyle == null) {
    return undefined;
  }

  const source = themeChromeStyle as CSSProperties &
    Partial<Record<(typeof ANNOTATION_THEME_STYLE_KEYS)[number], string>>;
  const style: Record<string, string> = {};
  for (const key of ANNOTATION_THEME_STYLE_KEYS) {
    const value = source[key];
    if (typeof value === 'string') {
      style[key] = value;
    }
  }

  return Object.keys(style).length > 0 ? (style as CSSProperties) : undefined;
}
