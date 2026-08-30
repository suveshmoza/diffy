import type { ChromeTokens } from '@/lib/theming/deriveChromeTokens';

export type ShadcnSemanticTokens = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
  sidebar: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
};

export function mapShadcnSemanticTokens(chrome: ChromeTokens): ShadcnSemanticTokens {
  return {
    background: chrome.background,
    foreground: chrome.fg,
    card: chrome.surface,
    cardForeground: chrome.fg,
    popover: chrome.surface,
    popoverForeground: chrome.fg,
    primary: chrome.primary,
    primaryForeground: chrome.primaryForeground,
    secondary: chrome.surfaceHover,
    secondaryForeground: chrome.fg,
    muted: chrome.surfaceHover,
    mutedForeground: chrome.mutedFg,
    accent: chrome.surfaceSelected,
    accentForeground: chrome.fg,
    destructive: chrome.deletionFg,
    border: chrome.borderOpaque,
    input: chrome.surfaceBorder,
    ring: chrome.ring,
    sidebar: chrome.background,
    sidebarForeground: chrome.fg,
    sidebarPrimary: chrome.primary,
    sidebarPrimaryForeground: chrome.primaryForeground,
    sidebarAccent: chrome.surfaceHover,
    sidebarAccentForeground: chrome.fg,
    sidebarBorder: chrome.borderOpaque,
    sidebarRing: chrome.ring,
  };
}

function setToken(style: Record<string, string>, name: string, value: string): void {
  style[`--${name}`] = value;
  style[`--color-${name}`] = value;
}

/** Apply shadcn semantic tokens as CSS custom properties on a style object. */
export function applyShadcnSemanticTokens(
  style: Record<string, string>,
  tokens: ShadcnSemanticTokens,
): void {
  setToken(style, 'background', tokens.background);
  setToken(style, 'foreground', tokens.foreground);
  setToken(style, 'card', tokens.card);
  setToken(style, 'card-foreground', tokens.cardForeground);
  setToken(style, 'popover', tokens.popover);
  setToken(style, 'popover-foreground', tokens.popoverForeground);
  setToken(style, 'primary', tokens.primary);
  setToken(style, 'primary-foreground', tokens.primaryForeground);
  setToken(style, 'secondary', tokens.secondary);
  setToken(style, 'secondary-foreground', tokens.secondaryForeground);
  setToken(style, 'muted', tokens.muted);
  setToken(style, 'muted-foreground', tokens.mutedForeground);
  setToken(style, 'accent', tokens.accent);
  setToken(style, 'accent-foreground', tokens.accentForeground);
  setToken(style, 'destructive', tokens.destructive);
  setToken(style, 'border', tokens.border);
  setToken(style, 'input', tokens.input);
  setToken(style, 'ring', tokens.ring);
  setToken(style, 'sidebar', tokens.sidebar);
  setToken(style, 'sidebar-foreground', tokens.sidebarForeground);
  setToken(style, 'sidebar-primary', tokens.sidebarPrimary);
  setToken(style, 'sidebar-primary-foreground', tokens.sidebarPrimaryForeground);
  setToken(style, 'sidebar-accent', tokens.sidebarAccent);
  setToken(style, 'sidebar-accent-foreground', tokens.sidebarAccentForeground);
  setToken(style, 'sidebar-border', tokens.sidebarBorder);
  setToken(style, 'sidebar-ring', tokens.sidebarRing);
}

export type LegacyGprvTokensInput = ShadcnSemanticTokens & {
  additionFg: string;
  base: string;
  fg: string;
  separator: string;
  surfaceShadow: string;
  scrollbarThumb?: string;
  scrollbarTrack?: string;
};

/** Derive legacy --gprv-* aliases from shadcn semantic tokens for unmigrated CSS. */
export function applyLegacyGprvTokens(
  style: Record<string, string>,
  input: LegacyGprvTokensInput,
): void {
  const { fg, base, additionFg, separator, surfaceShadow, scrollbarThumb, scrollbarTrack } = input;

  style['--gprv-bg'] = input.background;
  style['--gprv-panel-bg'] = input.background;
  style['--gprv-control-bg'] = input.secondary;
  style['--gprv-control-active-bg'] = input.accent;
  style['--gprv-border'] = input.border;
  style['--gprv-text'] = input.foreground;
  style['--gprv-muted'] = input.mutedForeground;
  style['--gprv-state'] = input.mutedForeground;
  style['--gprv-accent'] = input.primary;
  style['--gprv-accent-subtle'] = `color-mix(in srgb, ${input.primary} 16%, transparent)`;
  style['--gprv-success'] = additionFg;
  style['--gprv-danger'] = input.destructive;
  style['--gprv-error'] = input.destructive;
  style['--gprv-shadow'] = surfaceShadow;
  style['--gprv-header-control-bg'] = input.card;
  style['--gprv-header-control-border'] = input.input;
  style['--gprv-header-control-hover-bg'] = input.secondary;
  style['--gprv-header-control-active-bg'] = input.accent;
  style['--gprv-popover-bg'] = input.popover;
  style['--gprv-popover-surface'] = input.popover;
  style['--gprv-popover-fg'] = input.popoverForeground;
  style['--gprv-popover-muted-fg'] = input.mutedForeground;
  style['--gprv-popover-hover-bg'] = input.secondary;
  style['--gprv-popover-selected-bg'] = input.accent;
  style['--gprv-popover-border'] = input.border;
  style['--gprv-popover-shadow'] = surfaceShadow;
  style['--gprv-segmented-bg'] = input.secondary;
  style['--gprv-segmented-active-bg'] = input.accent;
  style['--gprv-card-bg'] = input.card;
  style['--gprv-card-hover-bg'] = input.secondary;
  style['--gprv-card-border'] = input.border;
  style['--gprv-annotation-bg'] = input.popover;
  style['--gprv-annotation-fg'] = input.foreground;
  style['--gprv-annotation-border'] = input.border;
  style['--gprv-annotation-hover-border'] = `color-mix(in srgb, ${fg} 28%, ${base})`;
  style['--gprv-annotation-shadow'] = surfaceShadow;
  style['--gprv-diff-separator'] = separator;
  style['--color-border-opaque'] = input.border;
  style['--border-opaque'] = input.border;

  if (scrollbarThumb != null) {
    style['--gprv-scrollbar-thumb-bg'] = scrollbarThumb;
  }
  if (scrollbarTrack != null) {
    style['--gprv-scrollbar-track-bg'] = scrollbarTrack;
  }
}
