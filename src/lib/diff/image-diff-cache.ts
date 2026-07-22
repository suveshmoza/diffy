import { classifyChangedFile, getImageDiffSides } from '@/lib/diff/media-files';
import type {
  GitHubPullRequest,
  GitHubPullRequestFile,
  GitHubPullRequestRef,
} from '@/lib/github/api';
import { fetchRepoFileBytes, MediaFileFetchError } from '@/lib/github/blobs';

export type ImageDiffSideSource = {
  path: string;
  url: string;
  size: number;
  width: number;
  height: number;
  mimeType: string;
};

type ReadyEntry = {
  status: 'ready';
  source: ImageDiffSideSource;
};

type ErrorEntry = {
  status: 'error';
  error: string;
};

type LoadingEntry = {
  status: 'loading';
  promise: Promise<ImageDiffSideSource>;
};

type CacheEntry = ReadyEntry | ErrorEntry | LoadingEntry;

const MAX_CONCURRENT_FETCHES = 4;

const cache = new Map<string, CacheEntry>();
const listeners = new Set<() => void>();

let activeFetches = 0;
type FetchQueueEntry = {
  key: string;
  start: () => void;
};
const waitQueue: FetchQueueEntry[] = [];

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeImageDiffCache(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function imageDiffCacheKey(
  ref: GitHubPullRequestRef,
  path: string,
  commitSha: string,
): string {
  return `${ref.owner.toLowerCase()}/${ref.repo.toLowerCase()}@${commitSha}:${path}`;
}

function acquireFetchSlot(key: string, priority = false): Promise<void> {
  if (activeFetches < MAX_CONCURRENT_FETCHES) {
    activeFetches += 1;
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const entry: FetchQueueEntry = {
      key,
      start: () => {
        activeFetches += 1;
        resolve();
      },
    };
    if (priority) {
      waitQueue.unshift(entry);
    } else {
      waitQueue.push(entry);
    }
  });
}

function releaseFetchSlot(): void {
  activeFetches = Math.max(0, activeFetches - 1);
  const next = waitQueue.shift();
  if (next) {
    next.start();
  }
}

function promoteQueuedFetch(key: string): void {
  const index = waitQueue.findIndex((entry) => entry.key === key);
  if (index <= 0) {
    return;
  }
  const [entry] = waitQueue.splice(index, 1);
  if (entry) {
    waitQueue.unshift(entry);
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof MediaFileFetchError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Failed to load image.';
}

/**
 * Load (or reuse) a single image blob URL for a path@sha. Dedupes in-flight work.
 */
export function ensureImageDiffSide(
  ref: GitHubPullRequestRef,
  path: string,
  commitSha: string,
  options?: { priority?: boolean },
): Promise<ImageDiffSideSource> {
  const key = imageDiffCacheKey(ref, path, commitSha);
  const existing = cache.get(key);

  if (existing?.status === 'ready') {
    return Promise.resolve(existing.source);
  }
  if (existing?.status === 'loading') {
    if (options?.priority) {
      promoteQueuedFetch(key);
    }
    return existing.promise;
  }
  if (existing?.status === 'error') {
    // Allow retry on a later ensure call by clearing the error entry below.
    cache.delete(key);
  }

  let resolvePromise!: (source: ImageDiffSideSource) => void;
  let rejectPromise!: (error: unknown) => void;
  const promise = new Promise<ImageDiffSideSource>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  cache.set(key, { status: 'loading', promise });
  notify();

  void (async () => {
    await acquireFetchSlot(key, options?.priority);
    try {
      const result = await fetchRepoFileBytes(ref, path, commitSha);
      const blob = new Blob([new Uint8Array(result.bytes)], { type: result.mimeType });
      const dimensions = await decodeImageDimensions(blob);
      const url = URL.createObjectURL(blob);
      const source: ImageDiffSideSource = {
        path,
        url,
        size: result.size,
        width: dimensions.width,
        height: dimensions.height,
        mimeType: result.mimeType,
      };

      const current = cache.get(key);
      // Only commit if this request is still the active one for the key.
      if (current?.status === 'loading' && current.promise === promise) {
        cache.set(key, { status: 'ready', source });
        notify();
        resolvePromise(source);
      } else {
        URL.revokeObjectURL(url);
        rejectPromise(new Error('Image fetch was superseded.'));
      }
    } catch (error: unknown) {
      const message = toErrorMessage(error);
      const current = cache.get(key);
      if (current?.status === 'loading' && current.promise === promise) {
        cache.set(key, { status: 'error', error: message });
        notify();
      }
      rejectPromise(error instanceof Error ? error : new Error(message));
    } finally {
      releaseFetchSlot();
    }
  })();

  return promise;
}

async function decodeImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
      const dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return dimensions;
    } catch {
      // SVG and some browser codecs may require the HTMLImageElement fallback.
    }
  }

  const url = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener(
        'load',
        () => resolve({ width: image.naturalWidth, height: image.naturalHeight }),
        { once: true },
      );
      image.addEventListener(
        'error',
        () => reject(new Error('Failed to decode image dimensions.')),
        { once: true },
      );
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function peekImageDiffSide(
  ref: GitHubPullRequestRef,
  path: string,
  commitSha: string,
): ReadyEntry | ErrorEntry | LoadingEntry | null {
  return cache.get(imageDiffCacheKey(ref, path, commitSha)) ?? null;
}

/** Queue all image sides for a PR in file order (visible files tend to be first). */
export function prefetchImageDiffs(
  ref: GitHubPullRequestRef,
  pullRequest: GitHubPullRequest,
  files: readonly GitHubPullRequestFile[],
): void {
  for (const file of files) {
    if (classifyChangedFile(file) !== 'image') {
      continue;
    }

    const sides = getImageDiffSides(file);
    if (sides.showBefore && sides.beforePath) {
      void ensureImageDiffSide(ref, sides.beforePath, pullRequest.base.sha).catch(() => undefined);
    }
    if (sides.showAfter && sides.afterPath) {
      void ensureImageDiffSide(ref, sides.afterPath, pullRequest.head.sha).catch(() => undefined);
    }
  }
}

/** Promote both sides of a selected image ahead of background prefetch work. */
export function bumpImageDiffPriority(
  ref: GitHubPullRequestRef,
  pullRequest: GitHubPullRequest,
  file: GitHubPullRequestFile,
): void {
  if (classifyChangedFile(file) !== 'image') {
    return;
  }

  const sides = getImageDiffSides(file);
  if (sides.showBefore && sides.beforePath) {
    void ensureImageDiffSide(ref, sides.beforePath, pullRequest.base.sha, {
      priority: true,
    }).catch(() => undefined);
  }
  if (sides.showAfter && sides.afterPath) {
    void ensureImageDiffSide(ref, sides.afterPath, pullRequest.head.sha, {
      priority: true,
    }).catch(() => undefined);
  }
}

/** Drop cached blob URLs (call when leaving a PR overlay). */
export function clearImageDiffCache(): void {
  for (const entry of cache.values()) {
    if (entry.status === 'ready') {
      URL.revokeObjectURL(entry.source.url);
    }
  }
  cache.clear();
  notify();
}
