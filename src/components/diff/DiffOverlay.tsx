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
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { useCodeViewItems } from '@/hooks/useCodeViewItems';
import { useCodeViewHostReady, useCodeViewLayoutRefresh } from '@/hooks/useCodeViewLayoutRefresh';
import { useCodeViewThemeBootstrap } from '@/hooks/useCodeViewThemeBootstrap';
import { pickTreeThemeCustomProperties, useTreeThemeStyles } from '@/hooks/useTreeThemeStyles';
import {
  getCodeViewItemIdForFile,
  invalidateCodeViewItemsCache,
} from '@/lib/code-view/build-items';
import {
  addDraftAnnotation,
  appendReplyToThreadAnnotation,
  hasAnyDraftAnnotation,
  hasDraftAnnotation,
  removeCommentFromAnnotation,
  removeDraftAnnotation,
  replaceDraftWithThreadAnnotation,
  updateCommentInAnnotation,
} from '@/lib/code-view/review-mutations';
import {
  deferCodeViewControlledSync,
  runCodeViewMutationPreservingScroll,
} from '@/lib/code-view/scroll-anchor';
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
  type GitHubPullRequestReviewComment,
  type PullRequestDiffData,
} from '@/lib/github/api';
import {
  deleteReviewComment,
  GitHubReviewWriteError,
  updateReviewComment,
} from '@/lib/github/review-write';
import {
  buildReviewCommentCountByPath,
  getItemPath,
  type ReviewAnnotationMetadata,
  type ReviewThreadMetadata,
} from '@/lib/review/comments';
import {
  bindReplySession,
  closeAllReplyComposers,
  closeReplyComposer,
  openReplySession,
} from '@/lib/review/reply-session';
import { GitHubAuthProvider } from '@/providers/GitHubAuthProvider';
import { useSidebarContext } from '@/providers/SidebarContext';

