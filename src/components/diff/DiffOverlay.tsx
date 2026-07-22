import type {
  CodeViewItem,
  CodeViewLineSelection,
  CodeViewOptions,
  DiffLineAnnotation,
  LineAnnotation,
  SelectedLineRange,
} from '@pierre/diffs';
import { useStableCallback, type CodeViewHandle } from '@pierre/diffs/react';
import { IconChevronDown, IconCircleX, IconLoader } from '@tabler/icons-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type SetStateAction,
} from 'react';

import { BinaryFilePanel } from '@/components/diff/BinaryFilePanel';
import { ImageDiffLightbox } from '@/components/diff/ImageDiffLightbox';
import { ImageDiffViewer } from '@/components/diff/ImageDiffViewer';
import { NotificationErrorBar } from '@/components/diff/NotificationErrorBar';
import { ThemedCodeView } from '@/components/diff/ThemedCodeView';
import { useCodeViewItems } from '@/hooks/useCodeViewItems';
import {
  kickCodeViewLayout,
  useCodeViewHostReady,
  useCodeViewLayoutRefresh,
} from '@/hooks/useCodeViewLayoutRefresh';
import { useCodeViewReviewMutations } from '@/hooks/useCodeViewReviewMutations';
import { useCodeViewThemeBootstrap } from '@/hooks/useCodeViewThemeBootstrap';
import { usePrefetchImageDiffs } from '@/hooks/useImageDiffSources';
import { useRestoreReviewSession } from '@/hooks/useRestoreReviewSession';
import { useReviewQueue } from '@/hooks/useReviewQueue';
import { pickTreeThemeCustomProperties, useTreeThemeStyles } from '@/hooks/useTreeThemeStyles';
import { useViewedFiles } from '@/hooks/useViewedFiles';
import { getCodeViewItemIdForFile } from '@/lib/code-view/build-items';
import { hasAnyDraftAnnotation } from '@/lib/code-view/review-mutations';
import { deferCodeViewControlledSync } from '@/lib/code-view/scroll-anchor';
import {
  DEFAULT_CODE_VIEW_DISPLAY_PREFS,
  readCodeViewDisplayPrefs,
  writeCodeViewDisplayPrefs,
  type CodeViewDisplayPrefs,
} from '@/lib/diff/display-prefs';
import { ensureGoogleFontsLoaded, resolveFontCssVariables } from '@/lib/diff/font-prefs';
import { bumpImageDiffPriority } from '@/lib/diff/image-diff-cache';
import {
  DEFAULT_DIFF_LAYOUT,
  readDiffLayoutPreference,
  writeDiffLayoutPreference,
  type DiffLayout,
} from '@/lib/diff/layout-prefs';
import { classifyChangedFile } from '@/lib/diff/media-files';
import {
  getRateLimitState,
  subscribeToRateLimitChanges,
  type PullRequestDiffData,
} from '@/lib/github/api';
import { formatViewedFilesError } from '@/lib/github/token-hints';
import { OVERLAY_LAYOUT_KICK_EVENT } from '@/lib/overlay/messages';
import { getReviewDraftBody, updateReviewDraftBody } from '@/lib/overlay/review-session';
import { updatePullRequestReviewComments } from '@/lib/query/pr-diff';
import {
  buildReviewCommentCountByPath,
  getItemPath,
  type ReviewAnnotationMetadata,
  type ReviewThreadMetadata,
} from '@/lib/review/comments';
import { bindReplySession } from '@/lib/review/reply-session';
import { buildAnnotationThemeStyle } from '@/lib/theming/buildAnnotationThemeStyle';
import { diffyChromeMapping } from '@/lib/theming/diffyChromeMapping';
import { GitHubAuthProvider } from '@/providers/GitHubAuthProvider';
import { ReviewProvider, type ReviewContextValue } from '@/providers/ReviewContext';
import { ReviewQueueProvider, type ReviewQueueContextValue } from '@/providers/ReviewQueueContext';
import { useSidebarContext, MOBILE_SIDEBAR_QUERY } from '@/providers/SidebarContext';
import { useChromeThemeProps } from '@/providers/theming/useChromeThemeProps';
import { useDiffThemeReady } from '@/providers/theming/useDiffThemeReady';
import { useThemeColorScheme } from '@/providers/theming/useThemeSelection';

