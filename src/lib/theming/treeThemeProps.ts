import { themeToTreeStyles, type TreeThemeInput, type TreeThemeStyles } from '@pierre/trees';

import type { ActiveThemeSnapshot } from '@/lib/theming/activeThemeSnapshot';
import { deriveChromeTokens } from '@/lib/theming/deriveChromeTokens';
import { mapShadcnSemanticTokens } from '@/lib/theming/mapShadcnSemanticTokens';
import { reconcileTreeThemeWithShadcn } from '@/lib/theming/reconcileTreeThemeWithShadcn';

export interface TreeThemePropsOptions {
  reconcileForegroundFromChrome?: boolean;
}

export function treeThemeProps<TTheme extends TreeThemeInput>(
  active: ActiveThemeSnapshot<TTheme>,
  options: TreeThemePropsOptions = {},
): { style: TreeThemeStyles } {
  const theme = active.theme;
  if (theme == null) return { style: {} };

  let treeStyles = themeToTreeStyles(theme);
  const chrome = deriveChromeTokens(theme);

  if (chrome != null) {
    treeStyles = reconcileTreeThemeWithShadcn(treeStyles, mapShadcnSemanticTokens(chrome));
  }

  if (options.reconcileForegroundFromChrome === true && chrome != null) {
    const colors = theme.colors ?? {};
    const primaryFg = chrome.fg;
    if (primaryFg !== colors['sideBar.foreground'] && primaryFg !== '') {
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
        treeStyles['--trees-theme-focus-ring'] = chrome.ring;
      }
    }
  }

  return { style: treeStyles };
}
