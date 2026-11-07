import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
  type WheelEvent,
} from 'react';

import type { ImageDiffSideSource } from '@/domains/diff/media/image-diff-cache';
import type { ImageCompareMode } from '@/domains/diff/prefs/display-prefs';
import type { GitHubPullRequestFile } from '@/domains/github/api';

export const IMAGE_LIGHTBOX_MODE_OPTIONS = [
  { value: '2up' as const, label: '2-up' },
  { value: 'swipe' as const, label: 'Swipe' },
  { value: 'onion' as const, label: 'Onion' },
];

export const IMAGE_LIGHTBOX_MIN_ZOOM = 0.25;
export const IMAGE_LIGHTBOX_MAX_ZOOM = 8;
export const IMAGE_LIGHTBOX_ZOOM_STEP = 0.25;

export type ImageLightboxTransform = {
  zoom: number;
  panX: number;
  panY: number;
};

const INITIAL_TRANSFORM: ImageLightboxTransform = {
  zoom: 1,
  panX: 0,
  panY: 0,
};

type UseImageLightboxParams = {
  mode: ImageCompareMode;
  hasBoth: boolean;
  primarySource: ImageDiffSideSource | null | undefined;
  previousFile: GitHubPullRequestFile | null | undefined;
  nextFile: GitHubPullRequestFile | null | undefined;
  onModeChange: (mode: ImageCompareMode) => void;
  onNavigate: (path: string) => void;
  onClose: () => void;
};

export function useImageLightbox({
  mode,
  hasBoth,
  primarySource,
  previousFile,
  nextFile,
  onModeChange,
  onNavigate,
  onClose,
}: UseImageLightboxParams): {
  dialogRef: RefObject<HTMLDivElement | null>;
  transform: ImageLightboxTransform;
  swipePosition: number;
  setSwipePosition: (value: number | ((current: number) => number)) => void;
  onionOpacity: number;
  setOnionOpacity: (value: number) => void;
  blinkActive: boolean;
  setBlinkActive: (value: boolean) => void;
  blinkAfter: boolean;
  setBlinkAfter: (value: boolean | ((current: boolean) => boolean)) => void;
  animationsPlaying: boolean;
  setAnimationsPlaying: (value: boolean | ((current: boolean) => boolean)) => void;
  setZoom: (nextZoom: number) => void;
  resetTransform: () => void;
  handleActualSize: () => void;
  handleWheel: (event: WheelEvent<HTMLDivElement>) => void;
  handlePointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  zoomStep: number;
} {
  const dialogRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const [transform, setTransform] = useState<ImageLightboxTransform>(INITIAL_TRANSFORM);
  const [swipePosition, setSwipePosition] = useState(50);
  const [onionOpacity, setOnionOpacity] = useState(50);
  const [blinkActive, setBlinkActive] = useState(false);
  const [blinkAfter, setBlinkAfter] = useState(true);
  const [animationsPlaying, setAnimationsPlaying] = useState(true);

  const resetTransform = useCallback(() => {
    setTransform(INITIAL_TRANSFORM);
  }, []);

  useLayoutEffect(() => {
    dialogRef.current?.focus({ preventScroll: true });
  }, []);

  const setZoom = useCallback((nextZoom: number) => {
    setTransform((current) => ({
      ...current,
      zoom: Math.min(IMAGE_LIGHTBOX_MAX_ZOOM, Math.max(IMAGE_LIGHTBOX_MIN_ZOOM, nextZoom)),
    }));
  }, []);

  const handleActualSize = useCallback(() => {
    const media = dialogRef.current?.querySelector<HTMLElement>('[data-primary-media]');
    if (!media || !primarySource) {
      return;
    }
    const renderedWidth = media.getBoundingClientRect().width / transform.zoom;
    if (renderedWidth === 0) {
      return;
    }
    setTransform({
      zoom: Math.min(
        IMAGE_LIGHTBOX_MAX_ZOOM,
        Math.max(IMAGE_LIGHTBOX_MIN_ZOOM, primarySource.width / renderedWidth),
      ),
      panX: 0,
      panY: 0,
    });
  }, [primarySource, transform.zoom]);

  const handleWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      const direction = event.deltaY < 0 ? IMAGE_LIGHTBOX_ZOOM_STEP : -IMAGE_LIGHTBOX_ZOOM_STEP;
      setZoom(transform.zoom + direction);
    },
    [setZoom, transform.zoom],
  );

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.panning = '';
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    setTransform((current) => ({
      ...current,
      panX: current.panX + deltaX,
      panY: current.panY + deltaY,
    }));
  }, []);

  const handlePointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) {
      return;
    }
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    delete event.currentTarget.dataset.panning;
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      event.stopPropagation();
      const target = event.target;
      const isFormControl =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;

      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowLeft' && previousFile) {
        if (isFormControl) {
          return;
        }
        event.preventDefault();
        onNavigate(previousFile.filename);
        return;
      }
      if (event.key === 'ArrowRight' && nextFile) {
        if (isFormControl) {
          return;
        }
        event.preventDefault();
        onNavigate(nextFile.filename);
        return;
      }
      if (event.key.toLowerCase() === 'm' && hasBoth) {
        event.preventDefault();
        setBlinkActive(false);
        const modeIndex = IMAGE_LIGHTBOX_MODE_OPTIONS.findIndex((option) => option.value === mode);
        onModeChange(
          IMAGE_LIGHTBOX_MODE_OPTIONS[(modeIndex + 1) % IMAGE_LIGHTBOX_MODE_OPTIONS.length]
            ?.value ?? '2up',
        );
        return;
      }
      if (event.key === ' ' && hasBoth) {
        if (isFormControl || target instanceof HTMLButtonElement) {
          return;
        }
        event.preventDefault();
        setBlinkActive(true);
        setBlinkAfter((current) => !current);
      }
    },
    [hasBoth, mode, nextFile, onClose, onModeChange, onNavigate, previousFile],
  );

  return {
    dialogRef,
    transform,
    swipePosition,
    setSwipePosition,
    onionOpacity,
    setOnionOpacity,
    blinkActive,
    setBlinkActive,
    blinkAfter,
    setBlinkAfter,
    animationsPlaying,
    setAnimationsPlaying,
    setZoom,
    resetTransform,
    handleActualSize,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleKeyDown,
    zoomStep: IMAGE_LIGHTBOX_ZOOM_STEP,
  };
}
