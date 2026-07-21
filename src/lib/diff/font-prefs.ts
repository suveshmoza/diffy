export const CODE_FONT_PRESETS = [
  'system',
  'jetbrains-mono',
  'fira-code',
  'ibm-plex-mono',
  'custom',
] as const;

export const TREE_FONT_PRESETS = ['system-ui', 'open-sans', 'inter', 'custom'] as const;

export type CodeFontPreset = (typeof CODE_FONT_PRESETS)[number];
export type TreeFontPreset = (typeof TREE_FONT_PRESETS)[number];

export type FontPreference<TPreset extends string> = {
  preset: TPreset;
  custom?: string;
};

export type CodeFontPreference = FontPreference<CodeFontPreset>;
export type TreeFontPreference = FontPreference<TreeFontPreset>;

export const DEFAULT_CODE_FONT: CodeFontPreference = { preset: 'system' };
export const DEFAULT_TREE_FONT: TreeFontPreference = { preset: 'open-sans' };

export const CODE_FONT_SIZES = [12, 13, 14, 16] as const;
export type CodeFontSize = (typeof CODE_FONT_SIZES)[number];
export const DEFAULT_CODE_FONT_SIZE: CodeFontSize = 13;

export const CODE_LINE_HEIGHTS = [18, 20, 22, 24] as const;
export type CodeLineHeight = (typeof CODE_LINE_HEIGHTS)[number];
export const DEFAULT_CODE_LINE_HEIGHT: CodeLineHeight = 20;

export const CODE_FONT_FEATURE_PRESETS = ['normal', 'ligatures', 'custom'] as const;
export type CodeFontFeaturesPreset = (typeof CODE_FONT_FEATURE_PRESETS)[number];

export type CodeFontFeaturesPreference = {
  preset: CodeFontFeaturesPreset;
  custom?: string;
};

export const DEFAULT_CODE_FONT_FEATURES: CodeFontFeaturesPreference = { preset: 'normal' };

export const CODE_FONT_FEATURE_OPTIONS: readonly {
  value: CodeFontFeaturesPreset;
  label: string;
}[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'ligatures', label: 'Ligatures' },
  { value: 'custom', label: 'Custom' },
];

const LIGATURES_FONT_FEATURES = '"liga" 1, "calt" 1';

export const CODE_FONT_OPTIONS: readonly { value: CodeFontPreset; label: string }[] = [
  { value: 'system', label: 'System Mono' },
  { value: 'jetbrains-mono', label: 'JetBrains Mono' },
  { value: 'fira-code', label: 'Fira Code' },
  { value: 'ibm-plex-mono', label: 'IBM Plex Mono' },
  { value: 'custom', label: 'Custom' },
];

export const TREE_FONT_OPTIONS: readonly { value: TreeFontPreset; label: string }[] = [
  { value: 'system-ui', label: 'System UI' },
  { value: 'open-sans', label: 'Open Sans' },
  { value: 'inter', label: 'Inter' },
  { value: 'custom', label: 'Custom' },
];

/** Families loaded from Google Fonts (everything except system / custom). */
export const GOOGLE_FONTS_STYLESHEET_HREF = `https://fonts.googleapis.com/css2?${[
  'family=JetBrains+Mono:wght@400;500;600;700',
  'family=Fira+Code:wght@400;500;600;700',
  'family=IBM+Plex+Mono:wght@400;500;600;700',
  'family=Open+Sans:wght@400;500;600;700',
  'family=Inter:wght@400;500;600;700',
  'display=swap',
].join('&')}`;

const GOOGLE_FONTS_LINK_ID = 'gprv-google-fonts';

/** Ensure the Google Fonts stylesheet is present in the overlay document. */
export function ensureGoogleFontsLoaded(doc: Document = document): void {
  if (doc.getElementById(GOOGLE_FONTS_LINK_ID)) {
    return;
  }

  const link = doc.createElement('link');
  link.id = GOOGLE_FONTS_LINK_ID;
  link.rel = 'stylesheet';
  link.href = GOOGLE_FONTS_STYLESHEET_HREF;
  link.crossOrigin = 'anonymous';
  doc.head.append(link);
}

const CODE_FONT_STACKS: Record<Exclude<CodeFontPreset, 'system' | 'custom'>, string> = {
  'jetbrains-mono': "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  'fira-code': "'Fira Code', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  'ibm-plex-mono': "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
};

const TREE_FONT_STACKS: Record<Exclude<TreeFontPreset, 'custom'>, string> = {
  'system-ui': 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  'open-sans': "'Open Sans', system-ui, sans-serif",
  inter: "'Inter', system-ui, sans-serif",
};

