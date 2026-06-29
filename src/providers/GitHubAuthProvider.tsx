import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getGitHubToken } from '@/lib/github/api';
import type { GitHubViewer } from '@/lib/github/review-write';
import { subscribeToGitHubTokenChanges } from '@/lib/github/token-storage';
import { githubViewerQueryOptions } from '@/lib/query/github-auth';

type GitHubAuthContextValue = {
  viewerUser: GitHubViewer | null;
  hasToken: boolean;
  isLoading: boolean;
};

const GitHubAuthContext = createContext<GitHubAuthContextValue | null>(null);

export function GitHubAuthProvider({ children }: { children: ReactNode }) {
  const [hasToken, setHasToken] = useState(false);
  const [isTokenReady, setIsTokenReady] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const loadToken = async () => {
      const token = await getGitHubToken();
      if (!isCancelled) {
        setHasToken(token != null);
        setIsTokenReady(true);
      }
    };

    void loadToken();

    const unsubscribe = subscribeToGitHubTokenChanges(() => {
      setIsTokenReady(false);
      void loadToken();
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, []);

  const viewerQuery = useQuery({
    ...githubViewerQueryOptions(),
    enabled: isTokenReady && hasToken,
  });

  const value = useMemo<GitHubAuthContextValue>(() => {
    const isLoading =
      !isTokenReady || (hasToken && (viewerQuery.isPending || viewerQuery.isFetching));

    return {
      viewerUser: hasToken ? (viewerQuery.data ?? null) : null,
      hasToken,
      isLoading,
    };
  }, [hasToken, isTokenReady, viewerQuery.data, viewerQuery.isFetching, viewerQuery.isPending]);

  return <GitHubAuthContext.Provider value={value}>{children}</GitHubAuthContext.Provider>;
}

export function useGitHubAuth(): GitHubAuthContextValue {
  const context = useContext(GitHubAuthContext);
  if (!context) {
    throw new Error('useGitHubAuth must be used within GitHubAuthProvider');
  }
  return context;
}
