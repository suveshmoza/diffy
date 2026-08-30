import type { ThemeLike } from '@pierre/theming';
import { colorUtils, normalizeThemeColors } from '@pierre/theming/color';

export interface ChromeTokens {
  additionFg: string;
  background: string;
  border: string;
  borderOpaque: string;
  deletionFg: string;
  fg: string;
  mutedFg: string;
  primary: string;
  primaryForeground: string;
  ring: string;
  scrollbarThumb?: string;
  scrollbarTrack?: string;
  separator: string;
  surface: string;
  surfaceBorder: string;
  surfaceHover: string;
  surfaceSelected: string;
  surfaceShadow: string;
}

const MIN_MUTED_RATIO = 4.5;
const MIN_ACCENT_RATIO = 3;
const DIFF_BORDER_MIX = 22;
const DEFAULT_PRIMARY_DARK = '#2f81f7';
const DEFAULT_PRIMARY_LIGHT = '#0969da';

/** VS Code keys tried in order; focusBorder is last — often transparent or near-bg on Shiki themes. */
const ACCENT_COLOR_KEYS = [
  'textLink.foreground',
  'textLink.activeForeground',
  'activityBarBadge.background',
  'button.background',
  'charts.blue',
  'terminal.ansiBlue',
  'focusBorder',
  'list.focusOutline',
] as const;

const cache = new WeakMap<ThemeLike, ChromeTokens | undefined>();

function compositeOnBg(color: string | undefined, bg: string | undefined): string | undefined {
  if (color == null || color === '') return undefined;
  if (bg == null || bg === '') return color;
  return colorUtils.compositeOverBg(color, bg) ?? color;
}

function meetsContrastOnBg(color: string, bg: string | undefined, minRatio: number): boolean {
  if (bg == null) return true;
  const bgL = colorUtils.relativeLuminance(bg);
  const colorL = colorUtils.relativeLuminance(color);
  if (bgL == null || colorL == null) return false;
  return colorUtils.contrastRatio(bgL, colorL) >= minRatio;
}

function pickAccentColor(
  rawColors: Record<string, string | undefined>,
  bg: string | undefined,
  surfaceIsDark: boolean,
): string {
  for (const key of ACCENT_COLOR_KEYS) {
    const raw = rawColors[key];
    if (raw == null || raw === '' || colorUtils.isFullyTransparent(raw)) {
      continue;
    }
    const composited = compositeOnBg(raw, bg) ?? raw;
    if (meetsContrastOnBg(composited, bg, MIN_ACCENT_RATIO)) {
      return composited;
    }
  }
  return surfaceIsDark ? DEFAULT_PRIMARY_DARK : DEFAULT_PRIMARY_LIGHT;
}

function pickForegroundOnBg(
  bg: string | undefined,
  ...candidates: Array<string | undefined>
): string | undefined {
  const composited = candidates.map((candidate) => compositeOnBg(candidate, bg) ?? candidate);
  return colorUtils.pickReadableForeground(bg, composited);
}

function pickReadableMuted(
  bg: string | undefined,
  mutedCandidate: string | undefined,
): string | undefined {
  if (mutedCandidate == null || mutedCandidate === '') return undefined;
  const composited = compositeOnBg(mutedCandidate, bg) ?? mutedCandidate;
  if (!meetsContrastOnBg(composited, bg, MIN_MUTED_RATIO)) {
    return undefined;
  }
  return composited;
}

function pickPrimaryColors(
  rawColors: Record<string, string | undefined>,
  bg: string | undefined,
  surfaceIsDark: boolean,
): { primary: string; primaryForeground: string } {
  const primary = pickAccentColor(rawColors, bg, surfaceIsDark);

  const primaryForeground =
    colorUtils.pickReadableForeground(primary, ['#ffffff', '#f0f6fc', '#0d1117', '#010409']) ??
    '#ffffff';

  return { primary, primaryForeground };
}

export function deriveChromeTokens(theme: ThemeLike): ChromeTokens | undefined {
  const cached = cache.get(theme);
  if (cached !== undefined || cache.has(theme)) return cached;

  const rawColors = theme.colors ?? {};
  const resolved = normalizeThemeColors(theme).colors ?? {};

  const sidebarBg = resolved['sideBar.background'];
  const fg = pickForegroundOnBg(
    sidebarBg,
    rawColors['sideBar.foreground'],
    rawColors['editor.foreground'],
    theme.fg,
  );
  if (fg == null) {
    cache.set(theme, undefined);
    return undefined;
  }

  const editorBg = resolved['editor.background'] ?? sidebarBg;
  const editorFg = resolved['editor.foreground'] ?? fg;
  const cardBase = sidebarBg ?? 'transparent';
  const muted =
    pickReadableMuted(sidebarBg, rawColors['descriptionForeground']) ??
    colorUtils.deriveMutedFg(fg, sidebarBg);
  const borderOpaque = `color-mix(in srgb, ${fg} ${DIFF_BORDER_MIX}%, ${sidebarBg ?? 'transparent'})`;
  const surfaceIsDark = colorUtils.isDarkSurface(sidebarBg, fg);
  const separator =
    editorBg == null || colorUtils.surfacesMatch(editorBg, sidebarBg)
      ? borderOpaque
      : `color-mix(in srgb, ${editorFg} ${DIFF_BORDER_MIX}%, ${editorBg})`;

  const { primary, primaryForeground } = pickPrimaryColors(rawColors, sidebarBg, surfaceIsDark);
  const ring = primary;

  const tokens = Object.freeze({
    additionFg: surfaceIsDark ? '#34d399' : '#047857',
    background: sidebarBg ?? `color-mix(in srgb, ${fg} 7%, ${cardBase})`,
    border: `color-mix(in srgb, ${fg} 20%, transparent)`,
    borderOpaque,
    deletionFg: surfaceIsDark ? '#fb7185' : '#be123c',
    fg,
    mutedFg: muted,
    primary,
    primaryForeground,
    ring,
    scrollbarThumb:
      editorBg != null
        ? colorUtils.isDarkSurface(editorBg, editorFg)
          ? `color-mix(in lab, ${editorBg} 80%, white)`
          : `color-mix(in lab, ${editorBg} 85%, black)`
        : undefined,
    scrollbarTrack: editorBg ?? undefined,
    separator,
    surface: `color-mix(in srgb, ${fg} 7%, ${cardBase})`,
    surfaceBorder: `color-mix(in srgb, ${fg} 18%, ${cardBase})`,
    surfaceHover: `color-mix(in srgb, ${fg} 14%, ${cardBase})`,
    surfaceSelected: `color-mix(in srgb, ${fg} 20%, ${cardBase})`,
    surfaceShadow: '0 8px 16px rgb(0 0 0 / 0.07), 0 2px 4px rgb(0 0 0 / 0.05)',
  });
  cache.set(theme, tokens);
  return tokens;
}
