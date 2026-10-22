/**
 * Pierre's portable worker is a single self-contained classic script (no static
 * ES imports), so it can run directly from a same-origin URL. We copy it into
 * the extension at a stable path (see the `build:publicAssets` hook in
 * `wxt.config.ts`) instead of importing it via Vite's `?worker`/`?url` helpers.
 *
 * Why: under `pnpm dev`, Vite serves bundled workers cross-origin from its
 * localhost dev server, and browsers refuse to spawn a worker that isn't
 * same-origin with the document (the overlay iframe is `chrome-extension://`).
 * A copied public asset is a real same-origin extension file in both dev and
 * prod, so the worker behaves identically in both — with no CSP relaxation.
 *
 * Highlights compiles its WASM into this same script and instantiates it
 * in-process. The extension CSP allows that with `wasm-unsafe-eval`. When WASM
 * SIMD is unavailable, the page selects `shiki-js`, which never reaches the
 * conditional oniguruma import.
 */
const DIFF_WORKER_PATH = '/diff-highlighter-worker.js';

export function workerFactory(): Worker {
  // Same-origin extension file, so this works in dev and prod without a blob.
  const url = (browser.runtime.getURL as (path: string) => string)(DIFF_WORKER_PATH);
  return new Worker(url, { name: 'github-pr-viewer-highlighter' });
}
