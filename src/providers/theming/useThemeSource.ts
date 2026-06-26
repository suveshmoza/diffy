import type { ThemeController, ThemeResolver } from '@pierre/theming';
import { createContext, useContext, useRef, useSyncExternalStore } from 'react';

import type { ActiveThemeSnapshot, ThemeSource } from '@/lib/theming/ThemeSource';

export const ThemeSourceContext = createContext<ThemeSource | undefined>(undefined);

export const ThemeControllerContext = createContext<ThemeController | undefined>(undefined);

export const ThemeResolverContext = createContext<ThemeResolver | undefined>(undefined);

const EMPTY_SNAPSHOT: ActiveThemeSnapshot = {
  theme: undefined,
  colorScheme: 'light',
};

function snapshotsEqual(a: ActiveThemeSnapshot, b: ActiveThemeSnapshot): boolean {
  return a.theme === b.theme && a.colorScheme === b.colorScheme;
}

export function useThemeSource(override?: ThemeSource): {
  activeTheme: ActiveThemeSnapshot;
  source: ThemeSource | undefined;
} {
  const contextSource = useContext(ThemeSourceContext);
  const source = override ?? contextSource;
  const cacheRef = useRef<ActiveThemeSnapshot>(EMPTY_SNAPSHOT);
  const getSnapshot = () => {
    const next = source != null ? source.getSnapshot() : EMPTY_SNAPSHOT;
    if (!snapshotsEqual(cacheRef.current, next)) {
      cacheRef.current = next;
    }
    return cacheRef.current;
  };
  const activeTheme = useSyncExternalStore(
    (listener) => (source != null ? source.subscribe(listener) : () => {}),
    getSnapshot,
    () => EMPTY_SNAPSHOT,
  );
  return { activeTheme, source };
}

export function useThemeResolver(): ThemeResolver | undefined {
  return useContext(ThemeResolverContext);
}
