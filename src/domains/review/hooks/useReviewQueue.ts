import type { SelectedLineRange } from '@pierre/diffs';
import type { CodeViewHandle } from '@pierre/diffs/react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';

import type { CodeViewItemsResult } from '@/domains/code-view/model/build-items';
import { getCodeViewItemIdForFile } from '@/domains/code-view/model/build-items';
import type { ReviewAnnotationMetadata } from '@/domains/code-view/model/comments';
import { runCodeViewMutationPreservingScroll } from '@/domains/code-view/model/scroll-anchor';
import {
  fetchPullRequestReviewComments,
  type GitHubPullRequestRef,
  type GitHubPullRequestReviewComment,
} from '@/domains/github/api';
import { publishBatchedReview, type ReviewEvent } from '@/domains/github/review-write';
import { toBatchedReviewComments, type QueuedComment } from '@/domains/review/model/comment-queue';
import { confirmDiscardQueuedComments } from '@/domains/review/model/publish-review';
import {
  addThreadAnnotationForComment,
  removeQueuedAnnotation,
  replaceDraftWithQueuedAnnotation,
  updateQueuedAnnotationBody,
} from '@/domains/review/model/review-mutations';
import {
  clearReviewSession,
  getReviewSession,
  removeReviewDraft,
  syncReviewQueue,
} from '@/domains/review/state/review-session';

type UseReviewQueueParams = {
  viewerRef: RefObject<CodeViewHandle<ReviewAnnotationMetadata, undefined> | null>;
  codeViewItems: CodeViewItemsResult | null;
  pullRequestRef: GitHubPullRequestRef;
  headSha: string;
  reviewComments: GitHubPullRequestReviewComment[];
  updateReviewComments: Dispatch<SetStateAction<GitHubPullRequestReviewComment[]>>;
  refreshCodeViewLayout: () => void;
  clearSelectionIfNoDrafts: () => void;
  onClose: () => void;
};

function clearQueuedAnnotations(
  viewer: CodeViewHandle<ReviewAnnotationMetadata, undefined>,
  queue: readonly QueuedComment[],
): void {
  runCodeViewMutationPreservingScroll(viewer, () => {
    for (const entry of queue) {
      const item = viewer.getItem(entry.itemId);
      if (item) {
        viewer.updateItem(removeQueuedAnnotation(item, entry.queuedId));
      }
    }
  });
}

