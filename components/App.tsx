import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { invalidateCodeViewItemsCache } from '@/lib/build-code-view-items';
import { diffThemeType } from '@/lib/diff-themes';
import {
  fetchCachedPullRequestDiffData,
  invalidatePullRequestDiffCache,
  parseGitHubPullRequestUrl,
  type PullRequestDiffData,
} from '@/lib/github';
import { useDiffThemeContext } from '@/providers/DiffThemeProvider';
import { useResolvedThemeContext } from '@/providers/ResolvedThemeProvider';

import { DiffOverlay } from './DiffOverlay';
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
  const { theme, isReady: isThemeReady } = useDiffThemeContext();
  const { isResolvedThemeReady } = useResolvedThemeContext();
  const chromeTheme = diffThemeType(theme);

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
      <DiffOverlay
        data={state.data}
        onClose={onClose}
      />
    );
  } else if (state.status === 'loaded') {
    content = (
      <LoadingOverlay
        onClose={onClose}
        theme={chromeTheme}
      />
    );
  } else if (state.status === 'error') {
    content = (
      <ErrorOverlay
        message={state.message}
        onRetry={retry}
        onClose={onClose}
        theme={chromeTheme}
      />
    );
  } else {
    content = (
      <LoadingOverlay
        onClose={onClose}
        theme={chromeTheme}
      />
    );
  }

  if (!isThemeReady && state.status !== 'loaded') {
    return (
      <LoadingOverlay
        onClose={onClose}
        theme={chromeTheme}
      />
    );
  }

  return content;
}
