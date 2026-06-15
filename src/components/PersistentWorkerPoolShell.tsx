import type { DiffsThemeNames } from '@pierre/diffs';
import { WorkerPoolContextProvider } from '@pierre/diffs/react';
import { useMemo, useState, type ReactNode } from 'react';

import { DIFF_LANG_IDS } from '@/lib/diff/lang-ids';
import { workerFactory } from '@/lib/diff/worker';
import { useDiffThemeContext } from '@/providers/DiffThemeProvider';
import { WorkerPoolSyncedThemeProvider } from '@/providers/WorkerPoolSyncedThemeContext';

import { WorkerPoolRenderOptionsSync } from './WorkerPoolRenderOptionsSync';

const DIFF_WORKER_POOL_SIZE = Math.max(
  1,
  Math.min(4, Math.floor((navigator.hardwareConcurrency || 4) / 2)),
);
const DIFF_WORKER_RENDER_CACHE_SIZE = 200;

type PersistentWorkerPoolShellProps = {
  children: ReactNode;
};

function WorkerPoolShellInner({
  theme,
  children,
}: {
  theme: DiffsThemeNames;
  children: ReactNode;
}) {
  const [syncedTheme, setSyncedTheme] = useState<DiffsThemeNames | null>(null);

  return (
    <WorkerPoolSyncedThemeProvider value={syncedTheme}>
      <WorkerPoolRenderOptionsSync
        theme={theme}
        onSynced={setSyncedTheme}
      />
      {children}
    </WorkerPoolSyncedThemeProvider>
  );
}

export function PersistentWorkerPoolShell({ children }: PersistentWorkerPoolShellProps) {
  const { theme } = useDiffThemeContext();

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

  return (
    <WorkerPoolContextProvider
      poolOptions={poolOptions}
      highlighterOptions={highlighterOptions}
    >
      <WorkerPoolShellInner theme={theme}>{children}</WorkerPoolShellInner>
    </WorkerPoolContextProvider>
  );
}
