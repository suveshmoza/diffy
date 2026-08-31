import type { CSSProperties } from 'react';

const SHADCN_TO_ANNOTATION_KEYS = {
  '--popover': '--gprv-annotation-bg',
  '--border': '--gprv-annotation-border',
  '--foreground': '--gprv-annotation-fg',
  '--ring': '--gprv-annotation-hover-border',
  '--muted-foreground': '--gprv-popover-muted-fg',
  '--gprv-diff-separator': '--gprv-diff-separator',
  '--gprv-scrollbar-thumb-bg': '--gprv-scrollbar-thumb-bg',
  '--gprv-scrollbar-track-bg': '--gprv-scrollbar-track-bg',
} as const;

/** Subset of chrome vars scoped onto the CodeView host for inline annotations. */
export function buildAnnotationThemeStyle(
  themeChromeStyle: CSSProperties | undefined,
): CSSProperties | undefined {
  if (themeChromeStyle == null) {
    return undefined;
  }

  const source = themeChromeStyle as CSSProperties & Record<string, string | undefined>;
  const style: Record<string, string> = {};

  for (const [sourceKey, targetKey] of Object.entries(SHADCN_TO_ANNOTATION_KEYS)) {
    const value = source[sourceKey];
    if (typeof value === 'string') {
      style[targetKey] = value;
    }
  }

  if (source['--gprv-annotation-shadow'] != null) {
    style['--gprv-annotation-shadow'] = source['--gprv-annotation-shadow'];
  } else if (source['--gprv-shadow'] != null) {
    style['--gprv-annotation-shadow'] = source['--gprv-shadow'];
  }

  if (source['--gprv-diff-separator'] != null) {
    style['--gprv-diff-separator'] = source['--gprv-diff-separator'];
  }

  return Object.keys(style).length > 0 ? (style as CSSProperties) : undefined;
}
