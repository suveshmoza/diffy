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
import {
  getCodeViewItemIdForFile,
  invalidateCodeViewItemsCache,
} from '@/lib/build-code-view-items';
import {
  hasDraftAnnotation,
  promotePendingToThread,
  removeDraftAnnotation,
  removePendingAnnotationsForReview,
  replaceDraftWithPendingAnnotation,
  replaceDraftWithThreadAnnotation,
  upsertDraftAnnotation,
} from '@/lib/code-view-review-mutations';
import {
  DEFAULT_DIFF_LAYOUT,
  readDiffLayoutPreference,
  writeDiffLayoutPreference,
  type DiffLayout,
} from '@/lib/diff-layout-prefs';
import {
  getGitHubToken,
  invalidatePullRequestDiffCache,
  type GitHubPullRequestReviewComment,
  type PullRequestDiffData,
} from '@/lib/github';
import {
  fetchGitHubViewer,
  fetchPullRequestReviewComments,
  findPendingReviewForViewer,
  type GitHubViewer,
} from '@/lib/github-review-write';
import {
  buildReviewCommentCountByPath,
  filterPendingReviewComments,
  getItemPath,
  type ReviewAnnotationMetadata,
  type ReviewThreadMetadata,
} from '@/lib/review-comments';

import { DiffOverlayHeader } from './DiffOverlayHeader';
import { FileTreePanel } from './FileTreePanel';
import { OrphanedReviewCommentsBadge } from './OrphanedReviewCommentsBadge';
import { ReviewCommentComposer } from './ReviewCommentComposer';
import { ReviewCommentThread } from './ReviewCommentThread';
import { ReviewSessionBar } from './ReviewSessionBar';

type DiffOverlayProps = {
  data: PullRequestDiffData;
  onClose: () => void;
};

