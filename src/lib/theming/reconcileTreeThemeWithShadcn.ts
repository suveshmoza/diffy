import type { ShadcnSemanticTokens } from '@/lib/theming/mapShadcnSemanticTokens';

type TreeThemeStyles = Record<string, string>;

const TREE_SHADCN_MAP: Array<{
  treeKey: keyof TreeThemeStyles;
  token: keyof ShadcnSemanticTokens;
}> = [
  { treeKey: '--trees-theme-sidebar-bg', token: 'sidebar' },
  { treeKey: '--trees-theme-sidebar-fg', token: 'sidebarForeground' },
  { treeKey: '--trees-theme-sidebar-border', token: 'sidebarBorder' },
  { treeKey: '--trees-theme-input-bg', token: 'secondary' },
  { treeKey: '--trees-theme-input-border', token: 'input' },
  { treeKey: '--trees-theme-focus-ring', token: 'sidebarRing' },
  { treeKey: '--trees-theme-list-active-selection-fg', token: 'sidebarPrimaryForeground' },
  { treeKey: '--trees-theme-git-added-fg', token: 'primary' },
];

function isMissingTreeValue(value: string | undefined): boolean {
  return value == null || value === '' || value.toLowerCase() === 'transparent';
}

/** Fill missing Pierre tree theme vars from shadcn sidebar semantic tokens. */
export function reconcileTreeThemeWithShadcn(
  treeStyles: TreeThemeStyles,
  shadcn: ShadcnSemanticTokens,
): TreeThemeStyles {
  const next = { ...treeStyles };

  for (const { treeKey, token } of TREE_SHADCN_MAP) {
    if (isMissingTreeValue(next[treeKey])) {
      next[treeKey] = shadcn[token];
    }
  }

  if (isMissingTreeValue(next['--trees-theme-sidebar-header-fg'])) {
    next['--trees-theme-sidebar-header-fg'] = shadcn.sidebarForeground;
  }

  return next;
}
