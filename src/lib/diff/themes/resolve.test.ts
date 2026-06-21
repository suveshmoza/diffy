import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@pierre/diffs', () => ({
  resolveTheme: vi.fn(),
}));

vi.mock('@/lib/diff/themes/unsafe-css', () => ({
  buildCodeViewUnsafeCss: vi.fn(),
  buildFallbackCodeViewUnsafeCss: vi.fn(),
}));

import { resolveTheme, ThemeRegistrationResolved } from '@pierre/diffs';

import {
  buildCodeViewUnsafeCss,
  buildFallbackCodeViewUnsafeCss,
} from '@/lib/diff/themes/unsafe-css';

type ResolveModule = typeof import('./resolve');

let mod: ResolveModule;

beforeEach(async () => {
  vi.resetModules();
  vi.mocked(resolveTheme).mockReset();
  vi.mocked(buildCodeViewUnsafeCss).mockReset();
  vi.mocked(buildFallbackCodeViewUnsafeCss).mockReset();
  mod = await import('./resolve');
});

describe('getResolvedDiffTheme', () => {
  it('calls resolveTheme and returns its result', async () => {
    const expected = { bg: '#fff', fg: '#000', colors: {} };
    vi.mocked(resolveTheme).mockResolvedValue(expected as ThemeRegistrationResolved);

    const result = await mod.getResolvedDiffTheme('github-light');

    expect(resolveTheme).toHaveBeenCalledWith('github-light');
    expect(result).toBe(expected);
  });

  it('caches result and returns same promise for same theme', async () => {
    vi.mocked(resolveTheme).mockResolvedValue({
      bg: '#fff',
      fg: '#000',
    } as ThemeRegistrationResolved);

    const p1 = mod.getResolvedDiffTheme('github-dark');
    const p2 = mod.getResolvedDiffTheme('github-dark');

    expect(vi.mocked(resolveTheme)).toHaveBeenCalledTimes(1);
    expect(p1).toBe(p2);

    await expect(p1).resolves.toEqual({ bg: '#fff', fg: '#000' });
  });

  it('calls resolveTheme separately for different themes', async () => {
    mod.getResolvedDiffTheme('github-light');
    mod.getResolvedDiffTheme('github-dark');

    expect(vi.mocked(resolveTheme)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(resolveTheme)).toHaveBeenCalledWith('github-light');
    expect(vi.mocked(resolveTheme)).toHaveBeenCalledWith('github-dark');
  });
});

describe('getCodeViewUnsafeCss', () => {
  it('calls buildCodeViewUnsafeCss and returns its result', async () => {
    vi.mocked(buildCodeViewUnsafeCss).mockResolvedValue(':host {}');

    const result = await mod.getCodeViewUnsafeCss('github-dark');

    expect(buildCodeViewUnsafeCss).toHaveBeenCalledWith('github-dark');
    expect(result).toBe(':host {}');
  });

  it('caches result for same theme', async () => {
    vi.mocked(buildCodeViewUnsafeCss).mockResolvedValue(':host {}');

    const p1 = mod.getCodeViewUnsafeCss('github-dark');
    const p2 = mod.getCodeViewUnsafeCss('github-dark');

    expect(buildCodeViewUnsafeCss).toHaveBeenCalledTimes(1);
    expect(p1).toBe(p2);
  });
});

describe('getFallbackCodeViewUnsafeCss', () => {
  it('delegates to buildFallbackCodeViewUnsafeCss', () => {
    vi.mocked(buildFallbackCodeViewUnsafeCss).mockReturnValue(':host { color: red; }');

    const result = mod.getFallbackCodeViewUnsafeCss('github-light');

    expect(buildFallbackCodeViewUnsafeCss).toHaveBeenCalledWith('github-light');
    expect(result).toBe(':host { color: red; }');
  });
});
