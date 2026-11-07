import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { useStandaloneDocumentTitle } from '@/app/useStandaloneDocumentTitle';
import { DiffOverlay } from '@/domains/diff/components/DiffOverlay';
import { usePullRequestDiff } from '@/domains/diff/hooks/usePullRequestDiff';
import { SidebarProvider } from '@/domains/diff/providers/SidebarContext';
import { refreshPullRequestData } from '@/domains/diff/queries/refresh';
import {
  getLoadProgress,
  getPullRequestRefPrefix,
  parseGitHubPullRequestUrl,
  subscribeToLoadProgress,
} from '@/domains/github/api';
import { useThemeControllerReady } from '@/domains/theming/providers/ThemeControllerProvider';
import { useThemeSource } from '@/domains/theming/providers/useThemeSource';
import { toErrorMessage } from '@/shared/errors';

import { ErrorOverlay } from './ErrorOverlay';
import { LoadingOverlay } from './LoadingOverlay';

type AppProps = {
  pullRequestUrl: string;
  onClose: () => void;
};

function isTextInputFocused(root: HTMLElement): boolean {
  const active = document.activeElement;

  return (
    active instanceof HTMLElement &&
    root.contains(active) &&
    (active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      active.isContentEditable)
  );
}

export function App({ pullRequestUrl, onClose }: AppProps) {
  const ref = useMemo(() => parseGitHubPullRequestUrl(pullRequestUrl), [pullRequestUrl]);
  const { data, isError, error, headMeta } = usePullRequestDiff(ref);
  const { isReady: isThemeStorageReady, resolutionError: themeError } = useThemeControllerReady();
  const { activeTheme } = useThemeSource();
  const isResolvedThemeReady =
    isThemeStorageReady && activeTheme.theme != null && themeError === null;

  useStandaloneDocumentTitle({
    pullRequestTitle: data?.pullRequest.title ?? headMeta?.title,
    fallbackTitle: ref ? getPullRequestRefPrefix(ref) : undefined,
    isReady: data != null && isResolvedThemeReady,
  });
  const loadProgress = useSyncExternalStore(subscribeToLoadProgress, getLoadProgress);
  const [refreshGeneration, setRefreshGeneration] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const retry = useCallback(async () => {
    if (!ref || isRefreshing) return;

    setIsRefreshing(true);

    try {
      await refreshPullRequestData(ref);
      setRefreshGeneration((generation) => generation + 1);
    } catch (err) {
      console.error('Failed to refresh pull request data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [ref, isRefreshing]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      const root = document.getElementById('github-pr-viewer-root');

      if (!root || root.classList.contains('gprv-root-hidden')) return;

      if (data != null && isResolvedThemeReady) return;

      if (isTextInputFocused(root)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      onClose();
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
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

  if (!ref) {
    return (
      <ErrorOverlay
        message='Could not parse a GitHub pull request URL from this page.'
        onRetry={retry}
        onClose={onClose}
      />
    );
  }

  if (data == null) {
    if (isError) {
      return (
        <ErrorOverlay
          message={toErrorMessage(error)}
          onRetry={retry}
          onClose={onClose}
        />
      );
    }

    return (
      <LoadingOverlay
        onClose={onClose}
        progress={loadProgress}
      />
    );
  }

  if (themeError) {
    return (
      <ErrorOverlay
        message={`Failed to apply theme: ${themeError}`}
        onRetry={retry}
        onClose={onClose}
      />
    );
  }

  if (!isResolvedThemeReady) {
    return (
      <LoadingOverlay
        onClose={onClose}
        progress={loadProgress}
        opening
      />
    );
  }

  return (
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
}
