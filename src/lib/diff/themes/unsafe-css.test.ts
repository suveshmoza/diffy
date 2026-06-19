import { describe, expect, it } from 'vitest';

import { buildFallbackCodeViewUnsafeCss } from './unsafe-css';

describe('buildFallbackCodeViewUnsafeCss', () => {
  it('includes the review annotation overflow CSS', () => {
    const css = buildFallbackCodeViewUnsafeCss('github-dark');
    expect(css).toContain('[data-annotation-content]');
  });

  it('includes --diffs-bg and --diffs-fg custom properties', () => {
    const css = buildFallbackCodeViewUnsafeCss('github-dark');
    expect(css).toContain('--diffs-bg');
    expect(css).toContain('--diffs-fg');
  });

  it('uses light scheme and colors for a light theme', () => {
    const css = buildFallbackCodeViewUnsafeCss('github-light');
    expect(css).toContain('color-scheme: light');
    expect(css).toContain('#ffffff');
    expect(css).toContain('#1f2328');
  });

  it('uses dark scheme and colors for a dark theme', () => {
    const css = buildFallbackCodeViewUnsafeCss('github-dark');
    expect(css).toContain('color-scheme: dark');
    expect(css).toContain('#0d1117');
    expect(css).toContain('#e6edf3');
  });

  it('produces different output for light vs dark themes', () => {
    const light = buildFallbackCodeViewUnsafeCss('github-light');
    const dark = buildFallbackCodeViewUnsafeCss('github-dark');
    expect(light).not.toBe(dark);
  });

  it('recognises catppuccin-latte as a light theme', () => {
    const css = buildFallbackCodeViewUnsafeCss('catppuccin-latte');
    expect(css).toContain('color-scheme: light');
    expect(css).toContain('#ffffff');
  });

  it('recognises catppuccin-mocha as a dark theme', () => {
    const css = buildFallbackCodeViewUnsafeCss('catppuccin-mocha');
    expect(css).toContain('color-scheme: dark');
    expect(css).toContain('#0d1117');
  });
});
