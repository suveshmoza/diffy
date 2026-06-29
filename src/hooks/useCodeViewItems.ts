import { startTransition, useEffect, useMemo, useState } from 'react';

import {
  buildCodeViewItems,
  isLargePullRequestData,
  type CodeViewItemsResult,
} from '@/lib/code-view/build-items';
import type { PullRequestDiffData } from '@/lib/github/api';

type UseCodeViewItemsState = {
  result: CodeViewItemsResult | null;
  isBuilding: boolean;
  error: string | null;
};

function buildSyncState(data: PullRequestDiffData): UseCodeViewItemsState {
  try {
    return {
      result: buildCodeViewItems(data),
      isBuilding: false,
      error: null,
    };
  } catch (error: unknown) {
    return {
      result: null,
      isBuilding: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function useCodeViewItems(data: PullRequestDiffData): UseCodeViewItemsState {
  const isLarge = isLargePullRequestData(data);
  const syncState = useMemo(() => (isLarge ? null : buildSyncState(data)), [data, isLarge]);

  const [largeState, setLargeState] = useState<UseCodeViewItemsState>(() => {
    if (!isLarge) {
      return syncState ?? buildSyncState(data);
    }

    return { result: null, isBuilding: true, error: null };
  });

  useEffect(() => {
    if (!isLarge) {
      return;
    }

    let isCancelled = false;
    setLargeState({ result: null, isBuilding: true, error: null });

    const build = () => {
      if (isCancelled) {
        return;
      }

      startTransition(() => {
        if (isCancelled) {
          return;
        }

        setLargeState(buildSyncState(data));
      });
    };

    if (typeof requestIdleCallback === 'function') {
      const idleId = requestIdleCallback(build, { timeout: 120 });
      return () => {
        isCancelled = true;
        cancelIdleCallback(idleId);
      };
    }

    build();
    return () => {
      isCancelled = true;
    };
  }, [data, isLarge]);

  if (!isLarge) {
    return syncState ?? buildSyncState(data);
  }

  return largeState;
}
