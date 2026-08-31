import { IconMagnifyingGlassFocus, IconMinus, IconPlus, IconX } from '@pierre/icons';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { cn } from '@/lib/utils';

const MODE_OPTIONS = [
  { value: '2up' as const, label: '2-up' },
  { value: 'swipe' as const, label: 'Swipe' },
  { value: 'onion' as const, label: 'Onion' },
];

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;
const ZOOM_STEP = 0.25;

const LIGHTBOX_CHECKERBOARD =
  'data-checkerboard:bg-background data-checkerboard:[background-image:linear-gradient(45deg,color-mix(in_srgb,var(--foreground)_8%,transparent)_25%,transparent_25%),linear-gradient(-45deg,color-mix(in_srgb,var(--foreground)_8%,transparent)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,color-mix(in_srgb,var(--foreground)_8%,transparent)_75%),linear-gradient(-45deg,transparent_75%,color-mix(in_srgb,var(--foreground)_8%,transparent)_75%)] data-checkerboard:[background-position:0_0,0_10px,10px_-10px,-10px_0] data-checkerboard:[background-size:20px_20px]';

const OVERLAY_MEDIA_CLASS =
  'pointer-events-none absolute top-0 left-0 block max-h-none max-w-none object-fill';

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
  }, [setTransform]);

  useLayoutEffect(() => {
    dialogRef.current?.focus({ preventScroll: true });
  }, []);

  const setZoom = useCallback(
    (nextZoom: number) => {
      setTransform((current) => ({
        ...current,
        zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom)),
      }));
    },
    [setTransform],
  );

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

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
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
    },
    [setTransform],
  );

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
    [
      hasBoth,
      mode,
      nextFile,
      onClose,
      onModeChange,
      onNavigate,
      previousFile,
      setBlinkActive,
      setBlinkAfter,
    ],
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
      className='absolute inset-0 z-120 flex items-stretch bg-black/72 p-4.5 max-[720px]:p-0'
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className='grid min-h-0 w-full grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden rounded-xl border border-border bg-muted shadow-[0_24px_80px_rgb(0_0_0/0.42)] outline-none max-[720px]:rounded-none max-[720px]:border-0'
        role='dialog'
        aria-modal='true'
        aria-label={`Image comparison for ${file.filename}`}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <header className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.75 border-b border-border px-4 py-2.5 pr-3'>
          <div className='flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.75'>
            <strong className='min-w-0 truncate text-[13px] text-foreground'>
              {file.filename}
            </strong>
            <span className='text-[11px] text-muted-foreground'>
              {formatFileChangeStatus(file.status)}
            </span>
            {resizeDelta?.changed ? (
              <Badge
                variant='outline'
                className='h-auto rounded-full border-primary/30 bg-primary/15 px-1.75 py-0.5 text-[11px] font-normal text-primary'
              >
                Resized {resizeDelta.from} → {resizeDelta.to}
              </Badge>
            ) : null}
          </div>
          <div className='col-start-1 overflow-hidden text-[11px] text-ellipsis whitespace-nowrap text-muted-foreground'>
            {sourceSummary}
          </div>
          <Button
            type='button'
            variant='outline'
            size='icon-sm'
            className='col-start-2 row-span-2 row-start-1'
            aria-label='Close image comparison'
            title='Close (Esc)'
            onClick={onClose}
          >
            <IconX size={18} />
          </Button>
        </header>

        <div className='flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-muted/70 px-3 py-1.75'>
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
            <Button
              type='button'
              variant='outline'
              size='xs'
              className='text-[11px]'
              aria-pressed={!animationsPlaying}
              onClick={() => setAnimationsPlaying((current) => !current)}
            >
              {animationsPlaying ? 'Pause animation' : 'Play animation'}
            </Button>
          ) : null}
          <div
            className='inline-flex items-center gap-1'
            role='group'
            aria-label='Image zoom'
          >
            <Button
              type='button'
              variant='outline'
              size='icon-sm'
              aria-label='Zoom out'
              onClick={() => setZoom(transform.zoom - ZOOM_STEP)}
            >
              <IconMinus size={17} />
            </Button>
            <span className='min-w-9.5 text-center text-[11px] text-muted-foreground'>
              {Math.round(transform.zoom * 100)}%
            </span>
            <Button
              type='button'
              variant='outline'
              size='icon-sm'
              aria-label='Zoom in'
              onClick={() => setZoom(transform.zoom + ZOOM_STEP)}
            >
              <IconPlus size={17} />
            </Button>
            <Button
              type='button'
              variant='outline'
              size='icon-sm'
              aria-label='Fit image'
              title='Fit'
              onClick={resetTransform}
            >
              <IconMagnifyingGlassFocus size={17} />
            </Button>
            <Button
              type='button'
              variant='outline'
              size='xs'
              className='text-[11px]'
              onClick={handleActualSize}
            >
              1:1
            </Button>
          </div>
          <Label className='ml-auto inline-flex items-center gap-1.5 text-[11px] font-normal text-muted-foreground max-[720px]:ml-0'>
            <input
              type='checkbox'
              checked={checkerboard}
              onChange={(event) => onCheckerboardChange(event.target.checked)}
            />
            Checkerboard
          </Label>
          {hasBoth ? (
            <Button
              type='button'
              variant='outline'
              size='xs'
              className='text-[11px]'
              aria-pressed={blinkActive}
              title='Toggle before/after (Space)'
              onClick={() => {
                setBlinkActive(true);
                setBlinkAfter((current) => !current);
              }}
            >
              Blink: {blinkAfter ? 'after' : 'before'}
            </Button>
          ) : null}
        </div>

        <main className='min-h-0 overflow-hidden bg-background p-3'>
          {sources.status === 'loading' || sources.status === 'idle' ? (
            <div
              className='flex min-h-full flex-col items-center justify-center text-center text-muted-foreground'
              role='status'
            >
              Loading media…
            </div>
          ) : null}
          {sources.status === 'error' ? (
            <div className='flex min-h-full flex-col items-center justify-center text-center text-muted-foreground'>
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
                <div className='grid h-full min-h-0 grid-cols-2 gap-3'>
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
                    className='absolute top-0 z-3 flex h-full w-8 -translate-x-1/2 cursor-ew-resize items-stretch justify-center border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring'
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
                    <span className='pointer-events-none relative h-full w-0.5 shrink-0 bg-foreground shadow-[0_0_0_1px_rgb(0_0_0/0.25)] after:absolute after:top-1/2 after:left-1/2 after:h-5.5 after:w-5.5 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:border-2 after:border-foreground after:bg-background after:content-[""]' />
                  </div>
                </OverlayStage>
              ) : null}
              {hasBoth && !blinkActive && mode === 'onion' ? (
                <div className='grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-2'>
                  <OverlayStage
                    {...stageProps}
                    before={sources.before!}
                    after={sources.after!}
                    animationsPlaying={animationsPlaying}
                    topOpacity={onionOpacity / 100}
                  />
                  <Label className='grid grid-cols-[auto_minmax(120px,320px)_36px] items-center justify-center gap-2 text-[11px] font-normal text-muted-foreground'>
                    Blend
                    <input
                      type='range'
                      min={0}
                      max={100}
                      value={onionOpacity}
                      onChange={(event) => setOnionOpacity(Number(event.target.value))}
                    />
                    <span>{onionOpacity}%</span>
                  </Label>
                </div>
              ) : null}
            </>
          ) : null}
        </main>

        <footer className='grid grid-cols-[1fr_auto_1fr] items-center border-t border-border px-3 py-1.75 text-[11px] text-muted-foreground'>
          <Button
            type='button'
            variant='outline'
            size='xs'
            className='justify-self-start text-[11px]'
            disabled={!previousFile}
            onClick={() => previousFile && onNavigate(previousFile.filename)}
          >
            <IconChevronLeft size={18} />
            Previous image
          </Button>
          <span>
            {currentIndex + 1} / {imageFiles.length}
          </span>
          <Button
            type='button'
            variant='outline'
            size='xs'
            className='justify-self-end text-[11px]'
            disabled={!nextFile}
            onClick={() => nextFile && onNavigate(nextFile.filename)}
          >
            Next image
            <IconChevronRight size={18} />
          </Button>
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
    <figure
      className={cn(
        'm-0 grid h-full min-h-0 min-w-0',
        label ? 'grid-rows-[auto_minmax(0,1fr)]' : 'grid-rows-[minmax(0,1fr)]',
      )}
    >
      {label ? (
        <figcaption className='pb-1.5 pl-0.5 text-[11px] text-muted-foreground'>{label}</figcaption>
      ) : null}
      <div
        className={cn(
          'relative flex h-full min-h-0 cursor-grab items-center justify-center overflow-hidden bg-muted touch-none select-none data-panning:cursor-grabbing',
          LIGHTBOX_CHECKERBOARD,
        )}
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
      className='relative shrink-0 origin-center will-change-transform'
      style={frameStyle}
    >
      <PausableMedia
        source={before}
        alt={`${before.path} (before)`}
        playing={animationsPlaying}
        className={OVERLAY_MEDIA_CLASS}
        style={beforeStyle}
      />
    </div>
  );

  const afterMedia = (
    <div
      className='relative shrink-0 origin-center will-change-transform'
      style={frameStyle}
    >
      <PausableMedia
        source={after}
        alt={`${after.path} (after)`}
        playing={animationsPlaying}
        primary
        className={OVERLAY_MEDIA_CLASS}
        style={afterStyle}
      />
    </div>
  );

  return (
    <div
      ref={stageRef}
      className={cn(
        'relative flex h-full cursor-grab items-center justify-center overflow-hidden bg-muted touch-none select-none data-panning:cursor-grabbing',
        LIGHTBOX_CHECKERBOARD,
      )}
      data-checkerboard={checkerboard ? '' : undefined}
      {...interactionProps}
    >
      {isSwipe ? (
        <>
          {/* After fills the stage; before covers the left and is width-clipped
              so its right edge is exactly at topClip% — same as the handle. */}
          <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
            {afterMedia}
          </div>
          <div
            className='pointer-events-none absolute inset-y-0 left-0 flex items-center justify-start overflow-hidden will-change-[width]'
            style={{ width: `${topClip}%` }}
          >
            <div
              className='pointer-events-none flex shrink-0 items-center justify-center'
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
            className='pointer-events-none absolute inset-0 flex items-center justify-center'
            style={isOnion ? { opacity: 1 - (topOpacity ?? 0) } : undefined}
          >
            {beforeMedia}
          </div>
          <div
            className='pointer-events-none absolute inset-0 flex items-center justify-center'
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
  const mediaClassName = cn(
    'pointer-events-none block max-h-full max-w-full origin-center object-contain will-change-transform',
    className,
  );

  if (!animated || playing) {
    return (
      <img
        src={source.url}
        alt={alt}
        className={mediaClassName}
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
      className={mediaClassName}
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
