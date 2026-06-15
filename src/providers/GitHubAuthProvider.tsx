import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { getGitHubToken } from '@/lib/github/api';
import { fetchGitHubViewer, type GitHubViewer } from '@/lib/github/review-write';

type GitHubAuthContextValue = {
  viewerUser: GitHubViewer | null;
  hasToken: boolean;
  isLoading: boolean;
};

const GitHubAuthContext = createContext<GitHubAuthContextValue | null>(null);

export function GitHubAuthProvider({ children }: { children: ReactNode }) {
  const [viewerUser, setViewerUser] = useState<GitHubViewer | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    void (async () => {
      const token = await getGitHubToken();
      if (isCancelled) return;

      setHasToken(token != null);
      if (!token) {
        setViewerUser(null);
        setIsLoading(false);
        return;
      }

      const viewer = await fetchGitHubViewer();
      if (!isCancelled) {
        setViewerUser(viewer);
        setIsLoading(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <GitHubAuthContext.Provider value={{ viewerUser, hasToken, isLoading }}>
      {children}
    </GitHubAuthContext.Provider>
  );
}

export function useGitHubAuth(): GitHubAuthContextValue {
  const context = useContext(GitHubAuthContext);
  if (!context) {
    throw new Error('useGitHubAuth must be used within GitHubAuthProvider');
  }
  return context;
}
