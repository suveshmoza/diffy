const OVERLAY_MODULE_PATH = '/content-scripts/esm/overlay.js';

export type DiffOverlayModule = {
  mountOverlay: (options: {
    container: HTMLElement;
    pullRequestUrl: string;
    onClose: () => void;
  }) => void;
  unmountOverlayApp: () => void;
  destroyOverlayRuntime: () => void;
};

let overlayModulePromise: Promise<DiffOverlayModule> | null = null;

export function preloadDiffOverlayModule(): void {
  if (overlayModulePromise) {
    return;
  }

  const url = (browser.runtime.getURL as (path: string) => string)(OVERLAY_MODULE_PATH);
  overlayModulePromise = import(/* @vite-ignore */ url).catch((error: unknown) => {
    overlayModulePromise = null;
    throw error;
  }) as Promise<DiffOverlayModule>;
}

export async function loadDiffOverlayModule(): Promise<DiffOverlayModule> {
  preloadDiffOverlayModule();
  return overlayModulePromise as Promise<DiffOverlayModule>;
}
