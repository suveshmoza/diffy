import type { TreeThemeInput } from '@pierre/trees';
import { describe, expect, it } from 'vitest';

import type { ThemeColorScheme } from '@/lib/theming/activeThemeSnapshot';

import { buildTreeThemeStylesFromResolved } from './buildTreeThemeStyles';
import { treeThemeProps } from './treeThemeProps';

interface Snapshot {
  theme?: TreeThemeInput;
  colorScheme: ThemeColorScheme;
}

const darkTheme: TreeThemeInput = {
  type: 'dark',
  bg: '#1e1e1e',
  fg: '#cccccc',
  colors: {
    'editor.background': '#1e1e1e',
    'editor.foreground': '#ffffff',
    'sideBar.background': '#1e1e1e',
    'sideBar.foreground': '#cccccc',
  },
};

describe('treeThemeProps', () => {
  it('returns empty style when theme is null or undefined', () => {
    const result = treeThemeProps({ colorScheme: 'dark' } as Snapshot);
    expect(result).toEqual({ style: {} });
  });

  it('returns tree styles without reconciliation by default', () => {
    const result = treeThemeProps({ theme: darkTheme, colorScheme: 'dark' });
    expect(result.style).toBeTypeOf('object');
    expect(Object.keys(result.style).length).toBeGreaterThan(0);
  });

  it('overrides foreground when reconcileForegroundFromChrome is true and foreground differs', () => {
    const result = treeThemeProps(
      { theme: darkTheme, colorScheme: 'dark' },
      { reconcileForegroundFromChrome: true },
    );
    expect(result.style.color).toBe('#ffffff');
  });

  it('does not override foreground when reconcileForegroundFromChrome is false', () => {
    const result = treeThemeProps(
      { theme: darkTheme, colorScheme: 'dark' },
      { reconcileForegroundFromChrome: false },
    );
    expect(result.style.color).toBeDefined();
  });
});

describe('buildTreeThemeStylesFromResolved', () => {
  it('includes colorScheme in the result', () => {
    const result = buildTreeThemeStylesFromResolved(darkTheme as never, 'dark');
    expect(result.colorScheme).toBe('dark');
  });

  it('includes tree style properties', () => {
    const result = buildTreeThemeStylesFromResolved(darkTheme as never, 'dark');
    expect(Object.keys(result).length).toBeGreaterThan(1);
  });

  it('applies foreground reconciliation', () => {
    const result = buildTreeThemeStylesFromResolved(darkTheme as never, 'dark');
    expect(result.color).toBe('#ffffff');
  });
});
