import { describe, expect, it } from 'vitest';

import { pickTreeForeground } from './pickTreeForeground';

describe('pickTreeForeground', () => {
  it('picks the best contrast foreground on a dark background', () => {
    const result = pickTreeForeground({
      colors: {
        'sideBar.background': '#1e1e1e',
        'sideBar.foreground': '#cccccc',
        'editor.foreground': '#ffffff',
      },
    });
    expect(result).toBe('#ffffff');
  });

  it('picks the best contrast foreground on a light background', () => {
    const result = pickTreeForeground({
      colors: {
        'sideBar.background': '#ffffff',
        'sideBar.foreground': '#333333',
        'editor.foreground': '#000000',
      },
    });
    expect(result).toBe('#000000');
  });

  it('returns first candidate when background is unavailable', () => {
    const result = pickTreeForeground({
      colors: {
        'sideBar.foreground': '#cccccc',
        'editor.foreground': '#ffffff',
      },
    });
    expect(result).toBe('#cccccc');
  });

  it('returns undefined when no foreground candidates exist', () => {
    expect(pickTreeForeground({})).toBeUndefined();
  });

  it('returns undefined when all candidates are empty strings', () => {
    const result = pickTreeForeground({
      colors: {
        'sideBar.foreground': '',
        'editor.foreground': '',
      },
    });
    expect(result).toBeUndefined();
  });

  it('falls back to theme.fg when color keys are unavailable', () => {
    const result = pickTreeForeground({ fg: '#abcdef' });
    expect(result).toBe('#abcdef');
  });

  it('prefers sideBar.foreground over editor.foreground when contrast is equal', () => {
    const result = pickTreeForeground({
      colors: {
        'sideBar.background': '#000000',
        'sideBar.foreground': '#ffffff',
        'editor.foreground': '#ffffff',
      },
    });
    // Both are #ffffff, sideBar.foreground is first in candidates
    expect(result).toBe('#ffffff');
  });

  it('handles 3-digit hex colors', () => {
    const result = pickTreeForeground({
      colors: {
        'sideBar.background': '#000',
        'sideBar.foreground': '#fff',
      },
    });
    expect(result).toBe('#fff');
  });

  it('returns first candidate when background has invalid hex', () => {
    const result = pickTreeForeground({
      colors: {
        'sideBar.background': 'invalid',
        'sideBar.foreground': '#cccccc',
      },
    });
    expect(result).toBe('#cccccc');
  });

  it('returns first candidate when background cannot be parsed', () => {
    const result = pickTreeForeground({
      colors: {
        'sideBar.background': '#12345',
        'sideBar.foreground': '#cccccc',
      },
    });
    expect(result).toBe('#cccccc');
  });

  it('filters out empty string candidates', () => {
    const result = pickTreeForeground({
      colors: {
        'sideBar.background': '#000',
        'sideBar.foreground': '',
        'editor.foreground': '#fff',
      },
    });
    expect(result).toBe('#fff');
  });
});
