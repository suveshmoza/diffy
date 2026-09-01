import { getPullRequestRefPrefix, parseGitHubPullRequestUrl } from '@/lib/github/api';
import { hideOverlayRoot, installViewDiffButton, uninstallViewDiffButton } from '@/lib/github/page';
import {
  destroyOverlayFrame,
  hideOverlayFrame,
  openOverlayFrame,
  preloadOverlayFrame,
  prefetchOverlayFrame,
  setOverlayCloseHandler,
} from '@/lib/overlay/frame';

import './content.css';

const LOCATION_POLL_MS = 300;

function pullRequestKey(url: string): string | null {
  const ref = parseGitHubPullRequestUrl(url);
  return ref ? getPullRequestRefPrefix(ref) : null;
}

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

    const onOpen = (pullRequestUrl: string) => {
      openPullRequestUrl = pullRequestUrl;
      openOverlayFrame(pullRequestUrl);
    };

    const onPrefetch = (url: string) => {
      preloadOverlayFrame();
      prefetchOverlayFrame(url);
    };

    installViewDiffButton(onOpen, onPrefetch);

    ctx.onInvalidated(() => {
      uninstallViewDiffButton();
      destroyOverlayFrame();
    });

    let lastHref = location.href;

    // `wxt:locationchange` is driven by the Navigation API, which dispatches before the
    // navigation commits, so `location.href` still points at the previous page inside the
    // handler. Poll the committed URL instead.
    ctx.setInterval(() => {
      if (location.href === lastHref) {
        return;
      }

      lastHref = location.href;

      if (
        openPullRequestUrl != null &&
        pullRequestKey(openPullRequestUrl) !== pullRequestKey(lastHref)
      ) {
        destroyOverlay();
      }
    }, LOCATION_POLL_MS);
  },
});
