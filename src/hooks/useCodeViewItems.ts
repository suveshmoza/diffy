import { startTransition, useEffect, useState } from 'react';

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

export function useCodeViewItems(data: PullRequestDiffData): UseCodeViewItemsState {
  const [state, setState] = useState<UseCodeViewItemsState>(() => {
    if (isLargePullRequestData(data)) {
      return { result: null, isBuilding: true, error: null };
    }

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
  });

  useEffect(() => {
    if (!isLargePullRequestData(data)) {
      startTransition(() => {
        try {
          setState({
            result: buildCodeViewItems(data),
            isBuilding: false,
            error: null,
          });
        } catch (error: unknown) {
          setState({
            result: null,
            isBuilding: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });
      return;
    }

    let isCancelled = false;
    setState({ result: null, isBuilding: true, error: null });

    const build = () => {
      if (isCancelled) {
        return;
      }

      startTransition(() => {
        if (isCancelled) {
          return;
        }

        try {
          setState({
            result: buildCodeViewItems(data),
            isBuilding: false,
            error: null,
          });
        } catch (error: unknown) {
          setState({
            result: null,
            isBuilding: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
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
  }, [data]);

  return state;
}
