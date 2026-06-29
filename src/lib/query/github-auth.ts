import { queryOptions } from '@tanstack/react-query';

import { fetchGitHubViewer } from '@/lib/github/review-write';

const VIEWER_STALE_TIME = 5 * 60 * 1000;
const AUTH_GC_TIME = 30 * 60 * 1000;

export const githubViewerQueryOptions = () =>
  queryOptions({
    queryKey: ['github-viewer'] as const,
    queryFn: fetchGitHubViewer,
    staleTime: VIEWER_STALE_TIME,
    gcTime: AUTH_GC_TIME,
  });
