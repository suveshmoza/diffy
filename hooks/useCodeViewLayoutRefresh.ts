import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { CodeViewHandle } from '@pierre/diffs/react';

const CODE_VIEW_VIRTUALIZER_CONFIG = {
  overscrollSize: 900,
  intersectionObserverMargin: 900,
} as const;

const MAX_LAYOUT_REFRESH_FRAMES = 60;

type CodeViewInternals = {
  heightDirty: boolean;
  renderState: { scrollTop: number };
};

function refreshCodeViewInstance(viewerRef: RefObject<CodeViewHandle<undefined> | null>): boolean {
  const instance = viewerRef.current?.getInstance();
  const scrollRoot = instance?.getContainerElement();
  if (!instance || !scrollRoot) {
    return false;
  }

  const rectHeight = scrollRoot.getBoundingClientRect().height;
  if (rectHeight === 0) {
    return false;
  }

  Object.assign(instance.config, CODE_VIEW_VIRTUALIZER_CONFIG);

  const internals = instance as unknown as CodeViewInternals;
  internals.heightDirty = true;
  // Force CodeView through its initial-layout path again with a real viewport.
  internals.renderState.scrollTop = -1;

  instance.render(true);
  instance.scrollTo({ type: 'position', position: 0, behavior: 'instant' });
  instance.render(true);
  return true;
}

function scheduleCodeViewLayoutRefresh(viewerRef: RefObject<CodeViewHandle<undefined> | null>): void {
  let frame = 0;

  const tick = () => {
    if (refreshCodeViewInstance(viewerRef)) {
      return;
    }

    frame += 1;
    if (frame < MAX_LAYOUT_REFRESH_FRAMES) {
      requestAnimationFrame(tick);
    }
  };

  tick();
}

export function useCodeViewLayoutRefresh(
  viewerRef: RefObject<CodeViewHandle<undefined> | null>,
  hostRef: RefObject<HTMLDivElement | null>,
  deps: readonly unknown[],
) {
  const scrollObserverRef = useRef<ResizeObserver | null>(null);

  const refresh = useCallback(() => {
    scheduleCodeViewLayoutRefresh(viewerRef);
  }, [viewerRef]);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    refresh();
    const hostObserver = new ResizeObserver(() => refresh());
    hostObserver.observe(host);

    return () => {
      hostObserver.disconnect();
      scrollObserverRef.current?.disconnect();
      scrollObserverRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls when to re-sync layout
  }, [hostRef, refresh, ...deps]);

  const handleCodeViewContainer = useCallback(
    (node: HTMLDivElement | null) => {
      scrollObserverRef.current?.disconnect();
      scrollObserverRef.current = null;

      if (!node) {
        return;
      }

      const scrollObserver = new ResizeObserver(() => refresh());
      scrollObserver.observe(node);
      scrollObserverRef.current = scrollObserver;
      refresh();
    },
    [refresh],
  );

  return { containerRef: handleCodeViewContainer, refresh };
}

export function useCodeViewHostReady(hostRef: RefObject<HTMLDivElement | null>): boolean {
  const [isReady, setIsReady] = useState(false);

  useLayoutEffect(() => {
    setIsReady(false);
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const markReadyIfSized = () => {
      if (host.getBoundingClientRect().height > 0) {
        setIsReady(true);
        return true;
      }
      return false;
    };

    if (markReadyIfSized()) {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (markReadyIfSized()) {
        observer.disconnect();
      }
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, [hostRef]);

  return isReady;
}
