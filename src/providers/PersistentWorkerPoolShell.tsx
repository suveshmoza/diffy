import { DEFAULT_THEMES, setCustomExtension } from '@pierre/diffs';
import { WorkerPoolContextProvider } from '@pierre/diffs/react';
import { useMemo, type ReactNode } from 'react';

import { DIFF_LANG_IDS } from '@/lib/diff/lang-ids';
import { workerFactory } from '@/lib/diff/worker';
import { useThemeControllerReady } from '@/providers/theming/ThemeControllerProvider';

setCustomExtension('mts', 'typescript');
setCustomExtension('cts', 'typescript');

const DIFF_WORKER_POOL_SIZE = Math.max(
  1,
  Math.min(4, Math.floor((navigator.hardwareConcurrency || 4) / 2)),
);
const DIFF_WORKER_RENDER_CACHE_SIZE = 200;

type PersistentWorkerPoolShellProps = {
  children: ReactNode;
};

const WORKER_HIGHLIGHTER_OPTIONS = {
  theme: DEFAULT_THEMES,
  langs: [...DIFF_LANG_IDS],
};

export function PersistentWorkerPoolShell({ children }: PersistentWorkerPoolShellProps) {
  const { isReady: isThemeReady } = useThemeControllerReady();

  const poolOptions = useMemo(
    () => ({
      workerFactory,
      poolSize: DIFF_WORKER_POOL_SIZE,
      totalASTLRUCacheSize: DIFF_WORKER_RENDER_CACHE_SIZE,
    }),
    [],
  );

  if (!isThemeReady) {
    return children;
  }

  return (
    <WorkerPoolContextProvider
      poolOptions={poolOptions}
      highlighterOptions={WORKER_HIGHLIGHTER_OPTIONS}
    >
      {children}
    </WorkerPoolContextProvider>
  );
}
