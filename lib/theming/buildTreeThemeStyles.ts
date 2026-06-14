import type { ResolvedDiffTheme } from '@/lib/resolve-diff-theme';
import type { ThemeColorScheme } from '@/lib/theming/activeThemeSnapshot';
import { treeThemeProps } from '@/lib/theming/treeThemeProps';

export function buildTreeThemeStylesFromResolved(
  resolved: ResolvedDiffTheme,
  colorScheme: ThemeColorScheme,
): Record<string, string> {
  const { style } = treeThemeProps(
    { theme: resolved, colorScheme },
    { reconcileForegroundFromChrome: true },
  );

  return {
    ...style,
    colorScheme,
  };
}
