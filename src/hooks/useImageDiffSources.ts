import { useEffect, useState } from 'react';

import {
  clearImageDiffCache,
  ensureImageDiffSide,
  peekImageDiffSide,
  prefetchImageDiffs,
  subscribeImageDiffCache,
  type ImageDiffSideSource,
} from '@/lib/diff/image-diff-cache';
import { getImageDiffSides } from '@/lib/diff/media-files';
import type {
  GitHubPullRequest,
  GitHubPullRequestFile,
  GitHubPullRequestRef,
  PullRequestDiffData,
} from '@/lib/github/api';
import { MediaFileFetchError } from '@/lib/github/blobs';
import type { ReviewMediaImagePane } from '@/lib/review/comments';

export type { ImageDiffSideSource };

export type ImageDiffSourcesState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  before: ImageDiffSideSource | null;
  after: ImageDiffSideSource | null;
  error: string | null;
};

const IDLE: ImageDiffSourcesState = {
  status: 'idle',
  before: null,
  after: null,
  error: null,
};

type UseImageDiffSourcesParams = {
  file: GitHubPullRequestFile | null;
  pullRequest: GitHubPullRequest | null;
  pullRequestRef: GitHubPullRequestRef | null;
  enabled: boolean;
  pane?: ReviewMediaImagePane;
};

function readPaneState(
  file: GitHubPullRequestFile,
  pullRequest: GitHubPullRequest,
  pullRequestRef: GitHubPullRequestRef,
  pane: ReviewMediaImagePane,
): ImageDiffSourcesState {
  const sides = getImageDiffSides(file);
  const loadBefore = pane === 'before' || (pane === 'only' && sides.showBefore);
  const loadAfter = pane === 'after' || (pane === 'only' && sides.showAfter);

  let before: ImageDiffSideSource | null = null;
  let after: ImageDiffSideSource | null = null;
  let loading = false;
  let error: string | null = null;

  if (loadBefore && sides.beforePath) {
    const entry = peekImageDiffSide(pullRequestRef, sides.beforePath, pullRequest.base.sha);
    if (entry?.status === 'ready') {
      before = entry.source;
    } else if (entry?.status === 'error') {
      error = entry.error;
    } else {
      loading = true;
    }
  }

  if (loadAfter && sides.afterPath) {
    const entry = peekImageDiffSide(pullRequestRef, sides.afterPath, pullRequest.head.sha);
    if (entry?.status === 'ready') {
      after = entry.source;
    } else if (entry?.status === 'error') {
      error = error ?? entry.error;
    } else {
      loading = true;
    }
  }

  if (error) {
    return {
      status: 'error',
      before,
      after,
      error,
    };
  }

  if (loading) {
    return {
      status: 'loading',
      before,
      after,
      error: null,
    };
  }

  const needsBefore = loadBefore && sides.beforePath != null;
  const needsAfter = loadAfter && sides.afterPath != null;
  if ((needsBefore && !before) || (needsAfter && !after)) {
    return {
      status: 'loading',
      before,
      after,
      error: null,
    };
  }

  return {
    status: 'ready',
    before,
    after,
    error: null,
  };
}

export function useImageDiffSources({
  file,
  pullRequest,
  pullRequestRef,
  enabled,
  pane = 'only',
}: UseImageDiffSourcesParams): ImageDiffSourcesState {
  const canLoad = Boolean(enabled && file && pullRequest && pullRequestRef);
  const loadKey = canLoad
    ? `${file!.filename}:${pane}:${pullRequest!.head.sha}:${pullRequestRef!.pullNumber}`
    : null;

  const [state, setState] = useState<ImageDiffSourcesState>(() => {
    if (!canLoad || !file || !pullRequest || !pullRequestRef) {
      return IDLE;
    }
    return readPaneState(file, pullRequest, pullRequestRef, pane);
  });
  const [trackedLoadKey, setTrackedLoadKey] = useState(loadKey);

  if (loadKey !== trackedLoadKey) {
    setTrackedLoadKey(loadKey);
    if (!canLoad || !file || !pullRequest || !pullRequestRef) {
      setState(IDLE);
    } else {
      setState(readPaneState(file, pullRequest, pullRequestRef, pane));
    }
  }

  useEffect(() => {
    if (!canLoad || !file || !pullRequest || !pullRequestRef) {
      return;
    }

    const sides = getImageDiffSides(file);
    const loadBefore = pane === 'before' || (pane === 'only' && sides.showBefore);
    const loadAfter = pane === 'after' || (pane === 'only' && sides.showAfter);
    let cancelled = false;

    const sync = () => {
      if (!cancelled) {
        setState(readPaneState(file, pullRequest, pullRequestRef, pane));
      }
    };

    sync();
    const unsubscribe = subscribeImageDiffCache(sync);

    void (async () => {
      try {
        const pending: Promise<ImageDiffSideSource>[] = [];
        if (loadBefore && sides.beforePath) {
          pending.push(ensureImageDiffSide(pullRequestRef, sides.beforePath, pullRequest.base.sha));
        }
        if (loadAfter && sides.afterPath) {
          pending.push(ensureImageDiffSide(pullRequestRef, sides.afterPath, pullRequest.head.sha));
        }
        await Promise.all(pending);
        sync();
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }
        // Cache already stores the error; sync for UI. Keep a fallback message if peek missed it.
        sync();
        if (!(error instanceof MediaFileFetchError) && !(error instanceof Error)) {
          setState({
            status: 'error',
            before: null,
            after: null,
            error: 'Failed to load image.',
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [canLoad, file, pane, pullRequest, pullRequestRef]);

  return state;
}

/** Prefetch all PR image blobs as soon as diff data is ready (not only when scrolled into view). */
export function usePrefetchImageDiffs(data: PullRequestDiffData): void {
  useEffect(() => {
    prefetchImageDiffs(data.ref, data.pullRequest, data.files);

    return () => {
      clearImageDiffCache();
    };
  }, [data]);
}
