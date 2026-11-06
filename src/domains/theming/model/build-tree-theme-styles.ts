import type { ColorScheme, ThemeLike } from '@pierre/theming';

import { sanitizeTreeThemeStyles } from '@/domains/theming/model/sanitize-tree-theme-styles';
import { treeThemeProps } from '@/domains/theming/model/tree-theme-props';

export function buildTreeThemeStylesFromResolved(
  resolved: ThemeLike,
  colorScheme: ColorScheme,
): Record<string, string> {
  const { style } = treeThemeProps(
    { theme: resolved, colorScheme },
    { reconcileForegroundFromChrome: true },
  );

  return sanitizeTreeThemeStyles({
    ...style,
    colorScheme,
  });
}
