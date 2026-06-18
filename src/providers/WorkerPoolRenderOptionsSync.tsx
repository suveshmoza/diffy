import type { DiffsThemeNames } from '@pierre/diffs';
import { useWorkerPool } from '@pierre/diffs/react';
import { useEffect } from 'react';

/**
 * The worker pool bakes in the theme it is created with and does not react to
 * later prop changes, so push live theme switches to it via `setRenderOptions`.
 * The initial theme is already correct (the pool is created with it), so there
 * is no flash to gate against.
 */
export function WorkerPoolRenderOptionsSync({ theme }: { theme: DiffsThemeNames }) {
  const workerPool = useWorkerPool();

  useEffect(() => {
    void workerPool?.setRenderOptions({ theme });
  }, [theme, workerPool]);

  return null;
}
