import type { SelectedLineRange } from '@pierre/diffs';
import type { CodeViewHandle } from '@pierre/diffs/react';
import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';

import type { CodeViewItemsResult } from '@/lib/code-view/build-items';
import { getCodeViewItemIdForFile } from '@/lib/code-view/build-items';
import {
  addThreadAnnotationForComment,
  removeQueuedAnnotation,
  replaceDraftWithQueuedAnnotation,
  updateQueuedAnnotationBody,
} from '@/lib/code-view/review-mutations';
import { runCodeViewMutationPreservingScroll } from '@/lib/code-view/scroll-anchor';
import {
  fetchPullRequestReviewComments,
  type GitHubPullRequestRef,
  type GitHubPullRequestReviewComment,
} from '@/lib/github/api';
import { publishBatchedReview, type ReviewEvent } from '@/lib/github/review-write';
import {
  clearReviewSession,
  getReviewSession,
  removeReviewDraft,
  syncReviewQueue,
} from '@/lib/overlay/review-session';
import { toBatchedReviewComments, type QueuedComment } from '@/lib/review/comment-queue';
import type { ReviewAnnotationMetadata } from '@/lib/review/comments';

type UseReviewQueueParams = {
  viewerRef: RefObject<CodeViewHandle<ReviewAnnotationMetadata> | null>;
  codeViewItems: CodeViewItemsResult | null;
  pullRequestRef: GitHubPullRequestRef;
  headSha: string;
  reviewComments: GitHubPullRequestReviewComment[];
  updateReviewComments: Dispatch<SetStateAction<GitHubPullRequestReviewComment[]>>;
  refreshCodeViewLayout: () => void;
  clearSelectionIfNoDrafts: () => void;
  onClose: () => void;
};

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
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);

  useEffect(() => {
    syncReviewQueue(pullRequestRef, queue, isBatchMode);
  }, [isBatchMode, pullRequestRef, queue]);

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
          setQueue((current) => [...current, { queuedId, itemId, path, range, body }]);
        },
        () => {
          clearSelectionIfNoDrafts();
        },
      );
    },
    [clearSelectionIfNoDrafts, codeViewItems, pullRequestRef, viewerRef],
  );

  const handleRemoveQueued = useCallback(
    (queuedId: string, itemId: string) => {
      const viewer = viewerRef.current;
      setQueue((current) => current.filter((entry) => entry.queuedId !== queuedId));

      if (viewer) {
        const item = viewer.getItem(itemId);
        if (item) {
          runCodeViewMutationPreservingScroll(viewer, () => {
            viewer.updateItem(removeQueuedAnnotation(item, queuedId));
          });
        }
      }
    },
    [viewerRef],
  );

  const handleEditQueued = useCallback(
    (queuedId: string, itemId: string, body: string) => {
      const viewer = viewerRef.current;
      setQueue((current) =>
        current.map((entry) => (entry.queuedId === queuedId ? { ...entry, body } : entry)),
      );

      if (viewer) {
        const item = viewer.getItem(itemId);
        if (item) {
          runCodeViewMutationPreservingScroll(viewer, () => {
            viewer.updateItem(updateQueuedAnnotationBody(item, queuedId, body));
          });
        }
      }
    },
    [viewerRef],
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
        runCodeViewMutationPreservingScroll(viewer, () => {
          for (const entry of queuedSnapshot) {
            const item = viewer.getItem(entry.itemId);
            if (item) {
              viewer.updateItem(removeQueuedAnnotation(item, entry.queuedId));
            }
          }
        });
      }

      setQueue([]);
      setIsPublishDialogOpen(false);
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
      runCodeViewMutationPreservingScroll(viewer, () => {
        for (const entry of queue) {
          const item = viewer.getItem(entry.itemId);
          if (item) {
            viewer.updateItem(removeQueuedAnnotation(item, entry.queuedId));
          }
        }
      });
    }

    setQueue([]);
    setIsPublishDialogOpen(false);
    clearReviewSession(pullRequestRef);
  }, [pullRequestRef, queue, viewerRef]);

  const handleToggleBatchMode = useCallback(() => {
    setIsBatchMode((current) => !current);
  }, []);

  const withQueueConfirm = useCallback(
    (action: () => void) => {
      if (queue.length > 0) {
        const confirmed = window.confirm(
          `Discard ${queue.length} queued review ${queue.length === 1 ? 'comment' : 'comments'}? They have not been published to GitHub.`,
        );
        if (!confirmed) {
          return;
        }
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
  };
}
