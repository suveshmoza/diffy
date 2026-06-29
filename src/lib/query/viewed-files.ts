import { queryOptions } from '@tanstack/react-query';

import { getGitHubToken, type GitHubPullRequestRef } from '@/lib/github/api';
import { fetchViewedFiles, type FileViewedState } from '@/lib/github/graphql';

const VIEWED_FILES_STALE_TIME = 60_000;
const VIEWED_FILES_GC_TIME = 30 * 60 * 1000;

export type ViewedFilesQueryData =
  | { hasToken: false }
  | {
      hasToken: true;
      pullRequestId: string;
      viewedByPath: Record<string, FileViewedState>;
    };

export const viewedFilesQueryOptions = (ref: GitHubPullRequestRef) =>
  queryOptions({
    queryKey: ['viewed-files', ref.owner, ref.repo, ref.pullNumber] as const,
    queryFn: async (): Promise<ViewedFilesQueryData> => {
      const token = await getGitHubToken();
      if (!token) {
        return { hasToken: false };
      }

      const result = await fetchViewedFiles(ref);
      const viewedByPath: Record<string, FileViewedState> = {};
      for (const file of result.files) {
        viewedByPath[file.path] = file.viewerViewedState;
      }

      return {
        hasToken: true,
        pullRequestId: result.pullRequestId,
        viewedByPath,
      };
    },
    staleTime: VIEWED_FILES_STALE_TIME,
    gcTime: VIEWED_FILES_GC_TIME,
  });
