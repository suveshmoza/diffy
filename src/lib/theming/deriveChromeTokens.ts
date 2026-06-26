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
const DIFF_BORDER_MIX = 22;

const cache = new WeakMap<ThemeLike, ChromeTokens | undefined>();

function pickReadableMuted(
  bg: string | undefined,
  mutedCandidate: string | undefined,
): string | undefined {
  if (mutedCandidate == null || mutedCandidate === '') return undefined;
  const composited = colorUtils.compositeOverBg(mutedCandidate, bg) ?? mutedCandidate;
  const compositedL = colorUtils.relativeLuminance(composited);
  const bgL = colorUtils.relativeLuminance(bg);
  if (compositedL == null || bgL == null) {
    return mutedCandidate;
  }
  return colorUtils.contrastRatio(bgL, compositedL) >= MIN_MUTED_RATIO ? mutedCandidate : undefined;
}

export function deriveChromeTokens(theme: ThemeLike): ChromeTokens | undefined {
  const cached = cache.get(theme);
  if (cached !== undefined || cache.has(theme)) return cached;

  const rawColors = theme.colors ?? {};
  const resolved = normalizeThemeColors(theme).colors ?? {};

  const sidebarBg = resolved['sideBar.background'];
  const fg = colorUtils.pickReadableForeground(sidebarBg, [
    rawColors['sideBar.foreground'],
    rawColors['editor.foreground'],
    theme.fg,
  ]);
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

  const tokens = Object.freeze({
    additionFg: surfaceIsDark ? '#34d399' : '#047857',
    background: sidebarBg ?? `color-mix(in srgb, ${fg} 7%, ${cardBase})`,
    border: `color-mix(in srgb, ${fg} 20%, transparent)`,
    borderOpaque,
    deletionFg: surfaceIsDark ? '#fb7185' : '#be123c',
    fg,
    mutedFg: muted,
    ring: fg,
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
