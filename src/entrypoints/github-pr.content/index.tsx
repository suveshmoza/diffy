import {
  hideOverlayRoot,
  installViewDiffButton,
  isPullRequestPage,
  uninstallViewDiffButton,
} from '@/lib/github/page';
import {
  destroyOverlayFrame,
  hideOverlayFrame,
  openOverlayFrame,
  preloadOverlayFrame,
  prefetchOverlayFrame,
  setOverlayCloseHandler,
} from '@/lib/overlay/frame';

import './content.css';

export default defineContentScript({
  matches: ['*://github.com/*'],
  runAt: 'document_idle',
  main(ctx) {
    let openPullRequestUrl: string | null = null;

    const hideOverlay = () => {
      openPullRequestUrl = null;
      hideOverlayFrame();
    };

    setOverlayCloseHandler(hideOverlay);

    const destroyOverlay = () => {
      openPullRequestUrl = null;
      hideOverlayFrame();
      hideOverlayRoot();
    };

    const openOverlay = (pullRequestUrl?: string) => {
      const url = pullRequestUrl ?? location.href;
      openPullRequestUrl = url;
      openOverlayFrame(url);
    };

    const onOpen = (pullRequestUrl: string) => {
      openOverlay(pullRequestUrl);
    };

    const onPrefetch = (url: string) => {
      preloadOverlayFrame();
      prefetchOverlayFrame(url);
    };

    const syncPage = () => {
      if (!isPullRequestPage(location.href)) {
        destroyOverlay();
        uninstallViewDiffButton();
        return;
      }

      if (openPullRequestUrl != null && openPullRequestUrl !== location.href) {
        destroyOverlay();
      }

      installViewDiffButton(onOpen, onPrefetch);
      onPrefetch(location.href);
    };

    syncPage();

    ctx.onInvalidated(() => {
      uninstallViewDiffButton();
      destroyOverlayFrame();
    });

    ctx.addEventListener(window, 'wxt:locationchange', () => {
      syncPage();
    });
  },
});
