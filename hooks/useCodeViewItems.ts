import { startTransition, useEffect, useState } from 'react';

import {
  buildCodeViewItems,
  isLargePullRequestData,
  type CodeViewItemsResult,
} from '@/lib/build-code-view-items';
import type { PullRequestDiffData } from '@/lib/github';

type UseCodeViewItemsState = {
  result: CodeViewItemsResult | null;
  isBuilding: boolean;
};

export function useCodeViewItems(data: PullRequestDiffData): UseCodeViewItemsState {
  const [state, setState] = useState<UseCodeViewItemsState>(() => {
    if (isLargePullRequestData(data)) {
      return { result: null, isBuilding: true };
    }

    return {
      result: buildCodeViewItems(data),
      isBuilding: false,
    };
  });

  useEffect(() => {
    if (!isLargePullRequestData(data)) {
      startTransition(() => {
        setState({
          result: buildCodeViewItems(data),
          isBuilding: false,
        });
      });
      return;
    }

    let isCancelled = false;
    setState({ result: null, isBuilding: true });

    const build = () => {
      if (isCancelled) {
        return;
      }

      startTransition(() => {
        if (isCancelled) {
          return;
        }

        setState({
          result: buildCodeViewItems(data),
          isBuilding: false,
        });
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
