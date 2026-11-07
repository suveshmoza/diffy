import { createThemeCatalog } from '@pierre/theming';
import { themes } from '@pierre/theming/themes';

import { DIFF_THEME_IDS } from '@/domains/theming/model/theme-ids';

export const diffyThemeCatalog = createThemeCatalog({
  themes: themes.pick([...DIFF_THEME_IDS]),
  defaultLightThemeName: 'pierre-light',
  defaultDarkThemeName: 'pierre-dark',
});
