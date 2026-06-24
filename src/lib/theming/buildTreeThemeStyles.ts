import type { ResolvedDiffTheme } from '@/lib/diff/themes/resolve';
import type { ThemeColorScheme } from '@/lib/theming/activeThemeSnapshot';
import { sanitizeTreeThemeStyles } from '@/lib/theming/sanitizeTreeThemeStyles';
import { treeThemeProps } from '@/lib/theming/treeThemeProps';

export function buildTreeThemeStylesFromResolved(
  resolved: ResolvedDiffTheme,
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
