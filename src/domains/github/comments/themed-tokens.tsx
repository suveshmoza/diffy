import type { DiffsThemeNames, ThemedToken, ThemeTypes } from '@pierre/diffs';
import type { CSSProperties, ReactNode } from 'react';

export function resolveDiffThemeName(
  theme: { dark: DiffsThemeNames; light: DiffsThemeNames },
  themeType: ThemeTypes,
): DiffsThemeNames {
  return themeType === 'dark' ? theme.dark : theme.light;
}

export function renderLineTokens(tokens: readonly ThemedToken[]): ReactNode {
  if (tokens.length === 0) {
    return ' ';
  }

  return tokens.map((token, index) => {
    const style = themedTokenStyle(token);
    if (style == null) {
      return <span key={index}>{token.content}</span>;
    }
    return (
      <span
        key={index}
        style={style}
      >
        {token.content}
      </span>
    );
  });
}

const FONT_STYLE_ITALIC = 1;
const FONT_STYLE_BOLD = 2;

function themedTokenStyle(token: ThemedToken): CSSProperties | undefined {
  if (token.htmlStyle != null) {
    return token.htmlStyle;
  }

  const style: CSSProperties = {};
  if (token.color != null) {
    style.color = token.color;
  }
  if (token.bgColor != null) {
    style.backgroundColor = token.bgColor;
  }
  if (token.fontStyle != null) {
    if ((token.fontStyle & FONT_STYLE_ITALIC) !== 0) {
      style.fontStyle = 'italic';
    }
    if ((token.fontStyle & FONT_STYLE_BOLD) !== 0) {
      style.fontWeight = 'bold';
    }
  }

  return Object.keys(style).length > 0 ? style : undefined;
}
