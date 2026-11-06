import type { ThemeController } from '@pierre/theming';
import { type ReactNode, useMemo } from 'react';

import { controllerSource } from '@/domains/theming/model/theme-source';
import {
  ThemeControllerContext,
  ThemeSourceContext,
} from '@/domains/theming/providers/useThemeSource';

type ThemeSourceProviderProps = {
  controller: ThemeController;
  children: ReactNode;
};

export function ThemeSourceProvider({ controller, children }: ThemeSourceProviderProps) {
  const source = useMemo(() => controllerSource(controller), [controller]);
  return (
    <ThemeControllerContext.Provider value={controller}>
      <ThemeSourceContext.Provider value={source}>{children}</ThemeSourceContext.Provider>
    </ThemeControllerContext.Provider>
  );
}
