import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { invalidateCodeViewItemsCache } from '@/lib/code-view/build-items';
import type { GitHubPullRequestRef } from '@/lib/github/api';
import { queryClient } from '@/lib/query/client';
import { prDiffQueryOptions } from '@/lib/query/pr-diff';
import { prHeadQueryOptions } from '@/lib/query/pr-head';

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
