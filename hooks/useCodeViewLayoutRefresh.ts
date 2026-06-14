import type { CodeViewHandle } from '@pierre/diffs/react';
import { useCallback, useLayoutEffect, useState, type RefObject } from 'react';

export function useCodeViewLayoutRefresh<T>(
  _viewerRef: RefObject<CodeViewHandle<T> | null>,
  _hostRef: RefObject<HTMLDivElement | null>,
  _deps: readonly unknown[],
) {
  const containerRef = useCallback((_node: HTMLDivElement | null) => {
    // Pierre CodeView manages scroll container lifecycle and resize observation.
  }, []);

  const refresh = useCallback(() => {
    // Layout is handled by @pierre/diffs once the host is sized at mount time.
  }, []);

  return { containerRef, refresh };
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
