import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';

import { usePullRequestDiff } from '@/hooks/usePullRequestDiff';
import { useStandaloneDocumentTitle } from '@/hooks/useStandaloneDocumentTitle';
import {
  getLoadProgress,
  getPullRequestRefPrefix,
  parseGitHubPullRequestUrl,
  subscribeToLoadProgress,
} from '@/lib/github/api';
import { refreshPullRequestData } from '@/lib/query/refresh';
import { SidebarProvider } from '@/providers/SidebarContext';
import { useThemeControllerReady } from '@/providers/theming/ThemeControllerProvider';
import { useThemeSource } from '@/providers/theming/useThemeSource';

import { DiffOverlay } from '../diff/DiffOverlay';
import { ErrorOverlay } from './ErrorOverlay';
import { LoadingOverlay } from './LoadingOverlay';

type AppProps = {
  pullRequestUrl: string;
  onClose: () => void;
};

export function App({ pullRequestUrl, onClose }: AppProps) {
  const ref = parseGitHubPullRequestUrl(pullRequestUrl);
  const { data, isPending, isError, error, headMeta } = usePullRequestDiff(ref);
  const { isReady: isThemeStorageReady, resolutionError: themeError } = useThemeControllerReady();
  const { activeTheme } = useThemeSource();
  const isResolvedThemeReady =
    isThemeStorageReady && activeTheme.theme != null && themeError == null;

  useStandaloneDocumentTitle({
    pullRequestTitle: data?.pullRequest.title ?? headMeta?.title,
    fallbackTitle: ref ? getPullRequestRefPrefix(ref) : undefined,
    isReady: data != null && isResolvedThemeReady,
  });
  const loadProgress = useSyncExternalStore(subscribeToLoadProgress, getLoadProgress);
  const [refreshGeneration, setRefreshGeneration] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const retry = useCallback(() => {
    if (ref) {
      setIsRefreshing(true);
      void refreshPullRequestData(ref)
        .then(() => {
          setRefreshGeneration((generation) => generation + 1);
        })
        .finally(() => {
          setIsRefreshing(false);
        });
    }
  }, [ref]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      const root = document.getElementById('github-pr-viewer-root');
      if (!root || root.classList.contains('gprv-root-hidden')) {
        return;
      }

      if (data != null && isResolvedThemeReady) {
        return;
      }

      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        root.contains(active) &&
        (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [data, isResolvedThemeReady, onClose]);

  if (!ref) {
    return (
      <ErrorOverlay
        message='Could not parse a GitHub pull request URL from this page.'
        onRetry={retry}
        onClose={onClose}
      />
    );
  }

  let content: ReactNode;

  if (data != null) {
    if (isResolvedThemeReady) {
      content = (
        <SidebarProvider>
          <DiffOverlay
            data={data}
            pullRequestUrl={pullRequestUrl}
            onClose={onClose}
            onRefresh={retry}
            refreshGeneration={refreshGeneration}
            isRefreshing={isRefreshing}
          />
        </SidebarProvider>
      );
    } else if (themeError) {
      content = (
        <ErrorOverlay
          message={`Failed to apply theme: ${themeError}`}
          onRetry={retry}
          onClose={onClose}
        />
      );
    } else {
      content = (
        <LoadingOverlay
          onClose={onClose}
          progress={loadProgress}
        />
      );
    }
  } else if (isError) {
    content = (
      <ErrorOverlay
        message={error instanceof Error ? error.message : String(error)}
        onRetry={retry}
        onClose={onClose}
      />
    );
  } else if (isPending) {
    content = (
      <LoadingOverlay
        onClose={onClose}
        progress={loadProgress}
      />
    );
  } else {
    content = (
      <LoadingOverlay
        onClose={onClose}
        progress={loadProgress}
      />
    );
  }

  return content;
}
