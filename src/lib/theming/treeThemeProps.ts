import { themeToTreeStyles, type TreeThemeInput, type TreeThemeStyles } from '@pierre/trees';

import type { ActiveThemeSnapshot } from '@/lib/theming/activeThemeSnapshot';
import { deriveChromeTokens } from '@/lib/theming/deriveChromeTokens';

export interface TreeThemePropsOptions {
  reconcileForegroundFromChrome?: boolean;
}

export function treeThemeProps<TTheme extends TreeThemeInput>(
  active: ActiveThemeSnapshot<TTheme>,
  options: TreeThemePropsOptions = {},
): { style: TreeThemeStyles } {
  const theme = active.theme;
  if (theme == null) return { style: {} };

  const treeStyles = themeToTreeStyles(theme);
  if (options.reconcileForegroundFromChrome === true) {
    const colors = theme.colors ?? {};
    const primaryFg = deriveChromeTokens(theme)?.fg;
    if (primaryFg != null && primaryFg !== colors['sideBar.foreground'] && primaryFg !== '') {
      treeStyles.color = primaryFg;
      treeStyles['--trees-theme-sidebar-fg'] = primaryFg;
      if (colors['sideBarSectionHeader.foreground'] == null) {
        treeStyles['--trees-theme-sidebar-header-fg'] = primaryFg;
      }
      if (colors['list.activeSelectionForeground'] == null) {
        treeStyles['--trees-theme-list-active-selection-fg'] = primaryFg;
      }
      if (
        colors['list.focusOutline'] == null &&
        colors['focusBorder'] == null &&
        colors['sideBar.foreground'] == null
      ) {
        treeStyles['--trees-theme-focus-ring'] = primaryFg;
      }
    }
  }

  return { style: treeStyles };
}
