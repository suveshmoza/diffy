import type {
  CodeViewLineSelection,
  CodeViewOptions,
  DiffLineAnnotation,
  LineAnnotation,
  SelectedLineRange,
} from '@pierre/diffs';
import { CodeView, type CodeViewHandle } from '@pierre/diffs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useCodeViewItems } from '@/hooks/useCodeViewItems';
import { useCodeViewHostReady, useCodeViewLayoutRefresh } from '@/hooks/useCodeViewLayoutRefresh';
import { useCodeViewThemeBootstrap } from '@/hooks/useCodeViewThemeBootstrap';
import { useTreeThemeStyles, pickTreeThemeCustomProperties } from '@/hooks/useTreeThemeStyles';
import {
  getCodeViewItemIdForFile,
  invalidateCodeViewItemsCache,
} from '@/lib/build-code-view-items';
import {
  addDraftAnnotation,
  appendReplyToThreadAnnotation,
  hasAnyDraftAnnotation,
  hasDraftAnnotation,
  removeCommentFromAnnotation,
  removeDraftAnnotation,
  replaceDraftWithThreadAnnotation,
  updateCommentInAnnotation,
} from '@/lib/code-view-review-mutations';
import { runCodeViewMutationPreservingScroll } from '@/lib/code-view-scroll-anchor';
import {
  DEFAULT_DIFF_LAYOUT,
  readDiffLayoutPreference,
  writeDiffLayoutPreference,
  type DiffLayout,
} from '@/lib/diff-layout-prefs';
import {
  getGitHubToken,
  type GitHubPullRequestReviewComment,
  type PullRequestDiffData,
} from '@/lib/github';
import {
  deleteReviewComment,
  fetchGitHubViewer,
  GitHubReviewWriteError,
  updateReviewComment,
  type GitHubViewer,
} from '@/lib/github-review-write';
import {
  bindReplySession,
  closeAllReplyComposers,
  closeReplyComposer,
  openReplySession,
} from '@/lib/reply-session';
import {
  buildReviewCommentCountByPath,
  getItemPath,
  type ReviewAnnotationMetadata,
  type ReviewThreadMetadata,
} from '@/lib/review-comments';

import { DiffOverlayHeader } from './DiffOverlayHeader';
import { FileTreePanel } from './FileTreePanel';
import { OrphanedReviewCommentsBadge } from './OrphanedReviewCommentsBadge';
import { ReviewCommentComposer } from './ReviewCommentComposer';
import { ReviewCommentThread, getReviewReplyKey } from './ReviewCommentThread';

type DiffOverlayProps = {
  data: PullRequestDiffData;
  onClose: () => void;
};

