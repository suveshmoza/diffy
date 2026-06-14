export type ThemeColorScheme = 'light' | 'dark';

export interface ActiveThemeSnapshot<TTheme = unknown> {
  theme?: TTheme;
  colorScheme: ThemeColorScheme;
}
