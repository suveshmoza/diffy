import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { invalidateCodeViewItemsCache } from '@/lib/code-view/build-items';
import {
  fetchCachedPullRequestDiffData,
  invalidatePullRequestDiffCache,
  parseGitHubPullRequestUrl,
  type PullRequestDiffData,
} from '@/lib/github/api';
import { useResolvedThemeContext } from '@/providers/ResolvedThemeProvider';
import { SidebarProvider } from '@/providers/SidebarContext';

import { DiffOverlay } from '../diff/DiffOverlay';
import { ErrorOverlay } from './ErrorOverlay';
import { LoadingOverlay } from './LoadingOverlay';

type OverlayState =
  | { status: 'loading' }
  | { status: 'loaded'; data: PullRequestDiffData }
  | { status: 'error'; message: string };

type AppProps = {
  pullRequestUrl: string;
  onClose: () => void;
};

export function App({ pullRequestUrl, onClose }: AppProps) {
  const [state, setState] = useState<OverlayState>({ status: 'loading' });
  const [retryCount, setRetryCount] = useState(0);
  const { isResolvedThemeReady } = useResolvedThemeContext();

  const retry = useCallback(() => {
    const ref = parseGitHubPullRequestUrl(pullRequestUrl);
    if (ref) {
      invalidatePullRequestDiffCache(ref);
      invalidateCodeViewItemsCache(ref);
    }
    setRetryCount((count) => count + 1);
  }, [pullRequestUrl]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      const root = document.getElementById('github-pr-viewer-root');
      if (!root || root.classList.contains('gprv-root-hidden')) {
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
  }, [onClose]);

  useEffect(() => {
    let isCancelled = false;
    const ref = parseGitHubPullRequestUrl(pullRequestUrl);

    if (!ref) {
      setState({
        status: 'error',
        message: 'Could not parse a GitHub pull request URL from this page.',
      });
      return;
    }

    setState({ status: 'loading' });
    fetchCachedPullRequestDiffData(ref)
      .then((data) => {
        if (!isCancelled) {
          setState({ status: 'loaded', data });
        }
      })
      .catch((error: unknown) => {
        if (!isCancelled) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [pullRequestUrl, retryCount]);

  let content: ReactNode;

  if (state.status === 'loaded' && isResolvedThemeReady) {
    content = (
      <SidebarProvider>
        <DiffOverlay
          data={state.data}
          onClose={onClose}
        />
      </SidebarProvider>
    );
  } else if (state.status === 'loaded') {
    content = <LoadingOverlay onClose={onClose} />;
  } else if (state.status === 'error') {
    content = (
      <ErrorOverlay
        message={state.message}
        onRetry={retry}
        onClose={onClose}
      />
    );
  } else {
    content = <LoadingOverlay onClose={onClose} />;
  }

  return content;
}