import { OrphanedReviewCommentsBadge } from '../review/OrphanedReviewCommentsBadge';
import { ReviewCommentComposer } from '../review/ReviewCommentComposer';
import { getReviewReplyKey, ReviewCommentThread } from '../review/ReviewCommentThread';
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
  const [notificationError, setNotificationError] = useState<string | null>(null);

  selectedLinesRef.current = selectedLines;
  hoveredThreadSelectionRef.current = hoveredThreadSelection;

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

  const reviewCommentCountByPath = useMemo(() => {
    if (!codeViewItems) {
      return new Map<string, number>();
    }

    return buildReviewCommentCountByPath(liveReviewComments, codeViewItems.items);
  }, [codeViewItems, liveReviewComments]);

  const clearAllDrafts = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer || !codeViewItems) {
      return;
    }

    runCodeViewMutationPreservingScroll(viewer, () => {
      for (const item of codeViewItems.items) {
        const liveItem = viewer.getItem(item.id);
        if (!liveItem || !hasDraftAnnotation(liveItem)) {
          continue;
        }

        viewer.updateItem(removeDraftAnnotation(liveItem));
      }
    });
  }, [codeViewItems]);

  const openDraftComposer = useCallback(
    (selection: CodeViewLineSelection) => {
      const viewer = viewerRef.current;
      if (!viewer || !codeViewItems) {
        return;
      }

      if (modalRef.current) {
        closeAllReplyComposers(modalRef.current);
      }

      isOpeningDraftRef.current = true;

      runCodeViewMutationPreservingScroll(
        viewer,
        () => {
          const targetItem = viewer.getItem(selection.id);
          if (!targetItem) {
            isOpeningDraftRef.current = false;
            return;
          }

          const { item: nextItem } = addDraftAnnotation(targetItem, selection.range);
          viewer.updateItem(nextItem);
        },
        () => {
          setSelectedLines(selection);

          const item = itemById?.get(selection.id);
          if (item) {
            const path = getItemPath(item);
            setSelectedPath((current) => (current === path ? current : path));
          }

          isOpeningDraftRef.current = false;
        },
      );
    },
    [codeViewItems, itemById],
  );

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

  const { containerRef: handleCodeViewContainer, refresh: refreshCodeViewLayout } =
    useCodeViewLayoutRefresh(viewerRef, codeViewHostRef, [
      codeViewItems,
      isSidebarCollapsed,
      isCodeViewMounted,
    ]);

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

  const handleReplyOpen = useCallback(
    (replyKey: string) => {
      clearAllDrafts();
      setHoveredThreadSelection(null);
      viewerRef.current?.clearSelectedLines();
      setSelectedLines(null);
      if (modalRef.current) {
        openReplySession(modalRef.current, replyKey);
      }
    },
    [clearAllDrafts],
  );

  const handleReplyClose = useCallback((replyKey: string) => {
    if (modalRef.current) {
      closeReplyComposer(modalRef.current, replyKey);
    }
  }, []);

  const handleReplySuccess = useCallback(
    (
      itemId: string,
      comment: GitHubPullRequestReviewComment,
      replyKey: string,
      isOrphaned = false,
    ) => {
      const viewer = viewerRef.current;
      const modal = modalRef.current;

      setLiveReviewComments((comments) => [...comments, comment]);
      if (!isOrphaned) {
        const item = viewer?.getItem(itemId);
        if (item) {
          viewer?.updateItem(appendReplyToThreadAnnotation(item, comment));
        }
      } else {
        invalidateCodeViewItemsCache(data.ref);
      }

      if (modal) {
        closeReplyComposer(modal, replyKey, { clearDraft: true });
      }

      refreshCodeViewLayout();
    },
    [data.ref, refreshCodeViewLayout],
  );

  const handleCommentDelete = useCallback(
    async (itemId: string, comment: GitHubPullRequestReviewComment, isOrphaned = false) => {
      const viewer = viewerRef.current;
      const modal = modalRef.current;
      const replyKey = getReviewReplyKey(itemId, comment.id);

      try {
        await deleteReviewComment(data.ref, comment.id);
      } catch (error: unknown) {
        const message =
          error instanceof GitHubReviewWriteError
            ? error.message
            : error instanceof Error
              ? error.message
              : String(error);
        setNotificationError(message);
        return;
      }

      setLiveReviewComments((comments) => comments.filter((entry) => entry.id !== comment.id));

      if (!isOrphaned) {
        const item = viewer?.getItem(itemId);
        if (item) {
          viewer?.updateItem(removeCommentFromAnnotation(item, comment.id));
        }
      } else {
        invalidateCodeViewItemsCache(data.ref);
      }

      if (modal) {
        closeReplyComposer(modal, replyKey, { clearDraft: true });
      }

      refreshCodeViewLayout();
    },
    [data.ref, refreshCodeViewLayout],
  );

  const handleCommentEdit = useCallback(
    async (
      itemId: string,
      comment: GitHubPullRequestReviewComment,
      body: string,
      isOrphaned = false,
    ) => {
      const viewer = viewerRef.current;

      let updated: GitHubPullRequestReviewComment;
      try {
        updated = await updateReviewComment(data.ref, comment.id, body);
      } catch (error: unknown) {
        if (error instanceof GitHubReviewWriteError) {
          throw error;
        }

        throw new Error(error instanceof Error ? error.message : String(error), { cause: error });
      }

      setLiveReviewComments((comments) =>
        comments.map((entry) => (entry.id === updated.id ? updated : entry)),
      );

      if (!isOrphaned) {
        const item = viewer?.getItem(itemId);
        if (item) {
          viewer?.updateItem(updateCommentInAnnotation(item, updated));
        }
      } else {
        invalidateCodeViewItemsCache(data.ref);
      }

      refreshCodeViewLayout();
    },
    [data.ref, refreshCodeViewLayout],
  );

  const handleCancelDraft = useCallback(
    (itemId: string, draftId: string, range: SelectedLineRange) => {
      const viewer = viewerRef.current;
      if (!viewer || !codeViewItems) {
        return;
      }

      const item = viewer.getItem(itemId);
      runCodeViewMutationPreservingScroll(
        viewer,
        () => {
          if (item) {
            viewer.updateItem(removeDraftAnnotation(item, draftId));
          }
        },
        () => {
          const activeSelection = selectedLinesRef.current;
          if (
            activeSelection?.id === itemId &&
            activeSelection.range.start === range.start &&
            activeSelection.range.end === range.end &&
            activeSelection.range.side === range.side &&
            activeSelection.range.endSide === range.endSide
          ) {
            setSelectedLines(null);
          }

          if (!hasAnyDraftAnnotation(viewer, codeViewItems.items)) {
            viewer.clearSelectedLines();
            setSelectedLines(null);
            setHoveredThreadSelection(null);
          }
        },
      );
    },
    [codeViewItems],
  );

  const handleImmediateCommentSuccess = useCallback(
    (
      itemId: string,
      comment: GitHubPullRequestReviewComment,
      draftId: string,
      range: SelectedLineRange,
    ) => {
      const viewer = viewerRef.current;
      if (!viewer || !codeViewItems) {
        return;
      }

      const item = viewer.getItem(itemId);
      setLiveReviewComments((comments) => [...comments, comment]);

      runCodeViewMutationPreservingScroll(
        viewer,
        () => {
          if (item) {
            viewer.updateItem(replaceDraftWithThreadAnnotation(item, comment, draftId));
          }
        },
        () => {
          const activeSelection = selectedLinesRef.current;
          if (
            activeSelection?.id === itemId &&
            activeSelection.range.start === range.start &&
            activeSelection.range.end === range.end &&
            activeSelection.range.side === range.side &&
            activeSelection.range.endSide === range.endSide
          ) {
            setSelectedLines(null);
          }

          if (!hasAnyDraftAnnotation(viewer, codeViewItems.items)) {
            viewer.clearSelectedLines();
            setSelectedLines(null);
            setHoveredThreadSelection(null);
          }
        },
      );
    },
    [codeViewItems],
  );

  const codeViewStyle = useMemo(
    () => ({ height: '100%', colorScheme: codeViewThemeType }),
    [codeViewThemeType],
  );

  useEffect(() => {
    if (!notificationError) {
      return;
    }

    const id = setTimeout(() => setNotificationError(null), 6000);
    return () => clearTimeout(id);
  }, [notificationError]);

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

  const stopGitHubKeybindings = useCallback((event: React.KeyboardEvent) => {
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
            onCancel={() => handleCancelDraft(item.id, metadata.draftId, metadata.range)}
            onSuccess={(comment) =>
              handleImmediateCommentSuccess(item.id, comment, metadata.draftId, metadata.range)
            }
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
      handleImmediateCommentSuccess,
      handleReplyClose,
      handleReplyOpen,
      handleReplySuccess,
      handleThreadHighlight,
      handleThreadHighlightClear,
    ],
  );

  const renderReviewHeaderMetadata = useCallback(
    (item: NonNullable<typeof codeViewItems>['items'][number]) => {
      const orphanedThreads = orphanedThreadsByItemIdRef.current?.get(item.id);
      if (!orphanedThreads?.length) {
        return null;
      }

      return (
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
        onClick={onClose}
      />
      <section
        ref={modalRef}
        className='gprv-modal'
        data-theme={codeViewThemeType}
        style={treeThemeVars}
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
          onDiffLayoutChange={updateDiffLayout}
          onDisplayPrefsChange={updateDisplayPrefs}
          onClose={onClose}
          themeStyle={treeThemeStyles}
        />

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
