import type { DiffsThemeNames } from '@pierre/diffs';
import { useWorkerPool } from '@pierre/diffs/react';
import { useEffect, useRef } from 'react';

type WorkerPoolRenderOptionsSyncProps = {
  theme: DiffsThemeNames;
  onSynced?: (theme: DiffsThemeNames) => void;
};

export function WorkerPoolRenderOptionsSync({ theme, onSynced }: WorkerPoolRenderOptionsSyncProps) {
  const workerPool = useWorkerPool();
  const onSyncedRef = useRef(onSynced);
  onSyncedRef.current = onSynced;

  useEffect(() => {
    if (!workerPool) {
      return;
    }

    let isCancelled = false;

    void workerPool.setRenderOptions({ theme }).then(() => {
      if (!isCancelled) {
        onSyncedRef.current?.(theme);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [theme, workerPool]);

  return null;
}
