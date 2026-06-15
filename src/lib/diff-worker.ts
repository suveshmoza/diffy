import workerUrl from '@pierre/diffs/worker/worker.js?worker&url';

export function workerFactory(): Worker {
  // The overlay runs inside an extension-origin iframe, so the worker script is
  // same-origin and can be constructed directly (no cross-origin/CSP issues).
  const resolvedWorkerUrl = (browser.runtime.getURL as (path: string) => string)(workerUrl);
  return new Worker(resolvedWorkerUrl, {
    type: 'module',
    name: 'github-pr-viewer-highlighter',
  });
}
