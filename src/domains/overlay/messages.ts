/** postMessage protocol between the github.com content script and the extension-origin overlay iframe. */

export const OVERLAY_PARENT_SOURCE = 'gprv-overlay-host';
export const OVERLAY_CHILD_SOURCE = 'gprv-overlay-frame';

/** Sent by the content script (parent) to the overlay iframe (child). */
export type OverlayHostMessage =
  | { source: typeof OVERLAY_PARENT_SOURCE; type: 'mount'; pullRequestUrl: string }
  | { source: typeof OVERLAY_PARENT_SOURCE; type: 'prefetch'; pullRequestUrl: string }
  | { source: typeof OVERLAY_PARENT_SOURCE; type: 'layout' }
  | { source: typeof OVERLAY_PARENT_SOURCE; type: 'unmount' }
  | { source: typeof OVERLAY_PARENT_SOURCE; type: 'destroy' };

/** Dispatched inside the overlay iframe to re-measure CodeView after the frame becomes visible. */
export const OVERLAY_LAYOUT_KICK_EVENT = 'gprv-overlay-layout-kick';

/** Sent by the overlay iframe (child) to the content script (parent). */
export type OverlayFrameMessage =
  | { source: typeof OVERLAY_CHILD_SOURCE; type: 'ready' }
  | { source: typeof OVERLAY_CHILD_SOURCE; type: 'close' };

export function isOverlayHostMessage(data: unknown): data is OverlayHostMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { source?: unknown }).source === OVERLAY_PARENT_SOURCE
  );
}

export function isOverlayFrameMessage(data: unknown): data is OverlayFrameMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { source?: unknown }).source === OVERLAY_CHILD_SOURCE
  );
}