/** Strip characters that could break out of a CSS font-family value. */
export function sanitizeFontFamilyName(value: string): string {
  return value
    .replace(/["';\\/\n\r\t{}<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 64);
}

/** Strip characters that could break out of a CSS font-feature-settings value. */
export function sanitizeFontFeatures(value: string): string {
  return value
    .replace(/[;{}<>\\/\n\r\t]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 96);
}

export function normalizeFontPreference<TPreset extends string>(
  value: unknown,
  presets: readonly TPreset[],
  fallback: FontPreference<TPreset>,
): FontPreference<TPreset> {
  if (typeof value !== 'object' || value === null) {
    return fallback;
  }

  const candidate = value as { preset?: unknown; custom?: unknown };
  const preset =
    typeof candidate.preset === 'string' &&
    (presets as readonly string[]).includes(candidate.preset)
      ? (candidate.preset as TPreset)
      : fallback.preset;

  const custom =
    typeof candidate.custom === 'string' ? sanitizeFontFamilyName(candidate.custom) : undefined;

  if (preset === ('custom' as TPreset)) {
    return custom ? { preset, custom } : { preset, custom: fallback.custom };
  }

  return { preset };
}

export function normalizeCodeFontSize(value: unknown): CodeFontSize {
  return typeof value === 'number' && (CODE_FONT_SIZES as readonly number[]).includes(value)
    ? (value as CodeFontSize)
    : DEFAULT_CODE_FONT_SIZE;
}

export function normalizeCodeLineHeight(value: unknown): CodeLineHeight {
  return typeof value === 'number' && (CODE_LINE_HEIGHTS as readonly number[]).includes(value)
    ? (value as CodeLineHeight)
    : DEFAULT_CODE_LINE_HEIGHT;
}

export function normalizeCodeFontFeatures(value: unknown): CodeFontFeaturesPreference {
  if (typeof value !== 'object' || value === null) {
    return DEFAULT_CODE_FONT_FEATURES;
  }

  const candidate = value as { preset?: unknown; custom?: unknown };
  const preset =
    typeof candidate.preset === 'string' &&
    (CODE_FONT_FEATURE_PRESETS as readonly string[]).includes(candidate.preset)
      ? (candidate.preset as CodeFontFeaturesPreset)
      : DEFAULT_CODE_FONT_FEATURES.preset;

  const custom =
    typeof candidate.custom === 'string' ? sanitizeFontFeatures(candidate.custom) : undefined;

  if (preset === 'custom') {
    return custom ? { preset, custom } : { preset, custom: DEFAULT_CODE_FONT_FEATURES.custom };
  }

  return { preset };
}

export function getCodeFontFeaturesLabel(features: CodeFontFeaturesPreference): string {
  if (features.preset === 'custom') {
    return features.custom?.trim() || 'Custom';
  }
  return (
    CODE_FONT_FEATURE_OPTIONS.find((option) => option.value === features.preset)?.label ?? 'Normal'
  );
}

export function resolveCodeFontFeatures(features: CodeFontFeaturesPreference): string | undefined {
  if (features.preset === 'normal') {
    return undefined;
  }
  if (features.preset === 'ligatures') {
    return LIGATURES_FONT_FEATURES;
  }
  const custom = sanitizeFontFeatures(features.custom ?? '');
  return custom || undefined;
}

export function getCodeFontLabel(font: CodeFontPreference): string {
  if (font.preset === 'custom') {
    return font.custom?.trim() || 'Custom';
  }
  return CODE_FONT_OPTIONS.find((option) => option.value === font.preset)?.label ?? 'System Mono';
}

export function getTreeFontLabel(font: TreeFontPreference): string {
  if (font.preset === 'custom') {
    return font.custom?.trim() || 'Custom';
  }
  return TREE_FONT_OPTIONS.find((option) => option.value === font.preset)?.label ?? 'Open Sans';
}

function quoteCustomFontFamily(
  name: string,
  generic: 'monospace' | 'sans-serif',
): string | undefined {
  const sanitized = sanitizeFontFamilyName(name);
  if (!sanitized) {
    return undefined;
  }
  const escaped = sanitized.replace(/'/g, '');
  if (!escaped) {
    return undefined;
  }
  return `'${escaped}', ${generic}`;
}

export function resolveCodeFontFamily(font: CodeFontPreference): string | undefined {
  if (font.preset === 'system') {
    return undefined;
  }
  if (font.preset === 'custom') {
    return quoteCustomFontFamily(font.custom ?? '', 'monospace');
  }
  return CODE_FONT_STACKS[font.preset];
}

export function resolveTreeFontFamily(font: TreeFontPreference): string {
  if (font.preset === 'custom') {
    return quoteCustomFontFamily(font.custom ?? '', 'sans-serif') ?? TREE_FONT_STACKS['open-sans'];
  }
  return TREE_FONT_STACKS[font.preset];
}

export type FontCssVariables = {
  '--diffs-font-family'?: string;
  '--diffs-font-size': string;
  '--diffs-line-height': string;
  '--diffs-font-features'?: string;
  '--diffs-header-font-family': string;
  '--trees-font-family-override': string;
};

export type ResolveFontCssVariablesInput = {
  codeFont: CodeFontPreference;
  treeFont: TreeFontPreference;
  codeFontSize: CodeFontSize;
  codeLineHeight: CodeLineHeight;
  codeFontFeatures: CodeFontFeaturesPreference;
};

/** CSS custom properties to merge onto the overlay modal. */
export function resolveFontCssVariables({
  codeFont,
  treeFont,
  codeFontSize,
  codeLineHeight,
  codeFontFeatures,
}: ResolveFontCssVariablesInput): FontCssVariables {
  const treeFamily = resolveTreeFontFamily(treeFont);
  const codeFamily = resolveCodeFontFamily(codeFont);
  const fontFeatures = resolveCodeFontFeatures(codeFontFeatures);

  const vars: FontCssVariables = {
    '--diffs-font-size': `${codeFontSize}px`,
    '--diffs-line-height': `${codeLineHeight}px`,
    '--diffs-header-font-family': treeFamily,
    '--trees-font-family-override': treeFamily,
  };

  if (codeFamily) {
    vars['--diffs-font-family'] = codeFamily;
  }

  if (fontFeatures) {
    vars['--diffs-font-features'] = fontFeatures;
  }

  return vars;
}
