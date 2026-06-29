import {
  OVERLAY_CHILD_SOURCE,
  isOverlayHostMessage,
  type OverlayFrameMessage,
} from '@/lib/overlay/messages';

import {
  destroyOverlayRuntime,
  kickOverlayLayout,
  mountOverlay,
  prefetchOverlayData,
  unmountOverlayApp,
} from '../github-pr.content/overlay';

import '../github-pr.content/style.css';

const CONTAINER_ID = 'github-pr-viewer-root';

function getContainer(): HTMLElement {
  const existing = document.getElementById(CONTAINER_ID);
  if (existing) {
    return existing;
  }

  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  document.body.append(container);
  return container;
}

function postToHost(message: OverlayFrameMessage): void {
  window.parent.postMessage(message, '*');
}

function notifyClose(): void {
  if (window === window.parent) {
    window.close();
  } else {
    postToHost({ source: OVERLAY_CHILD_SOURCE, type: 'close' });
  }
}

const isStandalone = window === window.parent;

if (isStandalone) {
  const params = new URLSearchParams(location.search);
  const prUrl = params.get('pr');
  if (prUrl) {
    mountOverlay({
      container: getContainer(),
      pullRequestUrl: prUrl,
      onClose: notifyClose,
    });
  }
} else {
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.source !== window.parent || !isOverlayHostMessage(event.data)) {
      return;
    }

    const message = event.data;
    switch (message.type) {
      case 'mount':
        mountOverlay({
          container: getContainer(),
          pullRequestUrl: message.pullRequestUrl,
          onClose: notifyClose,
        });
        kickOverlayLayout();
        break;
      case 'layout':
        kickOverlayLayout();
        break;
      case 'prefetch':
        prefetchOverlayData(message.pullRequestUrl);
        break;
      case 'unmount':
        unmountOverlayApp();
        break;
      case 'destroy':
        destroyOverlayRuntime();
        break;
    }
  });

  postToHost({ source: OVERLAY_CHILD_SOURCE, type: 'ready' });
}
