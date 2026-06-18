import { WorkerPoolContextProvider } from '@pierre/diffs/react';
import { useMemo, type ReactNode } from 'react';

import { DIFF_LANG_IDS } from '@/lib/diff/lang-ids';
import { workerFactory } from '@/lib/diff/worker';
import { useDiffThemeContext } from '@/providers/DiffThemeProvider';

import { WorkerPoolRenderOptionsSync } from './WorkerPoolRenderOptionsSync';

const DIFF_WORKER_POOL_SIZE = Math.max(
  1,
  Math.min(4, Math.floor((navigator.hardwareConcurrency || 4) / 2)),
);
const DIFF_WORKER_RENDER_CACHE_SIZE = 200;

type PersistentWorkerPoolShellProps = {
  children: ReactNode;
};

export function PersistentWorkerPoolShell({ children }: PersistentWorkerPoolShellProps) {
  const { theme, isReady: isThemeReady } = useDiffThemeContext();

  const poolOptions = useMemo(
    () => ({
      workerFactory,
      poolSize: DIFF_WORKER_POOL_SIZE,
      totalASTLRUCacheSize: DIFF_WORKER_RENDER_CACHE_SIZE,
    }),
    [],
  );

  const highlighterOptions = useMemo(
    () => ({
      theme,
      langs: [...DIFF_LANG_IDS],
    }),
    [theme],
  );

  // Defer creating the singleton pool until the stored theme has hydrated so it
  // is born with the correct theme (avoids a dark-on-light flash at cold open).
  if (!isThemeReady) {
    return children;
  }

  return (
    <WorkerPoolContextProvider
      poolOptions={poolOptions}
      highlighterOptions={highlighterOptions}
    >
      <WorkerPoolRenderOptionsSync theme={theme} />
      {children}
    </WorkerPoolContextProvider>
  );
}
