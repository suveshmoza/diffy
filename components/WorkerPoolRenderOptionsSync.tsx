import { useWorkerPool } from '@pierre/diffs/react';
import { useEffect } from 'react';

type WorkerPoolRenderOptionsSyncProps = {
  theme: 'pierre-light' | 'pierre-dark';
  onSynced?: () => void;
};

export function WorkerPoolRenderOptionsSync({ theme, onSynced }: WorkerPoolRenderOptionsSyncProps) {
  const workerPool = useWorkerPool();

  useEffect(() => {
    void workerPool?.setRenderOptions({ theme }).finally(() => {
      onSynced?.();
    });
  }, [theme, workerPool, onSynced]);

  return null;
}
