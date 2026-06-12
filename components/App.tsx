import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ChromeModal } from './ChromeModal';
import { DiffOverlay } from './DiffOverlay';
import {
  fetchCachedPullRequestDiffData,
  invalidatePullRequestDiffCache,
  parseGitHubPullRequestUrl,
  type PullRequestDiffData,
} from '@/lib/github';
import { getGitHubTheme } from '@/lib/theme';

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
  const theme = getGitHubTheme();

  const retry = useCallback(() => {
    const ref = parseGitHubPullRequestUrl(pullRequestUrl);
    if (ref) {
      invalidatePullRequestDiffCache(ref);
    }
    setRetryCount((count) => count + 1);
  }, [pullRequestUrl]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
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
      setState({ status: 'error', message: 'Could not parse a GitHub pull request URL from this page.' });
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

  if (state.status === 'loaded') {
    content = <DiffOverlay data={state.data} onClose={onClose} />;
  } else if (state.status === 'error') {
    content = (
      <ChromeModal title="Unable to load PR diff" onClose={onClose} theme={theme}>
        <div className="gprv-modal-body">
          <div className="gprv-error-panel">
            <div className="gprv-error-icon" aria-hidden="true">
              !
            </div>
            <p className="gprv-error-summary">Something went wrong while loading this pull request.</p>
            <p className="gprv-error-hint">
              If this is a private repo or you are rate-limited, add a GitHub token in the diffy popup.
            </p>
            <div className="gprv-error-actions">
              <button className="gprv-header-button" type="button" onClick={retry}>
                Try again
              </button>
            </div>
            <details className="gprv-error-details">
              <summary>Technical details</summary>
              <pre>{state.message}</pre>
            </details>
          </div>
        </div>
      </ChromeModal>
    );
  } else {
    content = (
      <ChromeModal title="Loading PR diff…" onClose={onClose} theme={theme}>
        <div className="gprv-state">Fetching PR metadata and changed files from GitHub…</div>
      </ChromeModal>
    );
  }

  return content;
}
