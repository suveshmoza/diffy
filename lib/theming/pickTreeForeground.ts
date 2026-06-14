type ThemeColorSource = {
  colors?: Record<string, string | undefined>;
  fg?: string;
};

function parseHexChannels(color: string): [number, number, number] | null {
  const hex = color.trim();
  if (!hex.startsWith('#')) {
    return null;
  }

  const raw = hex.slice(1);
  if (raw.length === 3) {
    return [
      Number.parseInt(raw[0]! + raw[0], 16),
      Number.parseInt(raw[1]! + raw[1], 16),
      Number.parseInt(raw[2]! + raw[2], 16),
    ];
  }

  if (raw.length === 6) {
    return [
      Number.parseInt(raw.slice(0, 2), 16),
      Number.parseInt(raw.slice(2, 4), 16),
      Number.parseInt(raw.slice(4, 6), 16),
    ];
  }

  return null;
}

function channelToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminanceFromCss(color: string): number | null {
  const channels = parseHexChannels(color);
  if (channels == null) {
    return null;
  }

  const [r, g, b] = channels;
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Contrast-based foreground pick for tree row reconcile (overlay-only, no @pierre/theming). */
export function pickTreeForeground(theme: ThemeColorSource): string | undefined {
  const colors = theme.colors ?? {};
  const background = colors['sideBar.background'];
  const candidates = [colors['sideBar.foreground'], colors['editor.foreground'], theme.fg].filter(
    (value): value is string => typeof value === 'string' && value !== '',
  );

  if (candidates.length === 0) {
    return undefined;
  }

  if (background == null) {
    return candidates[0];
  }

  const backgroundLuminance = relativeLuminanceFromCss(background);
  if (backgroundLuminance == null) {
    return candidates[0];
  }

  let best = candidates[0]!;
  let bestRatio = 0;

  for (const candidate of candidates) {
    const candidateLuminance = relativeLuminanceFromCss(candidate);
    if (candidateLuminance == null) {
      continue;
    }

    const ratio = contrastRatio(backgroundLuminance, candidateLuminance);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = candidate;
    }
  }

  return best;
}
