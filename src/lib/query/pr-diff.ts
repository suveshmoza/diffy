import { queryOptions } from '@tanstack/react-query';
import type { SetStateAction } from 'react';

import { invalidateCodeViewItemsCache } from '@/lib/code-view/build-items';
import {
  fetchPullRequestDiffData,
  parseGitHubPullRequestUrl,
  type GitHubPullRequestRef,
  type GitHubPullRequestReviewComment,
  type PullRequestDiffData,
} from '@/lib/github/api';

import { queryClient } from './client';

const PR_DIFF_STALE_TIME = Number.POSITIVE_INFINITY;
const PR_DIFF_GC_TIME = 30 * 60 * 1000;

export const prDiffQueryOptions = (ref: GitHubPullRequestRef) =>
  queryOptions({
    queryKey: ['pr-diff', ref.owner, ref.repo, ref.pullNumber] as const,
    queryFn: () => fetchPullRequestDiffData(ref),
    staleTime: PR_DIFF_STALE_TIME,
    gcTime: PR_DIFF_GC_TIME,
  });

export function prefetchPullRequestDiff(url: string | null | undefined): void {
  const ref = parseGitHubPullRequestUrl(url);
  if (!ref) {
    return;
  }

  void queryClient.prefetchQuery(prDiffQueryOptions(ref)).catch(() => undefined);
}

export function updatePullRequestReviewComments(
  ref: GitHubPullRequestRef,
  updater: SetStateAction<GitHubPullRequestReviewComment[]>,
): void {
  queryClient.setQueryData<PullRequestDiffData>(prDiffQueryOptions(ref).queryKey, (current) => {
    if (current == null) {
      return current;
    }

    const reviewComments =
      typeof updater === 'function' ? updater(current.reviewComments) : updater;

    return { ...current, reviewComments };
  });
  invalidateCodeViewItemsCache(ref);
}
