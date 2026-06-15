import { getOrCreateOverlayRoot, hideOverlayRoot, removeOverlayRoot } from '@/lib/github/page';
import {
  OVERLAY_PARENT_SOURCE,
  isOverlayFrameMessage,
  type OverlayHostMessage,
} from '@/lib/overlay/messages';

const OVERLAY_PAGE_PATH = '/overlay.html';
const FRAME_ID = 'github-pr-viewer-frame';

type OverlayFrameState = {
  iframe: HTMLIFrameElement;
  ready: boolean;
  pending: OverlayHostMessage[];
};

let state: OverlayFrameState | null = null;
let onCloseRequested: (() => void) | null = null;
let messageListenerAttached = false;

function handleFrameMessage(event: MessageEvent): void {
  if (!state || event.source !== state.iframe.contentWindow) {
    return;
  }

  if (!isOverlayFrameMessage(event.data)) {
    return;
  }

  if (event.data.type === 'ready') {
    state.ready = true;
    const queued = state.pending;
    state.pending = [];
    for (const message of queued) {
      postToFrame(message);
    }
    return;
  }

  if (event.data.type === 'close') {
    onCloseRequested?.();
  }
}

function ensureMessageListener(): void {
  if (messageListenerAttached) {
    return;
  }

  window.addEventListener('message', handleFrameMessage);
  messageListenerAttached = true;
}

function applyFrameStyles(iframe: HTMLIFrameElement): void {
  iframe.id = FRAME_ID;
  iframe.title = 'diffy diff viewer';
  iframe.setAttribute('allow', 'clipboard-write');
  Object.assign(iframe.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    border: '0',
    margin: '0',
    padding: '0',
    background: 'transparent',
    colorScheme: 'normal',
    zIndex: '2147483647',
  });
}

function ensureFrame(): OverlayFrameState {
  if (state) {
    return state;
  }

  ensureMessageListener();

  const root = getOrCreateOverlayRoot();
  const iframe = document.createElement('iframe');
  applyFrameStyles(iframe);
  iframe.src = (browser.runtime.getURL as (path: string) => string)(OVERLAY_PAGE_PATH);
  root.append(iframe);

  state = { iframe, ready: false, pending: [] };
  return state;
}

function postToFrame(message: OverlayHostMessage): void {
  const current = ensureFrame();
  if (current.ready && current.iframe.contentWindow) {
    current.iframe.contentWindow.postMessage(message, '*');
    return;
  }

  current.pending.push(message);
}

/** Create the (hidden) overlay iframe ahead of time so opening is instant. */
export function preloadOverlayFrame(): void {
  const created = state == null;
  ensureFrame();
  if (created) {
    hideOverlayRoot();
  }
}

export function setOverlayCloseHandler(handler: () => void): void {
  onCloseRequested = handler;
}

export function prefetchOverlayFrame(pullRequestUrl: string): void {
  const created = state == null;
  postToFrame({ source: OVERLAY_PARENT_SOURCE, type: 'prefetch', pullRequestUrl });
  if (created) {
    hideOverlayRoot();
  }
}

export function openOverlayFrame(pullRequestUrl: string): void {
  ensureFrame();
  getOrCreateOverlayRoot();
  postToFrame({ source: OVERLAY_PARENT_SOURCE, type: 'mount', pullRequestUrl });
  state?.iframe.contentWindow?.focus();
}

/** Hide the overlay but keep the worker pool alive in the iframe. */
export function hideOverlayFrame(): void {
  hideOverlayRoot();
  if (state) {
    postToFrame({ source: OVERLAY_PARENT_SOURCE, type: 'unmount' });
  }
}

export function destroyOverlayFrame(): void {
  if (state) {
    postToFrame({ source: OVERLAY_PARENT_SOURCE, type: 'destroy' });
  }

  if (messageListenerAttached) {
    window.removeEventListener('message', handleFrameMessage);
    messageListenerAttached = false;
  }

  state?.iframe.remove();
  state = null;
  removeOverlayRoot();
}
