import { setCustomExtension } from '@pierre/diffs';
import { WorkerPoolContextProvider } from '@pierre/diffs/react';
import { useMemo, type ReactNode } from 'react';

import { DIFF_LANG_IDS } from '@/lib/diff/lang-ids';
import { workerFactory } from '@/lib/diff/worker';
import { useThemeControllerReady } from '@/providers/theming/ThemeControllerProvider';
import { useDiffThemeProps } from '@/providers/theming/useDiffThemeProps';
import { useWorkerDiffTheme } from '@/providers/theming/useWorkerDiffTheme';

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

function WorkerPoolThemeSync() {
  const diffTheme = useDiffThemeProps();
  useWorkerDiffTheme(diffTheme.theme, false);
  return null;
}

export function PersistentWorkerPoolShell({ children }: PersistentWorkerPoolShellProps) {
  const { isReady: isThemeReady } = useThemeControllerReady();
  const diffTheme = useDiffThemeProps();

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
      theme: diffTheme.theme,
      langs: [...DIFF_LANG_IDS],
    }),
    [diffTheme.theme],
  );

  if (!isThemeReady) {
    return children;
  }

  return (
    <WorkerPoolContextProvider
      poolOptions={poolOptions}
      highlighterOptions={highlighterOptions}
    >
      <WorkerPoolThemeSync />
      {children}
    </WorkerPoolContextProvider>
  );
}
