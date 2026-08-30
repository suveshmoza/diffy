import { IconMagnifyingGlassFocus, IconMinus, IconPlus, IconX } from '@pierre/icons';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type WheelEvent,
} from 'react';

import { SegmentedControl } from '@/components/diff/header/SegmentedControl';
import { IconChevronLeft, IconChevronRight } from '@/components/icons/Chevron';
import { useImageDiffSources } from '@/hooks/useImageDiffSources';
import type { ImageCompareMode } from '@/lib/diff/display-prefs';
import type { ImageDiffSideSource } from '@/lib/diff/image-diff-cache';
import { formatDimensions, formatImageBytes, getResizeDelta } from '@/lib/diff/image-diff-meta';
import { formatFileChangeStatus } from '@/lib/diff/media-files';
import type {
  GitHubPullRequest,
  GitHubPullRequestFile,
  GitHubPullRequestRef,
} from '@/lib/github/api';

const MODE_OPTIONS = [
  { value: '2up' as const, label: '2-up' },
  { value: 'swipe' as const, label: 'Swipe' },
  { value: 'onion' as const, label: 'Onion' },
];

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;
const ZOOM_STEP = 0.25;

type TransformState = {
  zoom: number;
  panX: number;
  panY: number;
};

const INITIAL_TRANSFORM: TransformState = {
  zoom: 1,
  panX: 0,
  panY: 0,
};

type ImageDiffLightboxProps = {
  file: GitHubPullRequestFile;
  imageFiles: readonly GitHubPullRequestFile[];
  pullRequest: GitHubPullRequest;
  pullRequestRef: GitHubPullRequestRef;
  mode: ImageCompareMode;
  checkerboard: boolean;
  onModeChange: (mode: ImageCompareMode) => void;
  onCheckerboardChange: (checkerboard: boolean) => void;
  onNavigate: (path: string) => void;
  onClose: () => void;
};

