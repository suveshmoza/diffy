import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { invalidateCodeViewItemsCache } from '@/domains/diff/model/build-items';
import { prDiffQueryOptions } from '@/domains/diff/queries/pr-diff';
import { prHeadQueryOptions } from '@/domains/diff/queries/pr-head';
import type { GitHubPullRequestRef } from '@/domains/github/api';
import { queryClient } from '@/lib/query/client';

export function usePullRequestDiff(ref: GitHubPullRequestRef | null) {
  const headQuery = useQuery({
    ...prHeadQueryOptions(ref!),
    enabled: ref != null,
  });

  const diffQuery = useQuery({
    ...prDiffQueryOptions(ref!),
    enabled: ref != null,
  });

  useEffect(() => {
    if (ref == null || headQuery.data == null || diffQuery.data == null) {
      return;
    }

    if (headQuery.data.sha === diffQuery.data.pullRequest.head.sha) {
      return;
    }

    invalidateCodeViewItemsCache(ref);
    void queryClient.fetchQuery({
      ...prDiffQueryOptions(ref),
      staleTime: 0,
    });
  }, [diffQuery.data, headQuery.data, ref]);

  return { ...diffQuery, headMeta: headQuery.data };
}
