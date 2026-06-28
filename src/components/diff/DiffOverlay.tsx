import type {
  CodeViewItem,
  CodeViewLineSelection,
  CodeViewOptions,
  DiffLineAnnotation,
  LineAnnotation,
  SelectedLineRange,
} from '@pierre/diffs';
import { CodeView, useStableCallback, type CodeViewHandle } from '@pierre/diffs/react';
import { IconChevronDown, IconCircleX, IconLoader, IconX } from '@tabler/icons-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

import { useCodeViewItems } from '@/hooks/useCodeViewItems';
import { useCodeViewHostReady, useCodeViewLayoutRefresh } from '@/hooks/useCodeViewLayoutRefresh';
import { useCodeViewReviewMutations } from '@/hooks/useCodeViewReviewMutations';
import { useCodeViewThemeBootstrap } from '@/hooks/useCodeViewThemeBootstrap';
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
import {
  DEFAULT_DIFF_LAYOUT,
  readDiffLayoutPreference,
  writeDiffLayoutPreference,
  type DiffLayout,
} from '@/lib/diff/layout-prefs';
import {
  getRateLimitState,
  subscribeToRateLimitChanges,
  type PullRequestDiffData,
} from '@/lib/github/api';
import { formatViewedFilesError } from '@/lib/github/token-hints';
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
import { useSidebarContext } from '@/providers/SidebarContext';
import { useChromeThemeProps } from '@/providers/theming/useChromeThemeProps';

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
};

