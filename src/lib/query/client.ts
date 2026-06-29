import { QueryClient } from '@tanstack/react-query';

import { isGitHubRateLimitError } from '@/lib/github/api';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Number.POSITIVE_INFINITY,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: (count, error) => !isGitHubRateLimitError(error) && count < 2,
      },
    },
  });
}

export const queryClient = createQueryClient();
