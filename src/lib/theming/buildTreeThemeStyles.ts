import type { ThemeLike } from '@pierre/theming';

import type { ThemeColorScheme } from '@/lib/theming/activeThemeSnapshot';
import { sanitizeTreeThemeStyles } from '@/lib/theming/sanitizeTreeThemeStyles';
import { treeThemeProps } from '@/lib/theming/treeThemeProps';

export function buildTreeThemeStylesFromResolved(
  resolved: ThemeLike,
  colorScheme: ThemeColorScheme,
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
