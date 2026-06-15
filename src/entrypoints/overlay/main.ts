import {
  OVERLAY_CHILD_SOURCE,
  isOverlayHostMessage,
  type OverlayFrameMessage,
} from '@/lib/overlay/messages';

import {
  destroyOverlayRuntime,
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
  postToHost({ source: OVERLAY_CHILD_SOURCE, type: 'close' });
}

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
