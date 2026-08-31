import type { ThemesType } from '@pierre/diffs';
import { useWorkerPool } from '@pierre/diffs/react';
import { useLayoutEffect } from 'react';

export function useWorkerDiffTheme(theme: ThemesType, disabled: boolean): void {
  const workerPool = useWorkerPool();
  useLayoutEffect(() => {
    if (disabled || workerPool == null) return;
    void workerPool.setRenderOptions({ theme });
  }, [disabled, theme, workerPool]);
}
