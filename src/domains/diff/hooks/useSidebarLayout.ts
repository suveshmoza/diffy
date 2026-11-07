import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';

import {
  clampSidebarWidth,
  DEFAULT_DIFF_LAYOUT,
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  readDiffLayoutPreference,
  readSidebarWidthPreference,
  writeDiffLayoutPreference,
  writeSidebarWidthPreference,
  type DiffLayout,
} from '@/domains/diff/prefs/layout-prefs';

export function useSidebarLayout(): {
  diffLayout: DiffLayout;
  sidebarWidth: number;
  activeSidebarWidth: number;
  isResizingSidebar: boolean;
  layoutGridRef: RefObject<HTMLDivElement | null>;
  updateDiffLayout: (nextLayout: DiffLayout) => void;
  handleSidebarResizePointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  handleSidebarResizePointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  handleSidebarResizePointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  handleSidebarResizeKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
} {
  const [diffLayout, setDiffLayout] = useState<DiffLayout>(DEFAULT_DIFF_LAYOUT);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [sidebarDragWidth, setSidebarDragWidth] = useState<number | null>(null);
  const layoutGridRef = useRef<HTMLDivElement>(null);
  const sidebarWidthRef = useRef(sidebarWidth);
  const isSidebarResizingRef = useRef(false);
  const activeSidebarWidth = sidebarDragWidth ?? sidebarWidth;
  const isResizingSidebar = sidebarDragWidth != null;

  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  useEffect(() => {
    let isCancelled = false;

    readDiffLayoutPreference()
      .then((storedLayout) => {
        if (!isCancelled) {
          setDiffLayout(storedLayout);
        }
      })
      .catch(() => {
        // Ignore preference read failures and keep the default layout.
      });

    readSidebarWidthPreference()
      .then((storedWidth) => {
        if (!isCancelled) {
          setSidebarWidth(storedWidth);
        }
      })
      .catch(() => {
        // Ignore preference read failures and keep the default sidebar width.
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const updateDiffLayout = useCallback((nextLayout: DiffLayout) => {
    setDiffLayout(nextLayout);
    void writeDiffLayoutPreference(nextLayout);
  }, []);

  const persistSidebarWidth = useCallback((width: number) => {
    void writeSidebarWidthPreference(width);
  }, []);

  const clampSidebarWidthForLayout = useCallback((width: number) => {
    const layout = layoutGridRef.current;
    const maxForLayout =
      layout != null
        ? Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, layout.clientWidth - 320))
        : MAX_SIDEBAR_WIDTH;
    return Math.min(maxForLayout, clampSidebarWidth(width));
  }, []);

  const handleSidebarResizePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    isSidebarResizingRef.current = true;
    setSidebarDragWidth(sidebarWidthRef.current);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handleSidebarResizePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        return;
      }

      const layout = layoutGridRef.current;
      if (!layout) {
        return;
      }

      const nextWidth = clampSidebarWidthForLayout(
        event.clientX - layout.getBoundingClientRect().left,
      );
      sidebarWidthRef.current = nextWidth;
      setSidebarDragWidth(nextWidth);
    },
    [clampSidebarWidthForLayout],
  );

  const handleSidebarResizePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      if (!isSidebarResizingRef.current) {
        return;
      }

      isSidebarResizingRef.current = false;
      const nextWidth = sidebarWidthRef.current;
      setSidebarWidth(nextWidth);
      setSidebarDragWidth(null);
      persistSidebarWidth(nextWidth);
    },
    [persistSidebarWidth],
  );

  const handleSidebarResizeKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
        return;
      }

      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 16 : -16;
      const nextWidth = clampSidebarWidthForLayout(sidebarWidthRef.current + delta);
      sidebarWidthRef.current = nextWidth;
      setSidebarWidth(nextWidth);
      persistSidebarWidth(nextWidth);
    },
    [clampSidebarWidthForLayout, persistSidebarWidth],
  );

  return {
    diffLayout,
    sidebarWidth,
    activeSidebarWidth,
    isResizingSidebar,
    layoutGridRef,
    updateDiffLayout,
    handleSidebarResizePointerDown,
    handleSidebarResizePointerMove,
    handleSidebarResizePointerUp,
    handleSidebarResizeKeyDown,
  };
}