export function useReviewQueue({
  viewerRef,
  codeViewItems,
  pullRequestRef,
  headSha,
  reviewComments,
  updateReviewComments,
  refreshCodeViewLayout,
  clearSelectionIfNoDrafts,
  onClose,
}: UseReviewQueueParams) {
  const initialSession = getReviewSession(pullRequestRef);
  const [isBatchMode, setIsBatchMode] = useState(initialSession.isBatchMode);
  const [queue, setQueue] = useState<QueuedComment[]>(() => initialSession.queue);
  const [isReviewDockExpanded, setIsReviewDockExpanded] = useState(false);
  const queueRef = useRef(queue);
  const isBatchModeRef = useRef(isBatchMode);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    isBatchModeRef.current = isBatchMode;
  }, [isBatchMode]);

  const persistQueue = useCallback(
    (nextQueue: QueuedComment[], nextBatchMode: boolean) => {
      syncReviewQueue(pullRequestRef, nextQueue, nextBatchMode);
    },
    [pullRequestRef],
  );

  const handleQueueComment = useCallback(
    (itemId: string, path: string, draftId: string, range: SelectedLineRange, body: string) => {
      const viewer = viewerRef.current;
      if (!viewer || !codeViewItems) {
        return;
      }

      const item = viewer.getItem(itemId);
      if (!item) {
        return;
      }

      runCodeViewMutationPreservingScroll(
        viewer,
        () => {
          const { item: nextItem, queuedId } = replaceDraftWithQueuedAnnotation(
            item,
            draftId,
            range,
            body,
          );
          viewer.updateItem(nextItem);
          removeReviewDraft(pullRequestRef, draftId);
          setQueue((current) => {
            const next = [...current, { queuedId, itemId, path, range, body }];
            persistQueue(next, isBatchModeRef.current);
            return next;
          });
        },
        () => {
          clearSelectionIfNoDrafts();
        },
      );
    },
    [clearSelectionIfNoDrafts, codeViewItems, persistQueue, pullRequestRef, viewerRef],
  );

  const handleRemoveQueued = useCallback(
    (queuedId: string, itemId: string) => {
      const viewer = viewerRef.current;
      setQueue((current) => {
        const next = current.filter((entry) => entry.queuedId !== queuedId);
        persistQueue(next, isBatchModeRef.current);
        return next;
      });

      if (viewer) {
        const item = viewer.getItem(itemId);
        if (item) {
          runCodeViewMutationPreservingScroll(viewer, () => {
            viewer.updateItem(removeQueuedAnnotation(item, queuedId));
          });
        }
      }
    },
    [persistQueue, viewerRef],
  );

  const handleEditQueued = useCallback(
    (queuedId: string, itemId: string, body: string) => {
      const viewer = viewerRef.current;
      setQueue((current) => {
        const next = current.map((entry) =>
          entry.queuedId === queuedId ? { ...entry, body } : entry,
        );
        persistQueue(next, isBatchModeRef.current);
        return next;
      });

      if (viewer) {
        const item = viewer.getItem(itemId);
        if (item) {
          runCodeViewMutationPreservingScroll(viewer, () => {
            viewer.updateItem(updateQueuedAnnotationBody(item, queuedId, body));
          });
        }
      }
    },
    [persistQueue, viewerRef],
  );

  const handlePublishReview = useCallback(
    async (event: ReviewEvent, body: string) => {
      await publishBatchedReview(pullRequestRef, {
        commitId: headSha,
        event,
        body,
        comments: toBatchedReviewComments(queue),
      });

      const viewer = viewerRef.current;
      const queuedSnapshot = queue;

      let fresh: GitHubPullRequestReviewComment[] = [];
      try {
        fresh = await fetchPullRequestReviewComments(pullRequestRef);
      } catch {
        // Comments published; reflecting them inline is best-effort.
      }

      if (fresh.length > 0) {
        const knownIds = new Set(reviewComments.map((comment) => comment.id));
        const added = fresh.filter((comment) => !knownIds.has(comment.id));
        updateReviewComments(fresh);

        if (viewer && codeViewItems && added.length > 0) {
          runCodeViewMutationPreservingScroll(viewer, () => {
            for (const comment of added) {
              const file = codeViewItems.fileByPath.get(comment.path);
              if (!file) {
                continue;
              }
              const id = getCodeViewItemIdForFile(file, codeViewItems.diffPathSet);
              const item = viewer.getItem(id);
              if (item) {
                viewer.updateItem(addThreadAnnotationForComment(item, comment));
              }
            }
          });
        }
      }

      if (viewer) {
        clearQueuedAnnotations(viewer, queuedSnapshot);
      }

      setQueue([]);
      setIsReviewDockExpanded(false);
      setIsBatchMode(false);
      clearReviewSession(pullRequestRef);
      refreshCodeViewLayout();
    },
    [
      codeViewItems,
      headSha,
      reviewComments,
      pullRequestRef,
      queue,
      refreshCodeViewLayout,
      updateReviewComments,
      viewerRef,
    ],
  );

  const handleDiscardQueue = useCallback(() => {
    const viewer = viewerRef.current;
    if (viewer) {
      clearQueuedAnnotations(viewer, queue);
    }

    setQueue([]);
    setIsReviewDockExpanded(false);
    clearReviewSession(pullRequestRef);
  }, [pullRequestRef, queue, viewerRef]);

  const handleStopReview = useCallback(() => {
    if (queue.length > 0) {
      if (!confirmDiscardQueuedComments(queue.length, { stopReview: true })) {
        return;
      }

      const viewer = viewerRef.current;
      if (viewer) {
        clearQueuedAnnotations(viewer, queue);
      }

      setQueue([]);
      clearReviewSession(pullRequestRef);
    }

    setIsReviewDockExpanded(false);
    setIsBatchMode(false);
    if (queue.length === 0) {
      persistQueue([], false);
    }
  }, [persistQueue, pullRequestRef, queue, viewerRef]);

  const handleStartReview = useCallback(() => {
    setIsBatchMode(true);
    persistQueue(queueRef.current, true);
  }, [persistQueue]);

  const expandReviewDock = useCallback(() => {
    setIsReviewDockExpanded(true);
  }, []);

  const collapseReviewDock = useCallback(() => {
    setIsReviewDockExpanded(false);
  }, []);

  const withQueueConfirm = useCallback(
    (action: () => void) => {
      if (!confirmDiscardQueuedComments(queue.length)) {
        return;
      }

      action();
    },
    [queue.length],
  );

  const handleCloseOverlay = useCallback(() => {
    withQueueConfirm(onClose);
  }, [onClose, withQueueConfirm]);

  return {
    isBatchMode,
    queue,
    isReviewDockExpanded,
    expandReviewDock,
    collapseReviewDock,
    handleQueueComment,
    handleRemoveQueued,
    handleEditQueued,
    handlePublishReview,
    handleDiscardQueue,
    handleStartReview,
    handleStopReview,
    handleCloseOverlay,
    withQueueConfirm,
  };
}
