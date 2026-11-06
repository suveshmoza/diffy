import type { GitHubPullRequestRef } from '@/domains/github/api';
import { withBypassHttpCache } from '@/domains/github/github-fetch';
import { invalidateCodeViewItemsCache } from '@/lib/code-view/build-items';

import { queryClient } from './client';
import { prDiffQueryOptions } from './pr-diff';
import { viewedFilesQueryOptions } from './viewed-files';

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
