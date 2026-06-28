import { createThemeController } from '@pierre/theming';

import '@/lib/theming/ensureDiffPierreThemes';
import { diffyThemeCatalog } from '@/lib/theming/themeCatalog';

export { diffyThemeCatalog } from '@/lib/theming/themeCatalog';

export const themeController = createThemeController({
  catalog: diffyThemeCatalog,
  defaultMode: 'system',
});

export const diffyThemeResolver = themeController.resolver;