export function ImageDiffLightbox({
  file,
  imageFiles,
  pullRequest,
  pullRequestRef,
  mode,
  checkerboard,
  onModeChange,
  onCheckerboardChange,
  onNavigate,
  onClose,
}: ImageDiffLightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const [transform, setTransform] = useState<TransformState>(INITIAL_TRANSFORM);
  const [swipePosition, setSwipePosition] = useState(50);
  const [onionOpacity, setOnionOpacity] = useState(50);
  const [blinkActive, setBlinkActive] = useState(false);
  const [blinkAfter, setBlinkAfter] = useState(true);
  const [animationsPlaying, setAnimationsPlaying] = useState(true);

  const sources = useImageDiffSources({
    file,
    pullRequest,
    pullRequestRef,
    enabled: true,
    pane: 'only',
  });

  const currentIndex = imageFiles.findIndex((candidate) => candidate.filename === file.filename);
  const previousFile = currentIndex > 0 ? imageFiles[currentIndex - 1] : null;
  const nextFile =
    currentIndex >= 0 && currentIndex < imageFiles.length - 1 ? imageFiles[currentIndex + 1] : null;
  const hasBoth = sources.before != null && sources.after != null;
  const resizeDelta = getResizeDelta(sources.before, sources.after);
  const primarySource = sources.after ?? sources.before;
  const hasAnimatedSource =
    isAnimatedMimeType(sources.before?.mimeType) || isAnimatedMimeType(sources.after?.mimeType);

  const sourceSummary = useMemo(() => {
    const parts: string[] = [];
    if (sources.before) {
      parts.push(
        `Before ${formatDimensions(sources.before.width, sources.before.height)} · ${formatImageBytes(sources.before.size)}`,
      );
    }
    if (sources.after) {
      parts.push(
        `After ${formatDimensions(sources.after.width, sources.after.height)} · ${formatImageBytes(sources.after.size)}`,
      );
    }
    return parts.join('  |  ');
  }, [sources.after, sources.before]);

  const resetTransform = useCallback(() => {
    setTransform(INITIAL_TRANSFORM);
  }, []);

  const [prevFilename, setPrevFilename] = useState(file.filename);
  if (file.filename !== prevFilename) {
    setPrevFilename(file.filename);
    setTransform(INITIAL_TRANSFORM);
    setSwipePosition(50);
    setOnionOpacity(50);
    setBlinkActive(false);
    setBlinkAfter(true);
    setAnimationsPlaying(true);
  }

  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true });
  }, [file.filename]);

  const setZoom = useCallback((nextZoom: number) => {
    setTransform((current) => ({
      ...current,
      zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom)),
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
      zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, primarySource.width / renderedWidth)),
      panX: 0,
      panY: 0,
    });
  }, [primarySource, transform.zoom]);

  const handleWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      const direction = event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
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
        const modeIndex = MODE_OPTIONS.findIndex((option) => option.value === mode);
        onModeChange(MODE_OPTIONS[(modeIndex + 1) % MODE_OPTIONS.length]?.value ?? '2up');
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

  const stageProps = {
    transform,
    checkerboard,
    onWheel: handleWheel,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp,
  };

  return (
    <div
      className='gprv-image-lightbox-backdrop'
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className='gprv-image-lightbox'
        role='dialog'
        aria-modal='true'
        aria-label={`Image comparison for ${file.filename}`}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <header className='gprv-image-lightbox-header'>
          <div className='gprv-image-lightbox-heading'>
            <strong>{file.filename}</strong>
            <span>{formatFileChangeStatus(file.status)}</span>
            {resizeDelta?.changed ? (
              <span className='gprv-image-diff-resized'>
                Resized {resizeDelta.from} → {resizeDelta.to}
              </span>
            ) : null}
          </div>
          <div className='gprv-image-lightbox-meta'>{sourceSummary}</div>
          <button
            type='button'
            className='gprv-image-lightbox-icon-button'
            aria-label='Close image comparison'
            title='Close (Esc)'
            onClick={onClose}
          >
            <IconX size={18} />
          </button>
        </header>

        <div className='gprv-image-lightbox-toolbar'>
          {hasBoth ? (
            <SegmentedControl
              ariaLabel='Image comparison mode'
              options={MODE_OPTIONS}
              value={mode}
              onChange={(nextMode) => {
                setBlinkActive(false);
                onModeChange(nextMode);
              }}
            />
          ) : null}
          {hasAnimatedSource ? (
            <button
              type='button'
              className='gprv-image-lightbox-text-button'
              aria-pressed={!animationsPlaying}
              onClick={() => setAnimationsPlaying((current) => !current)}
            >
              {animationsPlaying ? 'Pause animation' : 'Play animation'}
            </button>
          ) : null}
          <div
            className='gprv-image-lightbox-zoom'
            role='group'
            aria-label='Image zoom'
          >
            <button
              type='button'
              className='gprv-image-lightbox-icon-button'
              aria-label='Zoom out'
              onClick={() => setZoom(transform.zoom - ZOOM_STEP)}
            >
              <IconMinus size={17} />
            </button>
            <span>{Math.round(transform.zoom * 100)}%</span>
            <button
              type='button'
              className='gprv-image-lightbox-icon-button'
              aria-label='Zoom in'
              onClick={() => setZoom(transform.zoom + ZOOM_STEP)}
            >
              <IconPlus size={17} />
            </button>
            <button
              type='button'
              className='gprv-image-lightbox-icon-button'
              aria-label='Fit image'
              title='Fit'
              onClick={resetTransform}
            >
              <IconMagnifyingGlassFocus size={17} />
            </button>
            <button
              type='button'
              className='gprv-image-lightbox-text-button'
              onClick={handleActualSize}
            >
              1:1
            </button>
          </div>
          <label className='gprv-image-lightbox-checkerboard'>
            <input
              type='checkbox'
              checked={checkerboard}
              onChange={(event) => onCheckerboardChange(event.target.checked)}
            />
            Checkerboard
          </label>
          {hasBoth ? (
            <button
              type='button'
              className='gprv-image-lightbox-text-button'
              aria-pressed={blinkActive}
              title='Toggle before/after (Space)'
              onClick={() => {
                setBlinkActive(true);
                setBlinkAfter((current) => !current);
              }}
            >
              Blink: {blinkAfter ? 'after' : 'before'}
            </button>
          ) : null}
        </div>

        <main className='gprv-image-lightbox-content'>
          {sources.status === 'loading' || sources.status === 'idle' ? (
            <div
              className='gprv-media-panel-body-centered'
              role='status'
            >
              Loading media…
            </div>
          ) : null}
          {sources.status === 'error' ? (
            <div className='gprv-media-panel-body-centered'>
              {sources.error ?? 'Failed to load image.'}
            </div>
          ) : null}
          {sources.status === 'ready' && primarySource ? (
            <>
              {!hasBoth ? (
                <ImageStage
                  {...stageProps}
                  source={primarySource}
                  primary
                  animationsPlaying={animationsPlaying}
                />
              ) : null}
              {hasBoth && blinkActive ? (
                <ImageStage
                  {...stageProps}
                  source={blinkAfter ? sources.after! : sources.before!}
                  primary
                  animationsPlaying={animationsPlaying}
                />
              ) : null}
              {hasBoth && !blinkActive && mode === '2up' ? (
                <div className='gprv-image-lightbox-two-up'>
                  <ImageStage
                    {...stageProps}
                    source={sources.before!}
                    label='Before'
                    animationsPlaying={animationsPlaying}
                  />
                  <ImageStage
                    {...stageProps}
                    source={sources.after!}
                    label='After'
                    primary
                    animationsPlaying={animationsPlaying}
                  />
                </div>
              ) : null}
              {hasBoth && !blinkActive && mode === 'swipe' ? (
                <OverlayStage
                  {...stageProps}
                  before={sources.before!}
                  after={sources.after!}
                  animationsPlaying={animationsPlaying}
                  topClip={swipePosition}
                >
                  <div
                    role='slider'
                    tabIndex={0}
                    className='gprv-image-lightbox-swipe-handle'
                    aria-label='Swipe position'
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(swipePosition)}
                    style={{ left: `${swipePosition}%` }}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={(event) => {
                      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
                        return;
                      }
                      const stage = event.currentTarget.parentElement;
                      if (!stage) {
                        return;
                      }
                      const rect = stage.getBoundingClientRect();
                      const position = ((event.clientX - rect.left) / rect.width) * 100;
                      setSwipePosition(Math.min(100, Math.max(0, position)));
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
                        return;
                      }
                      event.preventDefault();
                      event.stopPropagation();
                      setSwipePosition((current) =>
                        Math.min(100, Math.max(0, current + (event.key === 'ArrowRight' ? 1 : -1))),
                      );
                    }}
                  >
                    <span className='gprv-image-lightbox-swipe-divider' />
                  </div>
                </OverlayStage>
              ) : null}
              {hasBoth && !blinkActive && mode === 'onion' ? (
                <div className='gprv-image-lightbox-onion-layout'>
                  <OverlayStage
                    {...stageProps}
                    before={sources.before!}
                    after={sources.after!}
                    animationsPlaying={animationsPlaying}
                    topOpacity={onionOpacity / 100}
                  />
                  <label className='gprv-image-lightbox-opacity'>
                    Blend
                    <input
                      type='range'
                      min={0}
                      max={100}
                      value={onionOpacity}
                      onChange={(event) => setOnionOpacity(Number(event.target.value))}
                    />
                    <span>{onionOpacity}%</span>
                  </label>
                </div>
              ) : null}
            </>
          ) : null}
        </main>

        <footer className='gprv-image-lightbox-footer'>
          <button
            type='button'
            className='gprv-image-lightbox-nav'
            disabled={!previousFile}
            onClick={() => previousFile && onNavigate(previousFile.filename)}
          >
            <IconChevronLeft size={18} />
            Previous image
          </button>
          <span>
            {currentIndex + 1} / {imageFiles.length}
          </span>
          <button
            type='button'
            className='gprv-image-lightbox-nav'
            disabled={!nextFile}
            onClick={() => nextFile && onNavigate(nextFile.filename)}
          >
            Next image
            <IconChevronRight size={18} />
          </button>
        </footer>
      </div>
    </div>
  );
}