import { FileViewedCheckbox } from '../review/FileViewedCheckbox';
import { OrphanedReviewCommentsBadge } from '../review/OrphanedReviewCommentsBadge';
import { PublishReviewDialog } from '../review/PublishReviewDialog';
import { QueuedCommentCard } from '../review/QueuedCommentCard';
import { ReviewCommentComposer } from '../review/ReviewCommentComposer';
import { ReviewCommentThread } from '../review/ReviewCommentThread';
import { DiffOverlayHeader } from './DiffOverlayHeader';
import { FileTreePanel } from './FileTreePanel';

type DiffOverlayProps = {
  data: PullRequestDiffData;
  pullRequestUrl: string;
  onClose: () => void;
  onRefresh: () => void;
  refreshGeneration: number;
  isRefreshing: boolean;
};

export function DiffOverlay({
  data,
  pullRequestUrl,
  onClose,
  onRefresh,
  refreshGeneration,
  isRefreshing,
}: DiffOverlayProps) {
  const viewerRef = useRef<CodeViewHandle<ReviewAnnotationMetadata>>(null);
  const codeViewHostRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLElement>(null);
  const selectedLinesRef = useRef<CodeViewLineSelection | null>(null);
  const hoveredThreadSelectionRef = useRef<CodeViewLineSelection | null>(null);
  const isOpeningDraftRef = useRef(false);
  const handleTreeSelectRef = useRef<((path: string) => void) | null>(null);
  const orphanedThreadsByItemIdRef = useRef<
    ReadonlyMap<string, ReviewThreadMetadata[]> | undefined
  >(undefined);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedLines, setSelectedLines] = useState<CodeViewLineSelection | null>(null);
  const [hoveredThreadSelection, setHoveredThreadSelection] =
    useState<CodeViewLineSelection | null>(null);
  const [lightboxImagePath, setLightboxImagePath] = useState<string | null>(null);
  const [diffLayout, setDiffLayout] = useState<DiffLayout>(DEFAULT_DIFF_LAYOUT);
  const [displayPrefs, setDisplayPrefs] = useState<CodeViewDisplayPrefs>(
    DEFAULT_CODE_VIEW_DISPLAY_PREFS,
  );

  const updateReviewComments = useCallback(
    (updater: SetStateAction<typeof data.reviewComments>) => {
      updatePullRequestReviewComments(data.ref, updater);
    },
    [data.ref],
  );

  selectedLinesRef.current = selectedLines;
  hoveredThreadSelectionRef.current = hoveredThreadSelection;

  const orderedPaths = useMemo(() => data.files.map((file) => file.filename), [data.files]);
  const imageFiles = useMemo(
    () => data.files.filter((file) => classifyChangedFile(file) === 'image'),
    [data.files],
  );
  const lightboxFile =
    lightboxImagePath == null
      ? null
      : (imageFiles.find((file) => file.filename === lightboxImagePath) ?? null);
  const viewedFiles = useViewedFiles(data.ref, orderedPaths);

  const { result: codeViewItems, isBuilding, error: codeViewBuildError } = useCodeViewItems(data);
  usePrefetchImageDiffs(data);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) {
      return;
    }

    return bindReplySession(modal);
  }, []);

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

    readCodeViewDisplayPrefs()
      .then((storedPrefs) => {
        if (!isCancelled) {
          setDisplayPrefs(storedPrefs);
        }
      })
      .catch(() => {
        // Ignore preference read failures and keep the default display prefs.
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    ensureGoogleFontsLoaded();
  }, []);

  const { isSidebarCollapsed, closeSidebar } = useSidebarContext();

  const rateLimit = useSyncExternalStore(subscribeToRateLimitChanges, getRateLimitState);

  const { isThemeReady, codeViewOptions } = useCodeViewThemeBootstrap({
    diffLayout,
    displayPrefs,
  });
  const colorScheme = useThemeColorScheme();
  const treeThemeStyles = useTreeThemeStyles();
  const treeThemeVars = useMemo(
    () => pickTreeThemeCustomProperties(treeThemeStyles),
    [treeThemeStyles],
  );
  const { style: chromeStyle } = useChromeThemeProps(diffyChromeMapping);
  const themeChromeStyle = useMemo(
    () => (Object.keys(chromeStyle).length > 0 ? chromeStyle : undefined),
    [chromeStyle],
  );
  const annotationThemeStyle = useMemo(
    () => buildAnnotationThemeStyle(themeChromeStyle),
    [themeChromeStyle],
  );
  const fontCssVariables = useMemo(
    () =>
      resolveFontCssVariables({
        codeFont: displayPrefs.codeFont,
        treeFont: displayPrefs.treeFont,
        codeFontSize: displayPrefs.codeFontSize,
        codeLineHeight: displayPrefs.codeLineHeight,
        codeFontFeatures: displayPrefs.codeFontFeatures,
      }),
    [
      displayPrefs.codeFont,
      displayPrefs.treeFont,
      displayPrefs.codeFontSize,
      displayPrefs.codeLineHeight,
      displayPrefs.codeFontFeatures,
    ],
  );
  const modalStyle = useMemo(
    () => ({
      ...chromeStyle,
      ...treeThemeVars,
      ...fontCssVariables,
      colorScheme,
    }),
    [chromeStyle, treeThemeVars, fontCssVariables, colorScheme],
  );

  const isCodeViewHostReady = useCodeViewHostReady(codeViewHostRef);
  const isDiffThemeReady = useDiffThemeReady();
  const isCodeViewMounted =
    isCodeViewHostReady && isThemeReady && isDiffThemeReady && codeViewItems != null;

  const itemById = useMemo(() => {
    if (!codeViewItems) {
      return undefined;
    }

    return new Map(codeViewItems.items.map((item) => [item.id, item]));
  }, [codeViewItems]);

  const layoutRefreshDeps = useMemo(
    () => [
      codeViewItems,
      isSidebarCollapsed,
      isCodeViewMounted,
      displayPrefs.codeFontSize,
      displayPrefs.codeLineHeight,
    ],
    [
      codeViewItems,
      isSidebarCollapsed,
      isCodeViewMounted,
      displayPrefs.codeFontSize,
      displayPrefs.codeLineHeight,
    ],
  );

  const { containerRef: handleCodeViewContainer, refresh: refreshCodeViewLayout } =
    useCodeViewLayoutRefresh(viewerRef, codeViewHostRef, layoutRefreshDeps);

  useRestoreReviewSession({
    ref: data.ref,
    viewerRef,
    codeViewItems,
    isCodeViewMounted,
    refreshCodeViewLayout,
    codeViewInstanceKey: refreshGeneration,
  });

  const {
    notificationError,
    setNotificationError,
    openDraftComposer,
    handleReplyOpen,
    handleReplyClose,
    handleReplySuccess,
    handleCommentDelete,
    handleCommentEdit,
    handleCancelDraft,
    handleImmediateCommentSuccess,
    clearSelectionIfNoDrafts,
  } = useCodeViewReviewMutations({
    viewerRef,
    modalRef,
    codeViewItems,
    pullRequestRef: data.ref,
    updateReviewComments,
    refreshCodeViewLayout,
    selectedLinesRef,
    setSelectedLines,
    setHoveredThreadSelection,
    itemById,
    setSelectedPath,
    isOpeningDraftRef,
  });

  const {
    isBatchMode,
    queue,
    isPublishDialogOpen,
    setIsPublishDialogOpen,
    handleQueueComment,
    handleRemoveQueued,
    handleEditQueued,
    handlePublishReview,
    handleDiscardQueue,
    handleToggleBatchMode,
    handleCloseOverlay,
    withQueueConfirm,
  } = useReviewQueue({
    viewerRef,
    codeViewItems,
    pullRequestRef: data.ref,
    headSha: data.pullRequest.head.sha,
    reviewComments: data.reviewComments,
    updateReviewComments,
    refreshCodeViewLayout,
    clearSelectionIfNoDrafts,
    onClose,
  });

  const handleRefresh = useCallback(() => {
    withQueueConfirm(onRefresh);
  }, [onRefresh, withQueueConfirm]);

  const reviewQueueContextValue = useMemo<ReviewQueueContextValue>(
    () => ({
      isBatchMode,
      queue,
      toggleBatchMode: handleToggleBatchMode,
      queueComment: handleQueueComment,
      removeQueued: handleRemoveQueued,
      removeQueuedById: (queuedId: string) => {
        const entry = queue.find((item) => item.queuedId === queuedId);
        if (entry) {
          handleRemoveQueued(queuedId, entry.itemId);
        }
      },
      editQueued: handleEditQueued,
      publishReview: handlePublishReview,
      discardQueue: handleDiscardQueue,
      openPublishDialog: () => setIsPublishDialogOpen(true),
      closePublishDialog: () => setIsPublishDialogOpen(false),
    }),
    [
      handleDiscardQueue,
      handleEditQueued,
      handlePublishReview,
      handleQueueComment,
      handleRemoveQueued,
      handleToggleBatchMode,
      isBatchMode,
      queue,
      setIsPublishDialogOpen,
    ],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isPublishDialogOpen) {
        return;
      }

      if (lightboxImagePath) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        setLightboxImagePath(null);
        return;
      }

      const modal = modalRef.current;
      if (!modal) {
        return;
      }

      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        modal.contains(active) &&
        (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      handleCloseOverlay();
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [handleCloseOverlay, isPublishDialogOpen, lightboxImagePath]);

  const reviewCommentCountByPath = useMemo(() => {
    if (!codeViewItems) {
      return new Map<string, number>();
    }

    return buildReviewCommentCountByPath(data.reviewComments, codeViewItems.items);
  }, [codeViewItems, data.reviewComments]);

  const handleGutterUtilityClick = useStableCallback(
    (range: SelectedLineRange, context: { item: { id: string } }) => {
      openDraftComposer({ id: context.item.id, range });
    },
  );

  const handleToggleItemCollapsed = useStableCallback((itemId: string) => {
    const viewer = viewerRef.current;
    const item = viewer?.getItem(itemId);
    if (!viewer || !item) {
      return;
    }

    viewer.updateItem({
      ...item,
      collapsed: !item.collapsed,
      version: item.version != null ? item.version + 1 : 1,
    });

    // Keep the allCollapsed flag in sync after a single-item toggle.
    // Expanding any file means not-all-collapsed; only scan when collapsing.
    setAllCollapsed(item.collapsed ? false : computeAllCollapsed());
  });

  const codeViewOptionsWithInteractions =
    useMemo((): CodeViewOptions<ReviewAnnotationMetadata> | null => {
      if (!codeViewOptions) {
        return null;
      }

      return {
        ...codeViewOptions,
        enableLineSelection: true,
        enableGutterUtility: true,
        lineHoverHighlight: 'both' as const,
        onGutterUtilityClick: handleGutterUtilityClick,
      };
    }, [codeViewOptions, handleGutterUtilityClick]);

  orphanedThreadsByItemIdRef.current = codeViewItems?.orphanedReviewThreadsByItemId as
    | ReadonlyMap<string, ReviewThreadMetadata[]>
    | undefined;

  useEffect(() => {
    if (!isCodeViewMounted) {
      return;
    }

    const runKick = () => {
      kickCodeViewLayout(viewerRef.current, codeViewHostRef.current);
    };

    runKick();
    const raf1 = requestAnimationFrame(() => {
      runKick();
      requestAnimationFrame(runKick);
    });
    const delayedKick = window.setTimeout(runKick, 100);

    const onLayoutKick = () => {
      runKick();
    };
    window.addEventListener(OVERLAY_LAYOUT_KICK_EVENT, onLayoutKick);

    return () => {
      cancelAnimationFrame(raf1);
      window.clearTimeout(delayedKick);
      window.removeEventListener(OVERLAY_LAYOUT_KICK_EVENT, onLayoutKick);
    };
  }, [isCodeViewMounted, codeViewItems]);

  const handleThreadHighlight = useStableCallback((selection: CodeViewLineSelection) => {
    setHoveredThreadSelection(selection);
  });

  const handleThreadHighlightClear = useStableCallback(() => {
    setHoveredThreadSelection(null);
  });

  const reviewContextValue = useMemo<ReviewContextValue>(
    () => ({
      actions: {
        openReply: handleReplyOpen,
        closeReply: handleReplyClose,
        submitReply: handleReplySuccess,
        deleteComment: handleCommentDelete,
        editComment: handleCommentEdit,
        highlightRange: handleThreadHighlight,
        clearHighlight: handleThreadHighlightClear,
      },
      meta: {
        pullRequestRef: data.ref,
        headSha: data.pullRequest.head.sha,
      },
    }),
    [
      data.pullRequest.head.sha,
      data.ref,
      handleCommentDelete,
      handleCommentEdit,
      handleReplyClose,
      handleReplyOpen,
      handleReplySuccess,
      handleThreadHighlight,
      handleThreadHighlightClear,
    ],
  );

  const setItemCollapsed = useCallback((itemId: string, collapsed: boolean) => {
    const viewer = viewerRef.current;
    const item = viewer?.getItem(itemId);
    if (!viewer || !item || item.collapsed === collapsed) {
      return;
    }

    viewer.updateItem({
      ...item,
      collapsed,
      version: item.version != null ? item.version + 1 : 1,
    });
  }, []);

  const computeAllCollapsed = useCallback((): boolean => {
    const viewer = viewerRef.current;
    if (!viewer || !codeViewItems || codeViewItems.items.length === 0) {
      return false;
    }

    return codeViewItems.items.every((item) => {
      const current = viewer.getItem(item.id);
      return current ? current.collapsed === true : item.collapsed === true;
    });
  }, [codeViewItems]);

  const [allCollapsed, setAllCollapsed] = useState(false);

  const handleCollapseAll = useCallback(() => {
    if (!codeViewItems) {
      return;
    }

    for (const item of codeViewItems.items) {
      setItemCollapsed(item.id, true);
    }

    setAllCollapsed(computeAllCollapsed());
  }, [codeViewItems, computeAllCollapsed, setItemCollapsed]);

  const handleExpandAll = useCallback(() => {
    if (!codeViewItems) {
      return;
    }

    for (const item of codeViewItems.items) {
      setItemCollapsed(item.id, false);
    }

    setAllCollapsed(computeAllCollapsed());
  }, [codeViewItems, computeAllCollapsed, setItemCollapsed]);

  const handleToggleViewed = useCallback(
    (path: string, next: boolean) => {
      viewedFiles.toggleViewed(path, next);

      if (codeViewItems) {
        const file = codeViewItems.fileByPath.get(path);
        if (file) {
          setItemCollapsed(getCodeViewItemIdForFile(file, codeViewItems.diffPathSet), next);
        }
      }

      setAllCollapsed(computeAllCollapsed());
    },
    [codeViewItems, computeAllCollapsed, setItemCollapsed, viewedFiles],
  );

  const didInitialViewedCollapseRef = useRef(false);
  useEffect(() => {
    if (
      didInitialViewedCollapseRef.current ||
      !isCodeViewMounted ||
      !codeViewItems ||
      !viewedFiles.isReady
    ) {
      return;
    }

    didInitialViewedCollapseRef.current = true;
    for (const [path, state] of viewedFiles.viewedByPath) {
      if (state !== 'VIEWED') {
        continue;
      }
      const file = codeViewItems.fileByPath.get(path);
      if (file) {
        setItemCollapsed(getCodeViewItemIdForFile(file, codeViewItems.diffPathSet), true);
      }
    }

    setAllCollapsed(computeAllCollapsed());
  }, [
    isCodeViewMounted,
    codeViewItems,
    viewedFiles.isReady,
    viewedFiles.viewedByPath,
    setItemCollapsed,
    computeAllCollapsed,
  ]);

  const handleJumpToNextUnviewed = useCallback(() => {
    const next = viewedFiles.nextUnviewedPath(selectedPath);
    if (next) {
      handleTreeSelectRef.current?.(next);
    }
  }, [selectedPath, viewedFiles]);

  const codeViewStyle = useMemo(
    () => ({
      height: '100%',
      colorScheme,
      ...annotationThemeStyle,
    }),
    [colorScheme, annotationThemeStyle],
  );

  const updateDiffLayout = useCallback((nextLayout: DiffLayout) => {
    setDiffLayout(nextLayout);
    void writeDiffLayoutPreference(nextLayout);
  }, []);

  const updateDisplayPrefs = useCallback((partial: Partial<CodeViewDisplayPrefs>) => {
    setDisplayPrefs((current) => {
      const next = { ...current, ...partial };
      void writeCodeViewDisplayPrefs(next);
      return next;
    });
  }, []);

  const handleTreeSelect = useCallback(
    (path: string) => {
      if (!codeViewItems) {
        return;
      }

      setSelectedPath(path);
      const file = codeViewItems.fileByPath.get(path);
      if (!file) {
        return;
      }

      bumpImageDiffPriority(data.ref, data.pullRequest, file);
      const id = getCodeViewItemIdForFile(file, codeViewItems.diffPathSet);
      viewerRef.current?.scrollTo({
        type: 'item',
        id,
        align: 'start',
        behavior: 'smooth',
      });

      if (window.matchMedia(MOBILE_SIDEBAR_QUERY).matches) {
        closeSidebar();
      }
    },
    [closeSidebar, codeViewItems, data.pullRequest, data.ref],
  );

  handleTreeSelectRef.current = handleTreeSelect;

  const handleSelectedLinesChange = useStableCallback((selection: CodeViewLineSelection | null) => {
    const viewer = viewerRef.current;
    if (
      selection == null &&
      viewer &&
      codeViewItems &&
      hasAnyDraftAnnotation(viewer, codeViewItems.items)
    ) {
      return;
    }

    if (selection == null && hoveredThreadSelectionRef.current != null) {
      return;
    }

    // openDraftComposer runs first on gutter + clicks and defers selection sync itself.
    if (selection != null && isOpeningDraftRef.current) {
      return;
    }

    const applySelectionState = () => {
      if (selection != null) {
        setHoveredThreadSelection(null);
      }

      setSelectedLines(selection);
      if (!selection || !itemById) {
        return;
      }

      const item = itemById.get(selection.id);
      if (!item) {
        return;
      }

      const path = getItemPath(item);
      setSelectedPath((current) => (current === path ? current : path));
    };

    if (selection != null && viewer) {
      deferCodeViewControlledSync(viewer, applySelectionState);
      return;
    }

    applySelectionState();
  });

  const stopGitHubKeybindings = useCallback((event: ReactKeyboardEvent) => {
    event.stopPropagation();
  }, []);

  const handleExpandImage = useCallback((path: string) => {
    setLightboxImagePath(path);
  }, []);

  const handleNavigateImage = useCallback(
    (path: string) => {
      const file = imageFiles.find((candidate) => candidate.filename === path);
      if (file) {
        bumpImageDiffPriority(data.ref, data.pullRequest, file);
      }
      setLightboxImagePath(path);
    },
    [data.pullRequest, data.ref, imageFiles],
  );

  const renderReviewAnnotation = useCallback(
    (
      annotation:
        | LineAnnotation<ReviewAnnotationMetadata>
        | DiffLineAnnotation<ReviewAnnotationMetadata>,
      item: NonNullable<typeof codeViewItems>['items'][number],
    ) => {
      const metadata = annotation.metadata;
      if (!metadata) {
        return null;
      }

      if (metadata.kind === 'media-image' || metadata.kind === 'media-binary') {
        const path = getItemPath(item);
        const file = codeViewItems?.fileByPath.get(path);
        if (!file) {
          return null;
        }

        if (metadata.kind === 'media-image') {
          return (
            <div
              className='gprv-media-annotation'
              data-media-pane={metadata.pane}
            >
              <ImageDiffViewer
                file={file}
                pullRequest={data.pullRequest}
                pullRequestRef={data.ref}
                pane={metadata.pane}
                checkerboard={displayPrefs.imageCheckerboard}
                onExpand={handleExpandImage}
              />
            </div>
          );
        }

        return (
          <div className='gprv-media-annotation'>
            <BinaryFilePanel
              file={file}
              owner={data.ref.owner}
              repo={data.ref.repo}
              baseSha={data.pullRequest.base.sha}
              headSha={data.pullRequest.head.sha}
            />
          </div>
        );
      }

      if (metadata.kind === 'draft') {
        return (
          <ReviewCommentComposer
            key={metadata.draftId}
            path={getItemPath(item)}
            range={metadata.range}
            isBatchMode={isBatchMode}
            initialBody={getReviewDraftBody(data.ref, metadata.draftId)}
            onBodyChange={(body) => updateReviewDraftBody(data.ref, metadata.draftId, body)}
            onCancel={() => handleCancelDraft(item.id, metadata.draftId, metadata.range)}
            onSuccess={(comment) =>
              handleImmediateCommentSuccess(item.id, comment, metadata.draftId, metadata.range)
            }
            onQueue={(body) =>
              handleQueueComment(item.id, getItemPath(item), metadata.draftId, metadata.range, body)
            }
          />
        );
      }

      if (metadata.kind === 'queued') {
        return (
          <QueuedCommentCard
            key={metadata.queuedId}
            queuedId={metadata.queuedId}
            itemId={item.id}
            body={metadata.body}
            range={metadata.range}
          />
        );
      }

      return (
        <ReviewCommentThread
          annotation={annotation}
          itemId={item.id}
        />
      );
    },
    [
      codeViewItems?.fileByPath,
      data.pullRequest,
      data.ref,
      displayPrefs.imageCheckerboard,
      handleCancelDraft,
      handleExpandImage,
      handleImmediateCommentSuccess,
      handleQueueComment,
      isBatchMode,
    ],
  );

  const renderReviewHeaderMetadata = useCallback(
    (item: NonNullable<typeof codeViewItems>['items'][number]) => {
      const orphanedThreads = orphanedThreadsByItemIdRef.current?.get(item.id);
      const path = getItemPath(item);

      return (
        <span className='gprv-file-header-meta'>
          {orphanedThreads?.length ? (
            <OrphanedReviewCommentsBadge
              threads={orphanedThreads}
              itemId={item.id}
            />
          ) : null}
          {viewedFiles.hasToken ? (
            <FileViewedCheckbox
              state={viewedFiles.viewedByPath.get(path)}
              disabled={!viewedFiles.isReady}
              onToggle={(next) => handleToggleViewed(path, next)}
            />
          ) : null}
        </span>
      );
    },
    [handleToggleViewed, viewedFiles.hasToken, viewedFiles.isReady, viewedFiles.viewedByPath],
  );

  const renderHeaderPrefix = useStableCallback((item: CodeViewItem<ReviewAnnotationMetadata>) => {
    const isMediaItem = item.id.startsWith('media:');
    return (
      <>
        {isMediaItem ? (
          <span
            className='gprv-media-file-marker'
            hidden
          />
        ) : null}
        <CollapseDiffButton
          collapsed={item.collapsed}
          onToggle={() => handleToggleItemCollapsed(item.id)}
        />
      </>
    );
  });

  return (
    <>
      <div
        className='gprv-backdrop'
        onClick={handleCloseOverlay}
      />
      <section
        ref={modalRef}
        className='gprv-modal'
        style={modalStyle}
        role='dialog'
        aria-modal='true'
        aria-label='Pull request diff'
        onKeyDown={stopGitHubKeybindings}
        onKeyUp={stopGitHubKeybindings}
      >
        <ReviewQueueProvider value={reviewQueueContextValue}>
          <DiffOverlayHeader
            pullRequest={data.pullRequest}
            pullRequestUrl={pullRequestUrl}
            diffLayout={diffLayout}
            displayPrefs={displayPrefs}
            reviewCommentsLoadError={data.reviewCommentsLoadError}
            rateLimit={rateLimit}
            viewedFilesError={
              viewedFiles.hasToken && viewedFiles.error
                ? formatViewedFilesError(viewedFiles.error)
                : null
            }
            reviewProgress={viewedFiles.hasToken ? viewedFiles.progress : null}
            onJumpToNextUnviewed={handleJumpToNextUnviewed}
            canReview={viewedFiles.hasToken}
            onDiffLayoutChange={updateDiffLayout}
            onDisplayPrefsChange={updateDisplayPrefs}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            onClose={handleCloseOverlay}
            allCollapsed={allCollapsed}
            onExpandAll={handleExpandAll}
            onCollapseAll={handleCollapseAll}
          />

          {isPublishDialogOpen ? <PublishReviewDialog /> : null}
          {lightboxFile ? (
            <ImageDiffLightbox
              file={lightboxFile}
              imageFiles={imageFiles}
              pullRequest={data.pullRequest}
              pullRequestRef={data.ref}
              mode={displayPrefs.imageCompareMode}
              checkerboard={displayPrefs.imageCheckerboard}
              onModeChange={(imageCompareMode) => updateDisplayPrefs({ imageCompareMode })}
              onCheckerboardChange={(imageCheckerboard) =>
                updateDisplayPrefs({ imageCheckerboard })
              }
              onNavigate={handleNavigateImage}
              onClose={() => setLightboxImagePath(null)}
            />
          ) : null}

          <div className='gprv-modal-main'>
            <GitHubAuthProvider>
              <ReviewProvider value={reviewContextValue}>
                {notificationError ? (
                  <NotificationErrorBar
                    message={notificationError}
                    onDismiss={() => setNotificationError(null)}
                  />
                ) : null}
                <div
                  className={`gprv-body${isSidebarCollapsed ? ' gprv-body-sidebar-collapsed' : ''}`}
                >
                  <button
                    type='button'
                    className='gprv-sidebar-backdrop'
                    data-open={isSidebarCollapsed ? undefined : ''}
                    aria-hidden={isSidebarCollapsed}
                    aria-label='Close file list'
                    tabIndex={isSidebarCollapsed ? -1 : 0}
                    onClick={closeSidebar}
                  />
                  <aside
                    className='gprv-sidebar'
                    aria-hidden={isSidebarCollapsed}
                  >
                    {data.files.length > 0 && codeViewItems ? (
                      <FileTreePanel
                        files={data.files}
                        selectedPath={selectedPath}
                        reviewCommentCountByPath={reviewCommentCountByPath}
                        onSelectPath={handleTreeSelect}
                        pullRequest={data.pullRequest}
                        reviewCommentCount={data.reviewComments.length}
                      />
                    ) : (
                      <div className='gprv-state'>
                        {isBuilding ? 'Building file list…' : 'No changed files found.'}
                      </div>
                    )}
                  </aside>

                  <div
                    ref={codeViewHostRef}
                    className='gprv-code-view-host'
                  >
                    {codeViewBuildError ? (
                      <div
                        className='gprv-state'
                        style={{ color: 'var(--gprv-error)' }}
                      >
                        {codeViewBuildError}
                      </div>
                    ) : codeViewItems && codeViewItems.items.length === 0 ? (
                      <div className='gprv-state'>
                        <div className='gprv-empty-state'>
                          <IconCircleX
                            size={48}
                            stroke={2}
                            color='var(--gprv-muted)'
                          />
                          <p className='gprv-loading-summary'>
                            This pull request has no code changes.
                          </p>
                          <p className='gprv-loading-hint'>
                            The diff viewer requires at least one changed file.
                          </p>
                        </div>
                      </div>
                    ) : isCodeViewMounted && codeViewItems ? (
                      <ThemedCodeView<ReviewAnnotationMetadata>
                        key={`codeview-${refreshGeneration}`}
                        ref={viewerRef}
                        containerRef={handleCodeViewContainer}
                        initialItems={codeViewItems.items}
                        className='gprv-code-view'
                        style={codeViewStyle}
                        renderAnnotation={renderReviewAnnotation}
                        renderHeaderPrefix={renderHeaderPrefix}
                        renderHeaderMetadata={renderReviewHeaderMetadata}
                        options={codeViewOptionsWithInteractions ?? codeViewOptions}
                        selectedLines={hoveredThreadSelection ?? selectedLines}
                        onSelectedLinesChange={handleSelectedLinesChange}
                      />
                    ) : (
                      <div className='gprv-state'>
                        {isBuilding ? (
                          'Building diff…'
                        ) : (
                          <div
                            className='gprv-loading-panel'
                            role='status'
                            aria-live='polite'
                            aria-label='Preparing diff viewer'
                          >
                            <IconLoader
                              size={48}
                              stroke={2}
                              className='gprv-loading-spinner'
                            />
                            <p className='gprv-loading-summary'>Preparing diff viewer…</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </ReviewProvider>
            </GitHubAuthProvider>
          </div>
        </ReviewQueueProvider>
      </section>
    </>
  );
}

function CollapseDiffButton({
  collapsed = false,
  onToggle,
}: {
  collapsed?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type='button'
      aria-expanded={!collapsed}
      aria-label={collapsed ? 'Expand file' : 'Collapse file'}
      className='gprv-code-view-collapse-btn'
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
    >
      <IconChevronDown
        size={16}
        stroke={2}
        aria-hidden='true'
        className={`gprv-code-view-collapse-icon${collapsed ? ' gprv-code-view-collapse-icon-collapsed' : ''}`}
      />
    </button>
  );
}