export function DiffOverlay({ data, onClose }: DiffOverlayProps) {
  const viewerRef = useRef<CodeViewHandle<ReviewAnnotationMetadata>>(null);
  const codeViewHostRef = useRef<HTMLDivElement>(null);
  const selectedLinesRef = useRef<CodeViewLineSelection | null>(null);
  const orphanedThreadsByItemIdRef = useRef<
    ReadonlyMap<string, ReviewThreadMetadata[]> | undefined
  >(undefined);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedLines, setSelectedLines] = useState<CodeViewLineSelection | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [diffLayout, setDiffLayout] = useState<DiffLayout>(DEFAULT_DIFF_LAYOUT);
  const [liveReviewComments, setLiveReviewComments] = useState(data.reviewComments);
  const [pendingReviewId, setPendingReviewId] = useState<number | null>(null);
  const [pendingReviewComments, setPendingReviewComments] = useState<
    GitHubPullRequestReviewComment[]
  >([]);
  const [viewerUser, setViewerUser] = useState<GitHubViewer | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [isReviewBusy, setIsReviewBusy] = useState(false);

  selectedLinesRef.current = selectedLines;
  const pendingReviewIdRef = useRef(pendingReviewId);
  pendingReviewIdRef.current = pendingReviewId;

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
      reviewComments:
        pendingReviewId == null
          ? liveReviewComments
          : liveReviewComments.filter(
              (comment) => comment.pull_request_review_id !== pendingReviewId,
            ),
    }),
    [data, liveReviewComments, pendingReviewId],
  );

  const { isThemeReady, codeViewOptions, codeViewThemeType } = useCodeViewThemeBootstrap({
    diffLayout,
  });

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

    const combined = [...liveReviewComments, ...pendingReviewComments];
    return buildReviewCommentCountByPath(combined, codeViewItems.items);
  }, [codeViewItems, liveReviewComments, pendingReviewComments]);

  const clearAllDrafts = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer || !codeViewItems) {
      return;
    }

    for (const item of codeViewItems.items) {
      const liveItem = viewer.getItem(item.id);
      if (!liveItem || !hasDraftAnnotation(liveItem)) {
        continue;
      }

      viewer.updateItem(removeDraftAnnotation(liveItem));
    }
  }, [codeViewItems]);

  const openDraftComposer = useCallback(
    (selection: CodeViewLineSelection) => {
      const viewer = viewerRef.current;
      if (!viewer || !codeViewItems) {
        return;
      }

      clearAllDrafts();

      const targetItem = viewer.getItem(selection.id);
      if (!targetItem) {
        return;
      }

      viewer.updateItem(upsertDraftAnnotation(targetItem, selection.range));
      refreshCodeViewLayoutRef.current?.();
    },
    [clearAllDrafts, codeViewItems],
  );

  const refreshCodeViewLayoutRef = useRef<(() => void) | null>(null);

  const handleGutterUtilityClick = useCallback(
    (_range: SelectedLineRange) => {
      const selection = viewerRef.current?.getSelectedLines() ?? selectedLinesRef.current;
      if (!selection) {
        return;
      }

      openDraftComposer(selection);
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

  refreshCodeViewLayoutRef.current = refreshCodeViewLayout;

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

    refreshCodeViewLayout();
  }, [isCodeViewMounted, codeViewItems, refreshCodeViewLayout]);

  const attachPendingAnnotationsForReview = useCallback(
    (reviewId: number, comments: GitHubPullRequestReviewComment[]) => {
      const viewer = viewerRef.current;
      if (!viewer || !codeViewItems) {
        return;
      }

      for (const comment of comments) {
        const itemId = [...codeViewItems.items].find(
          (item) => getItemPath(item) === comment.path,
        )?.id;
        if (!itemId) {
          continue;
        }

        const item = viewer.getItem(itemId);
        if (!item) {
          continue;
        }

        const alreadyPresent = (item.annotations ?? []).some(
          (annotation) =>
            annotation.metadata?.kind === 'pending' &&
            annotation.metadata.comments[0]?.id === comment.id,
        );
        if (alreadyPresent) {
          continue;
        }

        viewer.updateItem(replaceDraftWithPendingAnnotation(item, comment, reviewId));
      }

      refreshCodeViewLayout();
    },
    [codeViewItems, refreshCodeViewLayout],
  );

  useEffect(() => {
    if (!isCodeViewMounted || !viewerUser) {
      return;
    }

    let isCancelled = false;

    void (async () => {
      const pendingReview = await findPendingReviewForViewer(data.ref, viewerUser.login);
      if (isCancelled || !pendingReview) {
        return;
      }

      setPendingReviewId(pendingReview.id);
      const pendingComments = filterPendingReviewComments(data.reviewComments, pendingReview.id);
      setPendingReviewComments(pendingComments);
      setLiveReviewComments((comments) =>
        comments.filter((comment) => comment.pull_request_review_id !== pendingReview.id),
      );
      attachPendingAnnotationsForReview(pendingReview.id, pendingComments);
    })();

    return () => {
      isCancelled = true;
    };
  }, [
    attachPendingAnnotationsForReview,
    data.ref,
    data.reviewComments,
    isCodeViewMounted,
    viewerUser,
  ]);

  const removePendingAnnotations = useCallback(
    (reviewId: number) => {
      const viewer = viewerRef.current;
      if (!viewer || !codeViewItems) {
        return;
      }

      for (const item of codeViewItems.items) {
        const liveItem = viewer.getItem(item.id);
        if (!liveItem) {
          continue;
        }

        viewer.updateItem(removePendingAnnotationsForReview(liveItem, reviewId));
      }

      refreshCodeViewLayout();
    },
    [codeViewItems, refreshCodeViewLayout],
  );

  const handleCancelDraft = useCallback(
    (itemId: string) => {
      const viewer = viewerRef.current;
      if (!viewer) {
        return;
      }

      const item = viewer.getItem(itemId);
      if (item) {
        viewer.updateItem(removeDraftAnnotation(item));
      }

      viewer.clearSelectedLines();
      setSelectedLines(null);
      refreshCodeViewLayout();
    },
    [refreshCodeViewLayout],
  );

  const handleImmediateCommentSuccess = useCallback(
    (itemId: string, comment: GitHubPullRequestReviewComment) => {
      const viewer = viewerRef.current;
      if (!viewer) {
        return;
      }

      const item = viewer.getItem(itemId);
      if (item) {
        viewer.updateItem(replaceDraftWithThreadAnnotation(item, comment));
      }

      setLiveReviewComments((comments) => [...comments, comment]);
      viewer.clearSelectedLines();
      setSelectedLines(null);
      refreshCodeViewLayout();
    },
    [refreshCodeViewLayout],
  );

  const handlePendingCommentSuccess = useCallback(
    (itemId: string, comment: GitHubPullRequestReviewComment) => {
      const viewer = viewerRef.current;
      if (!viewer || pendingReviewId == null) {
        return;
      }

      const item = viewer.getItem(itemId);
      if (item) {
        viewer.updateItem(replaceDraftWithPendingAnnotation(item, comment, pendingReviewId));
      }

      setPendingReviewComments((comments) => [...comments, comment]);
      viewer.clearSelectedLines();
      setSelectedLines(null);
      refreshCodeViewLayout();
    },
    [pendingReviewId, refreshCodeViewLayout],
  );

  const handleReviewSubmitted = useCallback(async () => {
    const reviewId = pendingReviewIdRef.current;
    const commentsToPromote = [...pendingReviewComments];

    if (reviewId != null) {
      removePendingAnnotations(reviewId);

      const viewer = viewerRef.current;
      if (viewer && codeViewItems) {
        for (const comment of commentsToPromote) {
          const itemId = codeViewItems.items.find((item) => getItemPath(item) === comment.path)?.id;
          if (!itemId) {
            continue;
          }

          const item = viewer.getItem(itemId);
          if (!item) {
            continue;
          }

          viewer.updateItem(promotePendingToThread(item, comment, reviewId));
        }
      }
    }

    setLiveReviewComments((comments) => [...comments, ...commentsToPromote]);
    setPendingReviewComments([]);

    try {
      const refreshed = await fetchPullRequestReviewComments(data.ref);
      setLiveReviewComments(refreshed);
    } catch {
      // Keep locally promoted comments when refresh fails.
    }

    invalidatePullRequestDiffCache(data.ref);
    invalidateCodeViewItemsCache(data.ref);
    refreshCodeViewLayout();
  }, [
    codeViewItems,
    data.ref,
    pendingReviewComments,
    refreshCodeViewLayout,
    removePendingAnnotations,
  ]);

  const handleReviewDiscarded = useCallback(() => {
    if (pendingReviewId != null) {
      removePendingAnnotations(pendingReviewId);
    }
    setPendingReviewComments([]);
    refreshCodeViewLayout();
  }, [pendingReviewId, refreshCodeViewLayout, removePendingAnnotations]);

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
    [itemById],
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
            path={getItemPath(item)}
            range={metadata.range}
            pullRequestRef={data.ref}
            commitId={data.pullRequest.head.sha}
            pendingReviewId={pendingReviewId}
            viewerUser={viewerUser}
            hasToken={hasToken}
            onCancel={() => handleCancelDraft(item.id)}
            onImmediateSuccess={(comment) => handleImmediateCommentSuccess(item.id, comment)}
            onPendingSuccess={(comment) => handlePendingCommentSuccess(item.id, comment)}
          />
        );
      }

      if (metadata.kind === 'pending') {
        return (
          <ReviewCommentThread
            annotation={annotation}
            showPendingBadge
          />
        );
      }

      return <ReviewCommentThread annotation={annotation} />;
    },
    [
      data.pullRequest.head.sha,
      data.ref,
      handleCancelDraft,
      handleImmediateCommentSuccess,
      handlePendingCommentSuccess,
      hasToken,
      pendingReviewId,
      viewerUser,
    ],
  );

  const renderReviewHeaderMetadata = useCallback(
    (item: NonNullable<typeof codeViewItems>['items'][number]) => {
      const orphanedThreads = orphanedThreadsByItemIdRef.current?.get(item.id);
      if (!orphanedThreads?.length) {
        return null;
      }

      return <OrphanedReviewCommentsBadge threads={orphanedThreads} />;
    },
    [],
  );

  return (
    <>
      <div
        className='gprv-backdrop'
        onClick={onClose}
      />
      <section
        className='gprv-modal'
        data-theme={codeViewThemeType}
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
        />

        <ReviewSessionBar
          pullRequestRef={data.ref}
          commitId={data.pullRequest.head.sha}
          pendingReviewId={pendingReviewId}
          pendingCommentCount={pendingReviewComments.length}
          hasToken={hasToken}
          isBusy={isReviewBusy}
          onPendingReviewIdChange={setPendingReviewId}
          onReviewSubmitted={() => void handleReviewSubmitted()}
          onReviewDiscarded={handleReviewDiscarded}
          onBusyChange={setIsReviewBusy}
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
                selectedLines={selectedLines}
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