export function DiffOverlay({ data, onClose }: DiffOverlayProps) {
  const viewerRef = useRef<CodeViewHandle<ReviewAnnotationMetadata>>(null);
  const codeViewHostRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLElement>(null);
  const selectedLinesRef = useRef<CodeViewLineSelection | null>(null);
  const hoveredThreadSelectionRef = useRef<CodeViewLineSelection | null>(null);
  const orphanedThreadsByItemIdRef = useRef<
    ReadonlyMap<string, ReviewThreadMetadata[]> | undefined
  >(undefined);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedLines, setSelectedLines] = useState<CodeViewLineSelection | null>(null);
  const [hoveredThreadSelection, setHoveredThreadSelection] =
    useState<CodeViewLineSelection | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [diffLayout, setDiffLayout] = useState<DiffLayout>(DEFAULT_DIFF_LAYOUT);
  const [liveReviewComments, setLiveReviewComments] = useState(data.reviewComments);
  const [viewerUser, setViewerUser] = useState<GitHubViewer | null>(null);
  const [hasToken, setHasToken] = useState(false);

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

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    void (async () => {
      const token = await getGitHubToken();
      if (isCancelled) {
        return;
      }

      setHasToken(token != null);
      if (!token) {
        setViewerUser(null);
        return;
      }

      const viewer = await fetchGitHubViewer();
      if (!isCancelled) {
        setViewerUser(viewer);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, []);

  const augmentedData = useMemo(
    () => ({
      ...data,
      reviewComments: liveReviewComments,
    }),
    [data, liveReviewComments],
  );

  const { theme, isThemeReady, codeViewOptions, codeViewThemeType } = useCodeViewThemeBootstrap({
    diffLayout,
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

      runCodeViewMutationPreservingScroll(
        viewer,
        () => {
          const targetItem = viewer.getItem(selection.id);
          if (!targetItem) {
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
        },
      );
    },
    [codeViewItems, itemById],
  );

  const handleGutterUtilityClick = useCallback(
    (range: SelectedLineRange, context: { item: { id: string } }) => {
      openDraftComposer({ id: context.item.id, range });
    },
    [openDraftComposer],
  );

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
      codeViewOptionsWithInteractions,
    ]);

  useEffect(() => {
    if (!isCodeViewMounted || codeViewOptionsWithInteractions == null) {
      return;
    }

    viewerRef.current?.getInstance()?.render(true);
    refreshCodeViewLayout();
  }, [codeViewOptionsWithInteractions, isCodeViewMounted, refreshCodeViewLayout]);

  useEffect(() => {
    if (!isCodeViewMounted) {
      return;
    }

    viewerRef.current?.getInstance()?.render(true);
    refreshCodeViewLayout();
  }, [theme, isCodeViewMounted, refreshCodeViewLayout]);

  useEffect(() => {
    if (!isCodeViewMounted) {
      return;
    }

    refreshCodeViewLayout();
  }, [isCodeViewMounted, codeViewItems, refreshCodeViewLayout]);

  const handleThreadHighlight = useCallback((selection: CodeViewLineSelection) => {
    setHoveredThreadSelection(selection);
  }, []);

  const handleThreadHighlightClear = useCallback(() => {
    setHoveredThreadSelection(null);
  }, []);

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
        window.alert(message);
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

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((collapsed) => !collapsed);
  }, []);

  const updateDiffLayout = useCallback((nextLayout: DiffLayout) => {
    setDiffLayout(nextLayout);
    void writeDiffLayoutPreference(nextLayout);
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

  const handleSelectedLinesChange = useCallback(
    (selection: CodeViewLineSelection | null) => {
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
    },
    [codeViewItems, itemById],
  );

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
            viewerUser={viewerUser}
            hasToken={hasToken}
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
          viewerUser={viewerUser}
          hasToken={hasToken}
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
      hasToken,
      viewerUser,
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
          viewerUser={viewerUser}
          hasToken={hasToken}
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
      hasToken,
      viewerUser,
    ],
  );

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
          diffLayout={diffLayout}
          isSidebarCollapsed={isSidebarCollapsed}
          reviewCommentsLoadError={data.reviewCommentsLoadError}
          onToggleSidebar={handleToggleSidebar}
          onDiffLayoutChange={updateDiffLayout}
          onClose={onClose}
          themeStyle={treeThemeStyles}
        />

        <div className={`gprv-body${isSidebarCollapsed ? ' gprv-body-sidebar-collapsed' : ''}`}>
          {isSidebarCollapsed ? null : (
            <aside className='gprv-sidebar'>
              {data.files.length > 0 && codeViewItems ? (
                <FileTreePanel
                  files={data.files}
                  selectedPath={selectedPath}
                  reviewCommentCountByPath={reviewCommentCountByPath}
                  onSelectPath={handleTreeSelect}
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
            ) : isCodeViewMounted && codeViewItems ? (
              <CodeView<ReviewAnnotationMetadata>
                ref={viewerRef}
                containerRef={handleCodeViewContainer}
                initialItems={codeViewItems.items}
                className='gprv-code-view'
                style={codeViewStyle}
                renderAnnotation={renderReviewAnnotation}
                renderHeaderMetadata={renderReviewHeaderMetadata}
                options={codeViewOptionsWithInteractions ?? codeViewOptions}
                selectedLines={hoveredThreadSelection ?? selectedLines}
                onSelectedLinesChange={handleSelectedLinesChange}
              />
            ) : (
              <div className='gprv-state'>
                {isBuilding ? 'Building diff…' : 'Preparing diff viewer…'}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
