import { prefetchPullRequestDiffData, warmGitHubTokenCache } from '@/lib/github';
import {
  getOrCreateOverlayRoot,
  hideOverlayRoot,
  installViewDiffButton,
  isPullRequestPage,
  uninstallViewDiffButton,
} from '@/lib/github-page';
import { loadDiffOverlayModule, preloadDiffOverlayModule } from '@/lib/preload-diff-overlay';

import './style.css';

export default defineContentScript({
  matches: ['*://github.com/*'],
  runAt: 'document_idle',
  main(ctx) {
    let openPullRequestUrl: string | null = null;

    const hideOverlay = () => {
      hideOverlayRoot();
    };

    const destroyOverlay = () => {
      openPullRequestUrl = null;
      void loadDiffOverlayModule()
        .then((mod) => {
          mod.unmountOverlayApp();
        })
        .catch(() => undefined);
      hideOverlayRoot();
    };

    const openOverlay = async (pullRequestUrl?: string) => {
      const url = pullRequestUrl ?? location.href;

      if (openPullRequestUrl === url) {
        getOrCreateOverlayRoot();
        return;
      }

      openPullRequestUrl = url;
      const container = getOrCreateOverlayRoot();
      const mod = await loadDiffOverlayModule();
      mod.mountOverlay({
        container,
        pullRequestUrl: openPullRequestUrl,
        onClose: hideOverlay,
      });
    };

    const onOpen = (pullRequestUrl: string) => {
      void openOverlay(pullRequestUrl);
    };

    const onPrefetch = (url: string) => {
      warmGitHubTokenCache();
      prefetchPullRequestDiffData(url);
      preloadDiffOverlayModule();
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
      void loadDiffOverlayModule()
        .then((mod) => {
          mod.destroyOverlayRuntime();
        })
        .catch(() => undefined);
    });

    ctx.addEventListener(window, 'wxt:locationchange', () => {
      syncPage();
    });
  },
});
