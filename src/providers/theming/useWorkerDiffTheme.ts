import type { ThemesType } from '@pierre/diffs';
import { useWorkerPool } from '@pierre/diffs/react';
import { useLayoutEffect, useMemo } from 'react';

function themePairKey(theme: ThemesType): string {
  return typeof theme === 'string' ? theme : `${theme.light}\0${theme.dark}`;
}

export function useWorkerDiffTheme(theme: ThemesType, disabled: boolean): void {
  const workerPool = useWorkerPool();
  const themeKey = useMemo(() => themePairKey(theme), [theme]);
  useLayoutEffect(() => {
    if (disabled || workerPool == null) return;
    void workerPool.setRenderOptions({ theme });
  }, [disabled, theme, themeKey, workerPool]);
}
