import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import type { GitHubPullRequestRef } from '@/lib/github/api';
import { markFileAsViewed, unmarkFileAsViewed, type FileViewedState } from '@/lib/github/graphql';
import { viewedFilesQueryOptions, type ViewedFilesQueryData } from '@/lib/query/viewed-files';
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

type ToggleViewedVariables = {
  path: string;
  shouldView: boolean;
  pullRequestId: string;
};

function toViewedMap(data: ViewedFilesQueryData | undefined): ReadonlyMap<string, FileViewedState> {
  if (data == null || !data.hasToken) {
    return new Map();
  }

  return new Map(Object.entries(data.viewedByPath));
}

/**
 * Loads + syncs per-file viewed state via GraphQL. Mutations are optimistic and
 * revert on failure. Loading is async and never blocks the diff render.
 */
export function useViewedFiles(
  ref: GitHubPullRequestRef,
  orderedPaths: readonly string[],
): UseViewedFilesResult {
  const queryClient = useQueryClient();
  const queryKey = viewedFilesQueryOptions(ref).queryKey;

  const { data, isPending, error } = useQuery(viewedFilesQueryOptions(ref));

  const toggleMutation = useMutation({
    mutationFn: async ({ path, shouldView, pullRequestId }: ToggleViewedVariables) => {
      if (shouldView) {
        await markFileAsViewed(pullRequestId, path);
      } else {
        await unmarkFileAsViewed(pullRequestId, path);
      }
    },
    onMutate: async ({ path, shouldView }) => {
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<ViewedFilesQueryData>(queryKey);
      if (previous == null || !previous.hasToken) {
        return { previous };
      }

      const nextState: FileViewedState = shouldView ? 'VIEWED' : 'UNVIEWED';
      const optimistic: Extract<ViewedFilesQueryData, { hasToken: true }> = {
        hasToken: true,
        pullRequestId: previous.pullRequestId,
        viewedByPath: { ...previous.viewedByPath, [path]: nextState },
      };
      queryClient.setQueryData<ViewedFilesQueryData>(queryKey, optimistic);

      return { previous };
    },
    onError: (_mutationError, _variables, context) => {
      if (context?.previous != null) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
  });

  const viewedByPath = useMemo(() => toViewedMap(data), [data]);
  const hasToken = data?.hasToken === true;
  const isReady = !isPending;

  const isViewed = useCallback(
    (path: string) => viewedByPath.get(path) === 'VIEWED',
    [viewedByPath],
  );

  const toggleViewed = useCallback(
    (path: string, next?: boolean) => {
      if (data == null || !data.hasToken) {
        return;
      }

      const shouldView = next ?? viewedByPath.get(path) !== 'VIEWED';
      toggleMutation.mutate({
        path,
        shouldView,
        pullRequestId: data.pullRequestId,
      });
    },
    [data, toggleMutation, viewedByPath],
  );

  const progress = useMemo(
    () => computeViewedProgress(orderedPaths, viewedByPath),
    [orderedPaths, viewedByPath],
  );

  const nextUnviewedPath = useCallback(
    (fromPath: string | null) => findNextUnviewedPath(orderedPaths, viewedByPath, fromPath),
    [orderedPaths, viewedByPath],
  );

  const mutationError = toggleMutation.error;

  return {
    viewedByPath,
    isReady,
    hasToken,
    error:
      error != null
        ? error instanceof Error
          ? error.message
          : String(error)
        : mutationError != null
          ? mutationError instanceof Error
            ? mutationError.message
            : String(mutationError)
          : null,
    progress,
    isViewed,
    toggleViewed,
    nextUnviewedPath,
  };
}
