import { createRoot, type Root } from 'react-dom/client';

import { App } from '@/components/app/App';
import { PreloadHighlighter } from '@/components/theming/PreloadHighlighter';
import { warmGitHubTokenCache } from '@/lib/github/api';
import { OVERLAY_LAYOUT_KICK_EVENT } from '@/lib/overlay/messages';
import { clearAllReviewSessions } from '@/lib/overlay/review-session';
import { queryClient } from '@/lib/query/client';
import { prefetchPullRequestDiff } from '@/lib/query/pr-diff';
import { PersistentWorkerPoolShell } from '@/providers/PersistentWorkerPoolShell';
import { QueryProvider } from '@/providers/QueryProvider';
import { ThemeControllerProvider } from '@/providers/theming/ThemeControllerProvider';

export type MountOverlayOptions = {
  container: HTMLElement;
  pullRequestUrl: string;
  onClose: () => void;
};

type OverlayRuntimeProps = {
  pullRequestUrl: string | null;
  onClose: () => void;
};

function OverlayRuntime({ pullRequestUrl, onClose }: OverlayRuntimeProps) {
  return (
    <QueryProvider>
      <ThemeControllerProvider>
        <PersistentWorkerPoolShell>
          {pullRequestUrl ? (
            <App
              key={pullRequestUrl}
              pullRequestUrl={pullRequestUrl}
              onClose={onClose}
            />
          ) : null}
        </PersistentWorkerPoolShell>
        <PreloadHighlighter />
      </ThemeControllerProvider>
    </QueryProvider>
  );
}

let overlayRoot: Root | null = null;
let runtimeProps: OverlayRuntimeProps = {
  pullRequestUrl: null,
  onClose: () => undefined,
};

function renderOverlayRuntime(): void {
  overlayRoot?.render(<OverlayRuntime {...runtimeProps} />);
}

export function mountOverlay({ container, pullRequestUrl, onClose }: MountOverlayOptions): void {
  overlayRoot ??= createRoot(container);
  runtimeProps = { pullRequestUrl, onClose };
  renderOverlayRuntime();
  kickOverlayLayout();
}

/** Re-measure CodeView after the overlay iframe becomes visible. */
export function kickOverlayLayout(): void {
  const dispatch = () => {
    window.dispatchEvent(new Event(OVERLAY_LAYOUT_KICK_EVENT));
  };

  dispatch();
  requestAnimationFrame(() => {
    dispatch();
    requestAnimationFrame(() => {
      dispatch();
      window.setTimeout(dispatch, 100);
    });
  });
}

/** Unmount app UI while keeping the worker pool shell alive in the React tree. */
export function unmountOverlayApp(): void {
  runtimeProps = { pullRequestUrl: null, onClose: runtimeProps.onClose };
  renderOverlayRuntime();
}

export function destroyOverlayRuntime(): void {
  overlayRoot?.unmount();
  overlayRoot = null;
  runtimeProps = { pullRequestUrl: null, onClose: () => undefined };
  queryClient.clear();
  clearAllReviewSessions();
}

/** Warm the GitHub token + diff data caches in this (extension-origin) realm before mount. */
export function prefetchOverlayData(pullRequestUrl: string): void {
  warmGitHubTokenCache();
  prefetchPullRequestDiff(pullRequestUrl);
}
