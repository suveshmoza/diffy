import type { CodeViewHandle } from '@pierre/diffs/react';
import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from 'react';

import { OVERLAY_LAYOUT_KICK_EVENT } from '@/lib/overlay/messages';

type CodeViewLayoutHandle<T> = CodeViewHandle<T, undefined> & {
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
  viewerRef: RefObject<CodeViewHandle<T, undefined> | null>,
  hostRef: RefObject<HTMLDivElement | null>,
  layoutKey: unknown,
) {
  const containerRef = useCallback((_node: HTMLDivElement | null) => {
    // Pierre CodeView manages scroll container lifecycle and resize observation.
  }, []);

  const refresh = useCallback(() => {
    kickCodeViewLayout(viewerRef.current, hostRef.current);
  }, [hostRef, viewerRef]);

  useEffect(() => {
    refresh();
    // layoutKey is an intentional invalidation token; refresh reads refs that need not be effect deps.
    // oxlint-disable-next-line react-hooks/exhaustive-deps, react/exhaustive-effect-dependencies
  }, [layoutKey, refresh]);

  return { containerRef, refresh };
}

const HOST_READY_FALLBACK_MS = 300;
const HOST_READY_RAF_FRAMES = 5;

export function useCodeViewHostReady(hostRef: RefObject<HTMLDivElement | null>): boolean {
  const [isReady, setIsReady] = useState(false);

  useLayoutEffect(() => {
    const currentHost = hostRef.current;

    if (!currentHost) {
      return;
    }

    const lifecycle = {
      cancelled: false,
      observer: null as ResizeObserver | null,
      fallbackTimer: null as ReturnType<typeof setTimeout> | null,
      rafId: 0,
    };

    const markReadyIfSized = () => {
      if (lifecycle.cancelled) {
        return true;
      }

      if (currentHost.getBoundingClientRect().height > 0) {
        setIsReady(true);

        lifecycle.observer?.disconnect();
        lifecycle.observer = null;

        if (lifecycle.fallbackTimer != null) {
          clearTimeout(lifecycle.fallbackTimer);
          lifecycle.fallbackTimer = null;
        }

        return true;
      }

      return false;
    };

    const scheduleRafChecks = (framesLeft: number) => {
      if (framesLeft <= 0 || markReadyIfSized()) {
        return;
      }

      lifecycle.rafId = requestAnimationFrame(() => {
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

    lifecycle.observer = new ResizeObserver(() => {
      markReadyIfSized();
    });

    lifecycle.observer.observe(currentHost);

    window.addEventListener(OVERLAY_LAYOUT_KICK_EVENT, onLayoutKick);

    scheduleRafChecks(HOST_READY_RAF_FRAMES);

    lifecycle.fallbackTimer = setTimeout(() => {
      if (!lifecycle.cancelled) {
        setIsReady(true);
      }
    }, HOST_READY_FALLBACK_MS);

    return () => {
      lifecycle.cancelled = true;

      cancelAnimationFrame(lifecycle.rafId);
      lifecycle.observer?.disconnect();

      if (lifecycle.fallbackTimer != null) {
        clearTimeout(lifecycle.fallbackTimer);
      }

      window.removeEventListener(OVERLAY_LAYOUT_KICK_EVENT, onLayoutKick);
    };
  }, [hostRef]);

  return isReady;
}
