import { invalidateCodeViewItemsCache } from '@/domains/diff/model/build-items';
import type { GitHubPullRequestRef } from '@/domains/github/api';
import { withBypassHttpCache } from '@/domains/github/github-fetch';
import { viewedFilesQueryOptions } from '@/domains/review/queries/viewed-files';
import { queryClient } from '@/lib/query/client';

import { prDiffQueryOptions } from './pr-diff';

/** Force-refetch PR diff + viewed files, bypassing browser HTTP disk cache. */
export async function refreshPullRequestData(ref: GitHubPullRequestRef): Promise<void> {
  invalidateCodeViewItemsCache(ref);

  await withBypassHttpCache(async () => {
    await Promise.all([
      queryClient.fetchQuery({
        ...prDiffQueryOptions(ref),
        staleTime: 0,
      }),
      queryClient.fetchQuery({
        ...viewedFilesQueryOptions(ref),
        staleTime: 0,
      }),
    ]);
  });
}
