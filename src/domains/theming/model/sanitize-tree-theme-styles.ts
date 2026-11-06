type TreeThemeStyles = Record<string, string>;

const INPUT_BG_KEY = '--trees-theme-input-bg';
const SIDEBAR_BG_KEY = '--trees-theme-sidebar-bg';

function isFullyTransparentColor(color: string): boolean {
  const value = color.trim().toLowerCase();
  if (value === 'transparent') {
    return true;
  }

  const hex8 = /^#([0-9a-f]{6})([0-9a-f]{2})$/i.exec(value);
  if (hex8 && hex8[2] === '00') {
    return true;
  }

  const hex4 = /^#([0-9a-f]{3})([0-9a-f])$/i.exec(value);
  if (hex4 && hex4[2] === '0') {
    return true;
  }

  return /^rgba\(\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*0(?:\.0+)?\s*\)$/i.test(value);
}

function toOpaqueColor(color: string, fallback: string | undefined): string {
  const hex8 = /^#([0-9a-f]{6})00$/i.exec(color.trim());
  if (hex8) {
    return `#${hex8[1]}`;
  }

  if (fallback != null && fallback !== '' && !isFullyTransparentColor(fallback)) {
    return fallback;
  }

  return color;
}

/**
 * Pierre themes such as everforest expose input surfaces as `#RRGGBB00`. CSS still
 * resolves the variable, so `var(--trees-theme-input-bg, fallback)` never kicks in.
 */
export function sanitizeTreeThemeStyles(styles: TreeThemeStyles): TreeThemeStyles {
  const inputBg = styles[INPUT_BG_KEY];
  if (inputBg == null || !isFullyTransparentColor(inputBg)) {
    return styles;
  }

  return {
    ...styles,
    [INPUT_BG_KEY]: toOpaqueColor(inputBg, styles[SIDEBAR_BG_KEY]),
  };
}
