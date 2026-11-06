import { hasResolvedThemes, resolveThemes, type ThemesType } from '@pierre/diffs';
import { useWorkerPool } from '@pierre/diffs/react';
import { useEffect, useRef, useState } from 'react';

import { useDiffThemeProps } from '@/domains/theming/providers/useDiffThemeProps';
import { DIFF_HIGHLIGHTER } from '@/lib/diff/highlighter';

export function diffThemeNames(theme: ThemesType): string[] {
  if (typeof theme === 'string') {
    return [theme];
  }
  return [theme.light, theme.dark];
}

export async function ensureDiffThemesResolved(theme: ThemesType): Promise<void> {
  const names = diffThemeNames(theme);
  if (!hasResolvedThemes(names, DIFF_HIGHLIGHTER)) {
    await resolveThemes(names, DIFF_HIGHLIGHTER);
  }
}

type WorkerPoolLike = {
  setRenderOptions: (options: { theme: ThemesType }) => Promise<void>;
};

export async function ensureWorkerDiffTheme(
  theme: ThemesType,
  workerPool: WorkerPoolLike | null | undefined,
): Promise<void> {
  await ensureDiffThemesResolved(theme);
  if (workerPool != null) {
    await workerPool.setRenderOptions({ theme });
  }
}

export function useDiffThemeReady(): boolean {
  const diffTheme = useDiffThemeProps();
  const workerPool = useWorkerPool();
  const [isReady, setIsReady] = useState(false);
  const hasPreparedRef = useRef(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (hasPreparedRef.current) {
      return;
    }

    cancelledRef.current = false;

    void ensureWorkerDiffTheme(diffTheme.theme, workerPool)
      .catch(() => undefined)
      .finally(() => {
        if (!cancelledRef.current && workerPool != null) {
          hasPreparedRef.current = true;
          setIsReady(true);
        }
      });

    return () => {
      cancelledRef.current = true;
    };
  }, [diffTheme.theme, workerPool]);

  return isReady;
}
