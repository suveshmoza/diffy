import { createThemeCatalog } from '@pierre/theming';
import { themes } from '@pierre/theming/themes';

export const diffyThemeCatalog = createThemeCatalog({
  themes,
  defaultLightThemeName: 'pierre-light',
  defaultDarkThemeName: 'pierre-dark',
});
