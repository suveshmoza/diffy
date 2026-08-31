import type { ColorScheme, ThemeLike } from '@pierre/theming';

import { sanitizeTreeThemeStyles } from '@/lib/theming/sanitizeTreeThemeStyles';
import { treeThemeProps } from '@/lib/theming/treeThemeProps';

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
