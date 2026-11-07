import { startTransition, useEffect, useMemo, useState } from 'react';

import {
  buildCodeViewItems,
  isLargePullRequestData,
  type CodeViewContent,
  type CodeViewItemsResult,
} from '@/domains/code-view/model/build-items';
import type { PullRequestDiffData } from '@/domains/github/api';
import { toErrorMessage } from '@/shared/errors';

type UseCodeViewItemsState = {
  result: CodeViewItemsResult | null;
  isBuilding: boolean;
  error: string | null;
};

function buildSyncState(content: CodeViewContent): UseCodeViewItemsState {
  try {
    return {
      result: buildCodeViewItems(content),
      isBuilding: false,
      error: null,
    };
  } catch (error: unknown) {
    return {
      result: null,
      isBuilding: false,
      error: toErrorMessage(error),
    };
  }
}

/**
 * Builds the code-view items from diff content only.
 *
 * Review comments deliberately stay out of the content identity: adding,
 * editing, or deleting a comment must not rebuild (or tear down) the viewer.
 * Comment annotations are mapped separately where they are rendered.
 */
export function useCodeViewItems(data: PullRequestDiffData): UseCodeViewItemsState {
  const content = useMemo<CodeViewContent>(
    () => ({
      ref: data.ref,
      pullRequest: data.pullRequest,
      files: data.files,
      patch: data.patch,
    }),
    [data.ref, data.pullRequest, data.files, data.patch],
  );

  const isLarge = isLargePullRequestData(content);
  const syncState = useMemo(() => (isLarge ? null : buildSyncState(content)), [content, isLarge]);

  const [largeState, setLargeState] = useState<UseCodeViewItemsState>(() => {
    if (!isLarge) {
      return syncState ?? buildSyncState(content);
    }

    return { result: null, isBuilding: true, error: null };
  });
  const [buildingForContent, setBuildingForContent] = useState(content);

  if (isLarge && buildingForContent !== content) {
    setBuildingForContent(content);
    // Keep the previous result visible while the next build runs so the viewer
    // never unmounts (which used to flash an empty pane).
    setLargeState((current) => ({ result: current.result, isBuilding: true, error: null }));
  }

  useEffect(() => {
    if (!isLarge) {
      return;
    }

    let isCancelled = false;

    const build = () => {
      if (isCancelled) {
        return;
      }

      startTransition(() => {
        if (isCancelled) {
          return;
        }

        setLargeState(buildSyncState(content));
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
  }, [content, isLarge]);

  if (!isLarge) {
    return syncState ?? buildSyncState(content);
  }

  return largeState;
}
