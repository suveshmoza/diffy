import type { CSSProperties } from 'react';

/** Subset of chrome vars scoped onto the CodeView host for inline annotations. */
export function buildAnnotationThemeStyle(
  themeChromeStyle: CSSProperties | undefined,
): CSSProperties | undefined {
  if (themeChromeStyle == null) {
    return undefined;
  }

  const source = themeChromeStyle as CSSProperties & Record<string, string | undefined>;
  const separator = source['--gprv-diff-separator'];
  if (typeof separator !== 'string') {
    return undefined;
  }

  return { '--gprv-diff-separator': separator } as CSSProperties;
}