type StageInteractionProps = {
  transform: TransformState;
  checkerboard: boolean;
  onWheel: (event: WheelEvent<HTMLDivElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
};

type ImageStageProps = StageInteractionProps & {
  source: ImageDiffSideSource;
  label?: string;
  primary?: boolean;
  animationsPlaying: boolean;
};

function ImageStage({
  source,
  label,
  primary = false,
  animationsPlaying,
  transform,
  checkerboard,
  ...interactionProps
}: ImageStageProps) {
  return (
    <figure className='gprv-image-lightbox-pane'>
      {label ? <figcaption>{label}</figcaption> : null}
      <div
        className='gprv-image-lightbox-stage'
        data-checkerboard={checkerboard ? '' : undefined}
        {...interactionProps}
      >
        <PausableMedia
          source={source}
          alt={label ? `${source.path} (${label.toLowerCase()})` : source.path}
          playing={animationsPlaying}
          primary={primary}
          style={{
            transform: `translate(${transform.panX}px, ${transform.panY}px) scale(${transform.zoom})`,
          }}
        />
      </div>
    </figure>
  );
}

type OverlayStageProps = StageInteractionProps & {
  before: ImageDiffSideSource;
  after: ImageDiffSideSource;
  animationsPlaying: boolean;
  topClip?: number;
  topOpacity?: number;
  children?: ReactNode;
};

function OverlayStage({
  before,
  after,
  animationsPlaying,
  transform,
  checkerboard,
  topClip,
  topOpacity,
  children,
  ...interactionProps
}: OverlayStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    const updateSize = () => {
      setStageSize({ width: stage.clientWidth, height: stage.clientHeight });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  // Scale both images by the SAME factor into a shared "union" frame so that
  // matching pixels line up regardless of differing dimensions. Each image is
  // pinned to the frame's top-left, keeping before/after registered.
  const unionWidth = Math.max(before.width, after.width, 1);
  const unionHeight = Math.max(before.height, after.height, 1);
  const scale =
    stageSize.width > 0 && stageSize.height > 0
      ? Math.min(stageSize.width / unionWidth, stageSize.height / unionHeight)
      : 0;
  const measured = scale > 0;

  const frameStyle: CSSProperties = {
    height: measured ? unionHeight * scale : undefined,
    transform: `translate(${transform.panX}px, ${transform.panY}px) scale(${transform.zoom})`,
    visibility: measured ? undefined : 'hidden',
    width: measured ? unionWidth * scale : undefined,
  };
  const beforeStyle: CSSProperties = {
    height: before.height * scale,
    width: before.width * scale,
  };
  const afterStyle: CSSProperties = {
    height: after.height * scale,
    width: after.width * scale,
  };

  const isSwipe = topClip != null;
  const isOnion = topOpacity != null;

  const beforeMedia = (
    <div
      className='gprv-image-lightbox-overlay-frame'
      style={frameStyle}
    >
      <PausableMedia
        source={before}
        alt={`${before.path} (before)`}
        playing={animationsPlaying}
        className='gprv-image-lightbox-overlay-media'
        style={beforeStyle}
      />
    </div>
  );

  const afterMedia = (
    <div
      className='gprv-image-lightbox-overlay-frame'
      style={frameStyle}
    >
      <PausableMedia
        source={after}
        alt={`${after.path} (after)`}
        playing={animationsPlaying}
        primary
        className='gprv-image-lightbox-overlay-media'
        style={afterStyle}
      />
    </div>
  );

  return (
    <div
      ref={stageRef}
      className='gprv-image-lightbox-stage gprv-image-lightbox-overlay-stage'
      data-checkerboard={checkerboard ? '' : undefined}
      {...interactionProps}
    >
      {isSwipe ? (
        <>
          {/* After fills the stage; before covers the left and is width-clipped
              so its right edge is exactly at topClip% — same as the handle. */}
          <div className='gprv-image-lightbox-overlay-layer'>{afterMedia}</div>
          <div
            className='gprv-image-lightbox-overlay-layer gprv-image-lightbox-swipe-before'
            style={{ width: `${topClip}%` }}
          >
            <div
              className='gprv-image-lightbox-swipe-slot'
              style={
                stageSize.width > 0
                  ? { height: stageSize.height, width: stageSize.width }
                  : undefined
              }
            >
              {beforeMedia}
            </div>
          </div>
        </>
      ) : (
        <>
          <div
            className='gprv-image-lightbox-overlay-layer'
            style={isOnion ? { opacity: 1 - (topOpacity ?? 0) } : undefined}
          >
            {beforeMedia}
          </div>
          <div
            className='gprv-image-lightbox-overlay-layer'
            style={isOnion ? { opacity: topOpacity } : undefined}
          >
            {afterMedia}
          </div>
        </>
      )}
      {children}
    </div>
  );
}

type PausableMediaProps = {
  source: ImageDiffSideSource;
  alt: string;
  playing: boolean;
  primary?: boolean;
  className?: string;
  style?: CSSProperties;
};

function PausableMedia({
  source,
  alt,
  playing,
  primary = false,
  className,
  style,
}: PausableMediaProps) {
  const animated = isAnimatedMimeType(source.mimeType);
  if (!animated || playing) {
    return (
      <img
        src={source.url}
        alt={alt}
        className={className}
        data-primary-media={primary ? '' : undefined}
        draggable={false}
        style={style}
      />
    );
  }

  return (
    <FrozenImage
      source={source}
      label={alt}
      primary={primary}
      className={className}
      style={style}
    />
  );
}

type FrozenImageProps = {
  source: ImageDiffSideSource;
  label: string;
  primary: boolean;
  className?: string;
  style?: CSSProperties;
};

function FrozenImage({ source, label, primary, className, style }: FrozenImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const response = await fetch(source.url);
      const bitmap = await createImageBitmap(await response.blob());
      if (cancelled) {
        bitmap.close();
        return;
      }
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (canvas && context) {
        canvas.width = source.width;
        canvas.height = source.height;
        context.drawImage(bitmap, 0, 0);
      }
      bitmap.close();
    })().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [source.height, source.url, source.width]);

  return (
    <canvas
      ref={canvasRef}
      aria-label={`${label}, animation paused`}
      className={className}
      data-primary-media={primary ? '' : undefined}
      role='img'
      style={style}
    />
  );
}

function isAnimatedMimeType(mimeType: string | undefined): boolean {
  return mimeType === 'image/gif' || mimeType === 'image/webp';
}
