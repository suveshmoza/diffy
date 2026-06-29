import type { CodeViewHandle } from '@pierre/diffs/react';
import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from 'react';

import { OVERLAY_LAYOUT_KICK_EVENT } from '@/lib/overlay/messages';

type CodeViewLayoutHandle<T> = CodeViewHandle<T> & {
  getContainerElement?: () => HTMLElement | null;
  getInstance?: () => { render: (immediate?: boolean) => void } | undefined;
};

function getCodeViewScrollRoot<T>(
  viewer: CodeViewLayoutHandle<T> | null,
  host: HTMLDivElement | null,
): HTMLElement | null {
  return viewer?.getContainerElement?.() ?? host;
}

/** Wake Pierre's virtualizer after the overlay iframe becomes visible (IntersectionObserver can miss the first paint). */
export function kickCodeViewLayout<T>(
  viewer: CodeViewLayoutHandle<T> | null,
  host: HTMLDivElement | null,
): void {
  const container = getCodeViewScrollRoot(viewer, host);
  if (container) {
    void container.offsetHeight;
    container.dispatchEvent(new Event('resize'));
    const scrollTop = container.scrollTop;
    if (container.scrollHeight > container.clientHeight) {
      container.scrollTop = scrollTop + 1;
      container.scrollTop = scrollTop;
    } else {
      container.scrollTop = 1;
      container.scrollTop = 0;
    }
  }

  viewer?.getInstance?.()?.render(true);
}

export function useCodeViewLayoutRefresh<T>(
  viewerRef: RefObject<CodeViewHandle<T> | null>,
  hostRef: RefObject<HTMLDivElement | null>,
  deps: readonly unknown[],
) {
  const containerRef = useCallback((_node: HTMLDivElement | null) => {
    // Pierre CodeView manages scroll container lifecycle and resize observation.
  }, []);

  const refresh = useCallback(() => {
    kickCodeViewLayout(viewerRef.current as CodeViewLayoutHandle<T> | null, hostRef.current);
  }, [hostRef, viewerRef]);

  useEffect(() => {
    refresh();
  }, [refresh, ...deps]);

  return { containerRef, refresh };
}

const HOST_READY_FALLBACK_MS = 300;
const HOST_READY_RAF_FRAMES = 5;

export function useCodeViewHostReady(hostRef: RefObject<HTMLDivElement | null>): boolean {
  const [isReady, setIsReady] = useState(false);

  useLayoutEffect(() => {
    setIsReady(false);
    const host = hostRef.current;
    if (!host) {
      return;
    }

    let cancelled = false;
    let observer: ResizeObserver | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let rafId = 0;

    const markReadyIfSized = () => {
      if (cancelled) {
        return true;
      }

      if (host.getBoundingClientRect().height > 0) {
        setIsReady(true);
        observer?.disconnect();
        observer = null;
        if (fallbackTimer != null) {
          clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
        return true;
      }

      return false;
    };

    const scheduleRafChecks = (framesLeft: number) => {
      if (framesLeft <= 0 || markReadyIfSized()) {
        return;
      }

      rafId = requestAnimationFrame(() => {
        scheduleRafChecks(framesLeft - 1);
      });
    };

    const onLayoutKick = () => {
      markReadyIfSized();
      scheduleRafChecks(HOST_READY_RAF_FRAMES);
    };

    if (markReadyIfSized()) {
      return;
    }

    observer = new ResizeObserver(() => {
      markReadyIfSized();
    });
    observer.observe(host);

    window.addEventListener(OVERLAY_LAYOUT_KICK_EVENT, onLayoutKick);
    scheduleRafChecks(HOST_READY_RAF_FRAMES);
    fallbackTimer = setTimeout(() => {
      if (!cancelled) {
        setIsReady(true);
      }
    }, HOST_READY_FALLBACK_MS);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      observer?.disconnect();
      if (fallbackTimer != null) {
        clearTimeout(fallbackTimer);
      }
      window.removeEventListener(OVERLAY_LAYOUT_KICK_EVENT, onLayoutKick);
    };
  }, [hostRef]);

  return isReady;
}
