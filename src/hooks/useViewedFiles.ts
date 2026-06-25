import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getGitHubToken, type GitHubPullRequestRef } from '@/lib/github/api';
import {
  fetchViewedFiles,
  markFileAsViewed,
  unmarkFileAsViewed,
  type FileViewedState,
} from '@/lib/github/graphql';
import { computeViewedProgress, findNextUnviewedPath } from '@/lib/review/viewed-files';

export type UseViewedFilesResult = {
  viewedByPath: ReadonlyMap<string, FileViewedState>;
  isReady: boolean;
  hasToken: boolean;
  error: string | null;
  progress: { viewed: number; total: number };
  isViewed: (path: string) => boolean;
  toggleViewed: (path: string, next?: boolean) => void;
  nextUnviewedPath: (fromPath: string | null) => string | null;
};

/**
 * Loads + syncs per-file viewed state via GraphQL. Mutations are optimistic and
 * revert on failure. Loading is async and never blocks the diff render.
 */
export function useViewedFiles(
  ref: GitHubPullRequestRef,
  orderedPaths: readonly string[],
): UseViewedFilesResult {
  const [viewedByPath, setViewedByPath] = useState<ReadonlyMap<string, FileViewedState>>(new Map());
  const [isReady, setIsReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pullRequestIdRef = useRef<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    void (async () => {
      const token = await getGitHubToken();
      if (isCancelled) {
        return;
      }

      if (!token) {
        setHasToken(false);
        setIsReady(true);
        return;
      }

      setHasToken(true);

      try {
        const result = await fetchViewedFiles(ref);
        if (isCancelled) {
          return;
        }

        pullRequestIdRef.current = result.pullRequestId;
        setViewedByPath(new Map(result.files.map((file) => [file.path, file.viewerViewedState])));
      } catch (loadError: unknown) {
        if (!isCancelled) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      } finally {
        if (!isCancelled) {
          setIsReady(true);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [ref]);

  const isViewed = useCallback(
    (path: string) => viewedByPath.get(path) === 'VIEWED',
    [viewedByPath],
  );

  const toggleViewed = useCallback(
    (path: string, next?: boolean) => {
      const pullRequestId = pullRequestIdRef.current;
      if (!pullRequestId) {
        return;
      }

      const shouldView = next ?? viewedByPath.get(path) !== 'VIEWED';
      const previous = viewedByPath.get(path);

      setViewedByPath((current) => {
        const updated = new Map(current);
        updated.set(path, shouldView ? 'VIEWED' : 'UNVIEWED');
        return updated;
      });

      const mutation = shouldView
        ? markFileAsViewed(pullRequestId, path)
        : unmarkFileAsViewed(pullRequestId, path);

      mutation.catch((mutationError: unknown) => {
        setError(mutationError instanceof Error ? mutationError.message : String(mutationError));
        setViewedByPath((current) => {
          const reverted = new Map(current);
          if (previous === undefined) {
            reverted.delete(path);
          } else {
            reverted.set(path, previous);
          }
          return reverted;
        });
      });
    },
    [viewedByPath],
  );

  const progress = useMemo(
    () => computeViewedProgress(orderedPaths, viewedByPath),
    [orderedPaths, viewedByPath],
  );

  const nextUnviewedPath = useCallback(
    (fromPath: string | null) => findNextUnviewedPath(orderedPaths, viewedByPath, fromPath),
    [orderedPaths, viewedByPath],
  );

  return {
    viewedByPath,
    isReady,
    hasToken,
    error,
    progress,
    isViewed,
    toggleViewed,
    nextUnviewedPath,
  };
}
