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

/** Emit the sole remaining legacy --gprv-* token used by CSS. */
export function applyLegacyGprvTokens(style: Record<string, string>, separator: string): void {
  style['--gprv-diff-separator'] = separator;
}
