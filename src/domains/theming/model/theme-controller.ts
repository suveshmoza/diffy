import { createThemeController } from '@pierre/theming';

import { diffyThemeCatalog } from '@/domains/theming/model/theme-catalog';

export const themeController = createThemeController({
  catalog: diffyThemeCatalog,
  defaultMode: 'system',
});
