import workerUrl from '@pierre/diffs/worker/worker.js?worker&url';

export function workerFactory(): Worker {
  const resolvedWorkerUrl = (browser.runtime.getURL as (path: string) => string)(workerUrl);
  return new Worker(resolvedWorkerUrl, {
    type: 'module',
    name: 'github-pr-viewer-highlighter',
  });
}
