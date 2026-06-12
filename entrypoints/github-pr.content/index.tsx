import { createRoot, type Root } from 'react-dom/client';

import { App } from '@/components/App';
import { prefetchPullRequestDiffData } from '@/lib/github';
import {
  getOrCreateOverlayRoot,
  installViewDiffButton,
  isPullRequestPage,
  removeOverlayRoot,
  syncViewDiffButton,
} from '@/lib/github-page';

import './style.css';

export default defineContentScript({
  matches: ['*://github.com/*'],
  runAt: 'document_idle',
  main(ctx) {
    let root: Root | null = null;
    let openPullRequestUrl: string | null = null;

    const closeOverlay = () => {
      openPullRequestUrl = null;
      root?.unmount();
      root = null;
      removeOverlayRoot();
    };

    const openOverlay = (pullRequestUrl?: string) => {
      openPullRequestUrl = pullRequestUrl ?? location.href;
      const container = getOrCreateOverlayRoot();
      root ??= createRoot(container);
      root.render(
        <App
          key={openPullRequestUrl}
          pullRequestUrl={openPullRequestUrl}
          onClose={closeOverlay}
        />,
      );
    };

    const onOpen = (pullRequestUrl: string) => openOverlay(pullRequestUrl);
    const onPrefetch = (url: string) => prefetchPullRequestDiffData(url);

    const syncPage = () => {
      if (!isPullRequestPage(location.href)) {
        closeOverlay();
        syncViewDiffButton(onOpen, onPrefetch);
        return;
      }

      if (openPullRequestUrl != null && openPullRequestUrl !== location.href) {
        closeOverlay();
      }

      syncViewDiffButton(onOpen, onPrefetch);
      prefetchPullRequestDiffData(location.href);
    };

    const { disconnect } = installViewDiffButton(onOpen, onPrefetch);
    prefetchPullRequestDiffData(location.href);

    ctx.onInvalidated(disconnect);

    ctx.addEventListener(window, 'wxt:locationchange', () => {
      syncPage();
    });
  },
});
