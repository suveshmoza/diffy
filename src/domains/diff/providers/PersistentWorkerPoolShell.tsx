import { setCustomExtension } from '@pierre/diffs';
import { WorkerPoolContextProvider } from '@pierre/diffs/react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { DIFF_HIGHLIGHTER } from '@/domains/diff/highlighting/highlighter';
import { DIFF_LANG_IDS } from '@/domains/diff/highlighting/lang-ids';
import { workerFactory } from '@/domains/diff/highlighting/worker';
import { ensureDiffThemesResolved } from '@/domains/diff/hooks/useDiffThemeReady';
import { useThemeControllerReady } from '@/domains/theming/providers/ThemeControllerProvider';
import { useDiffThemeProps } from '@/domains/theming/providers/useDiffThemeProps';

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

export function PersistentWorkerPoolShell({ children }: PersistentWorkerPoolShellProps) {
  const { isReady: isThemeReady } = useThemeControllerReady();
  const diffTheme = useDiffThemeProps();
  const [areThemesResolved, setAreThemesResolved] = useState(false);
  const hasResolvedForPoolRef = useRef(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!isThemeReady || hasResolvedForPoolRef.current) {
      return;
    }

    cancelledRef.current = false;

    void ensureDiffThemesResolved(diffTheme.theme)
      .catch(() => undefined)
      .finally(() => {
        if (!cancelledRef.current) {
          hasResolvedForPoolRef.current = true;
          setAreThemesResolved(true);
        }
      });

    return () => {
      cancelledRef.current = true;
    };
  }, [diffTheme.theme, isThemeReady]);

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
      preferredHighlighter: DIFF_HIGHLIGHTER,
    }),
    [diffTheme.theme],
  );

  if (!isThemeReady || !areThemesResolved) {
    return children;
  }

  return (
    <WorkerPoolContextProvider
      poolOptions={poolOptions}
      highlighterOptions={highlighterOptions}
    >
      {children}
    </WorkerPoolContextProvider>
  );
}