export function DiffOverlay({ data, pullRequestUrl, onClose }: DiffOverlayProps) {
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
  const [diffLayout, setDiffLayout] = useState<DiffLayout>(DEFAULT_DIFF_LAYOUT);
  const [displayPrefs, setDisplayPrefs] = useState<CodeViewDisplayPrefs>(
    DEFAULT_CODE_VIEW_DISPLAY_PREFS,
  );
  const [liveReviewComments, setLiveReviewComments] = useState(data.reviewComments);

  selectedLinesRef.current = selectedLines;
  hoveredThreadSelectionRef.current = hoveredThreadSelection;

  const orderedPaths = useMemo(() => data.files.map((file) => file.filename), [data.files]);
  const viewedFiles = useViewedFiles(data.ref, orderedPaths);

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

  const { isSidebarCollapsed } = useSidebarContext();

  const rateLimit = useSyncExternalStore(subscribeToRateLimitChanges, getRateLimitState);

  const augmentedData = useMemo(
    () => ({
      ...data,
      reviewComments: liveReviewComments,
    }),
    [data, liveReviewComments],
  );

  const { isThemeReady, codeViewOptions, codeViewThemeType } = useCodeViewThemeBootstrap({
    diffLayout,
    displayPrefs,
  });
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
  const modalStyle = useMemo(
    () => ({
      ...chromeStyle,
      ...treeThemeVars,
      colorScheme: codeViewThemeType,
    }),
    [chromeStyle, treeThemeVars, codeViewThemeType],
  );

  const {
    result: codeViewItems,
    isBuilding,
    error: codeViewBuildError,
  } = useCodeViewItems(augmentedData);
  const isCodeViewHostReady = useCodeViewHostReady(codeViewHostRef);
  const isCodeViewMounted = isCodeViewHostReady && isThemeReady && codeViewItems != null;

  const itemById = useMemo(() => {
    if (!codeViewItems) {
      return undefined;
    }

    return new Map(codeViewItems.items.map((item) => [item.id, item]));
  }, [codeViewItems]);

  const { containerRef: handleCodeViewContainer, refresh: refreshCodeViewLayout } =
    useCodeViewLayoutRefresh(viewerRef, codeViewHostRef, [
      codeViewItems,
      isSidebarCollapsed,
      isCodeViewMounted,
    ]);

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
    setLiveReviewComments,
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
  } = useReviewQueue({
    viewerRef,
    codeViewItems,
    pullRequestRef: data.ref,
    headSha: data.pullRequest.head.sha,
    liveReviewComments,
    setLiveReviewComments,
    refreshCodeViewLayout,
    clearSelectionIfNoDrafts,
    onClose,
  });

  const reviewCommentCountByPath = useMemo(() => {
    if (!codeViewItems) {
      return new Map<string, number>();
    }

    return buildReviewCommentCountByPath(liveReviewComments, codeViewItems.items);
  }, [codeViewItems, liveReviewComments]);

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

    refreshCodeViewLayout();
  }, [isCodeViewMounted, codeViewItems, refreshCodeViewLayout]);

  const handleThreadHighlight = useStableCallback((selection: CodeViewLineSelection) => {
    setHoveredThreadSelection(selection);
  });

  const handleThreadHighlightClear = useStableCallback(() => {
    setHoveredThreadSelection(null);
  });

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

  const handleToggleViewed = useCallback(
    (path: string, next: boolean) => {
      viewedFiles.toggleViewed(path, next);

      if (codeViewItems) {
        const file = codeViewItems.fileByPath.get(path);
        if (file) {
          setItemCollapsed(getCodeViewItemIdForFile(file, codeViewItems.diffPathSet), next);
        }
      }
    },
    [codeViewItems, setItemCollapsed, viewedFiles],
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
  }, [
    isCodeViewMounted,
    codeViewItems,
    viewedFiles.isReady,
    viewedFiles.viewedByPath,
    setItemCollapsed,
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
      colorScheme: codeViewThemeType,
      ...annotationThemeStyle,
    }),
    [codeViewThemeType, annotationThemeStyle],
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

      const id = getCodeViewItemIdForFile(file, codeViewItems.diffPathSet);
      viewerRef.current?.scrollTo({
        type: 'item',
        id,
        align: 'start',
        behavior: 'smooth',
      });
    },
    [codeViewItems],
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

      if (metadata.kind === 'draft') {
        return (
          <ReviewCommentComposer
            key={metadata.draftId}
            path={getItemPath(item)}
            range={metadata.range}
            pullRequestRef={data.ref}
            commitId={data.pullRequest.head.sha}
            isBatchMode={isBatchMode}
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
            body={metadata.body}
            range={metadata.range}
            onRemove={() => handleRemoveQueued(metadata.queuedId, item.id)}
            onEdit={(body) => handleEditQueued(metadata.queuedId, item.id, body)}
            onHighlight={() => handleThreadHighlight({ id: item.id, range: metadata.range })}
            onClearHighlight={handleThreadHighlightClear}
          />
        );
      }

      return (
        <ReviewCommentThread
          annotation={annotation}
          itemId={item.id}
          pullRequestRef={data.ref}
          onReplyOpen={handleReplyOpen}
          onReplyClose={handleReplyClose}
          onReplySuccess={(comment, replyKey) => handleReplySuccess(item.id, comment, replyKey)}
          onDelete={(comment) => handleCommentDelete(item.id, comment)}
          onEdit={(comment, body) => handleCommentEdit(item.id, comment, body)}
          onHighlightRange={handleThreadHighlight}
          onClearHighlight={handleThreadHighlightClear}
        />
      );
    },
    [
      data.pullRequest.head.sha,
      data.ref,
      handleCancelDraft,
      handleCommentDelete,
      handleCommentEdit,
      handleEditQueued,
      handleImmediateCommentSuccess,
      handleQueueComment,
      handleRemoveQueued,
      handleReplyClose,
      handleReplyOpen,
      handleReplySuccess,
      handleThreadHighlight,
      handleThreadHighlightClear,
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
              pullRequestRef={data.ref}
              onReplyOpen={handleReplyOpen}
              onReplyClose={handleReplyClose}
              onReplySuccess={(comment, replyKey) =>
                handleReplySuccess(item.id, comment, replyKey, true)
              }
              onDelete={(comment) => handleCommentDelete(item.id, comment, true)}
              onEdit={(comment, body) => handleCommentEdit(item.id, comment, body, true)}
              onHighlightRange={handleThreadHighlight}
              onClearHighlight={handleThreadHighlightClear}
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
    [
      data.ref,
      handleCommentDelete,
      handleCommentEdit,
      handleReplyClose,
      handleReplyOpen,
      handleReplySuccess,
      handleThreadHighlight,
      handleThreadHighlightClear,
      handleToggleViewed,
      viewedFiles.hasToken,
      viewedFiles.isReady,
      viewedFiles.viewedByPath,
    ],
  );

  const renderHeaderPrefix = useStableCallback((item: CodeViewItem<ReviewAnnotationMetadata>) => {
    return (
      <CollapseDiffButton
        collapsed={item.collapsed}
        onToggle={() => handleToggleItemCollapsed(item.id)}
      />
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
          isBatchMode={isBatchMode}
          queuedCount={queue.length}
          canReview={viewedFiles.hasToken}
          onToggleBatchMode={handleToggleBatchMode}
          onOpenPublish={() => setIsPublishDialogOpen(true)}
          onDiffLayoutChange={updateDiffLayout}
          onDisplayPrefsChange={updateDisplayPrefs}
          onClose={onClose}
        />

        {isPublishDialogOpen ? (
          <PublishReviewDialog
            queue={queue}
            onRemoveQueued={(queuedId) => {
              const entry = queue.find((item) => item.queuedId === queuedId);
              if (entry) {
                handleRemoveQueued(queuedId, entry.itemId);
              }
            }}
            onPublish={handlePublishReview}
            onDiscardAll={handleDiscardQueue}
            onClose={() => setIsPublishDialogOpen(false)}
          />
        ) : null}

        <GitHubAuthProvider>
          {notificationError ? (
            <div className='gprv-notification-error'>
              <IconCircleX
                size={16}
                stroke={2}
              />
              <span>{notificationError}</span>
              <button
                className='gprv-notification-dismiss'
                type='button'
                onClick={() => setNotificationError(null)}
                aria-label='Dismiss'
              >
                <IconX
                  size={14}
                  stroke={2}
                />
              </button>
            </div>
          ) : null}
          <div className={`gprv-body${isSidebarCollapsed ? ' gprv-body-sidebar-collapsed' : ''}`}>
            {isSidebarCollapsed ? null : (
              <aside className='gprv-sidebar'>
                {data.files.length > 0 && codeViewItems ? (
                  <FileTreePanel
                    files={data.files}
                    selectedPath={selectedPath}
                    reviewCommentCountByPath={reviewCommentCountByPath}
                    onSelectPath={handleTreeSelect}
                    pullRequest={data.pullRequest}
                    reviewCommentCount={liveReviewComments.length}
                  />
                ) : (
                  <div className='gprv-state'>
                    {isBuilding ? 'Building file list…' : 'No changed files found.'}
                  </div>
                )}
              </aside>
            )}

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
                    <p className='gprv-loading-summary'>This pull request has no code changes.</p>
                    <p className='gprv-loading-hint'>
                      The diff viewer requires at least one changed file.
                    </p>
                  </div>
                </div>
              ) : isCodeViewMounted && codeViewItems ? (
                <CodeView<ReviewAnnotationMetadata>
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
        </GitHubAuthProvider>
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
