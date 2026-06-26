import type { ThemeController } from '@pierre/theming';
import { type ReactNode, useMemo } from 'react';

import { controllerSource } from '@/lib/theming/ThemeSource';
import {
  ThemeControllerContext,
  ThemeResolverContext,
  ThemeSourceContext,
} from '@/providers/theming/useThemeSource';

type ThemeSourceProviderProps = {
  controller: ThemeController;
  children: ReactNode;
};

export function ThemeSourceProvider({ controller, children }: ThemeSourceProviderProps) {
  const source = useMemo(() => controllerSource(controller), [controller]);
  return (
    <ThemeControllerContext.Provider value={controller}>
      <ThemeResolverContext.Provider value={controller.resolver}>
        <ThemeSourceContext.Provider value={source}>{children}</ThemeSourceContext.Provider>
      </ThemeResolverContext.Provider>
    </ThemeControllerContext.Provider>
  );
}
