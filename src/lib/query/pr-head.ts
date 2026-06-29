import { queryOptions } from '@tanstack/react-query';

import { fetchPullRequestHeadMeta, type GitHubPullRequestRef } from '@/lib/github/api';

const PR_HEAD_GC_TIME = 30 * 60 * 1000;

/** Lightweight head probe — always stale so reopen checks GitHub for new commits. */
export const prHeadQueryOptions = (ref: GitHubPullRequestRef) =>
  queryOptions({
    queryKey: ['pr-head', ref.owner, ref.repo, ref.pullNumber] as const,
    queryFn: () => fetchPullRequestHeadMeta(ref),
    staleTime: 0,
    gcTime: PR_HEAD_GC_TIME,
  });
