import type { CodeViewLineSelection, SelectedLineRange } from '@pierre/diffs';
import type { CodeViewHandle } from '@pierre/diffs/react';
import {
  useCallback,
  useEffect,
  useState,
  type MutableRefObject,
  type RefObject,
  type Dispatch,
  type SetStateAction,
} from 'react';

import { getReviewReplyKey } from '@/components/review/ReviewCommentThread';
import type { CodeViewItemsResult } from '@/lib/code-view/build-items';
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
import { runCodeViewMutationPreservingScroll } from '@/lib/code-view/scroll-anchor';
import type { GitHubPullRequestRef, GitHubPullRequestReviewComment } from '@/lib/github/api';
import {
  deleteReviewComment,
  GitHubReviewWriteError,
  updateReviewComment,
} from '@/lib/github/review-write';
import { removeReviewDraft, upsertReviewDraft } from '@/lib/overlay/review-session';
import { getItemPath, type ReviewAnnotationMetadata } from '@/lib/review/comments';
import {
  closeAllReplyComposers,
  closeReplyComposer,
  openReplySession,
} from '@/lib/review/reply-session';

type UseCodeViewReviewMutationsParams = {
  viewerRef: RefObject<CodeViewHandle<ReviewAnnotationMetadata> | null>;
  modalRef: RefObject<HTMLElement | null>;
  codeViewItems: CodeViewItemsResult | null;
  pullRequestRef: GitHubPullRequestRef;
  updateReviewComments: Dispatch<SetStateAction<GitHubPullRequestReviewComment[]>>;
  refreshCodeViewLayout: () => void;
  selectedLinesRef: MutableRefObject<CodeViewLineSelection | null>;
  setSelectedLines: (selection: CodeViewLineSelection | null) => void;
  setHoveredThreadSelection: (selection: CodeViewLineSelection | null) => void;
  itemById: Map<string, CodeViewItemsResult['items'][number]> | undefined;
  setSelectedPath: (updater: string | null | ((current: string | null) => string | null)) => void;
  isOpeningDraftRef: MutableRefObject<boolean>;
};

export function useCodeViewReviewMutations({
  viewerRef,
  modalRef,
  codeViewItems,
  pullRequestRef,
  updateReviewComments,
  refreshCodeViewLayout,
  selectedLinesRef,
  setSelectedLines,
  setHoveredThreadSelection,
  itemById,
  setSelectedPath,
  isOpeningDraftRef,
}: UseCodeViewReviewMutationsParams) {
  const [notificationError, setNotificationError] = useState<string | null>(null);

  useEffect(() => {
    if (!notificationError) {
      return;
    }

    const id = setTimeout(() => setNotificationError(null), 6000);
    return () => clearTimeout(id);
  }, [notificationError]);

  const clearSelectionIfNoDrafts = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer || !codeViewItems) {
      return;
    }

    if (!hasAnyDraftAnnotation(viewer, codeViewItems.items)) {
      viewer.clearSelectedLines();
      setSelectedLines(null);
      setHoveredThreadSelection(null);
    }
  }, [codeViewItems, setHoveredThreadSelection, setSelectedLines, viewerRef]);

  const clearDraftSelectionIfActive = useCallback(
    (itemId: string, range: SelectedLineRange) => {
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
    },
    [selectedLinesRef, setSelectedLines],
  );

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
  }, [codeViewItems, viewerRef]);

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

          const { item: nextItem, draftId } = addDraftAnnotation(targetItem, selection.range);
          viewer.updateItem(nextItem);

          const path = getItemPath(targetItem);
          upsertReviewDraft(pullRequestRef, {
            itemId: selection.id,
            path,
            draftId,
            range: selection.range,
            body: '',
          });
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
    [
      codeViewItems,
      isOpeningDraftRef,
      itemById,
      modalRef,
      pullRequestRef,
      setSelectedLines,
      setSelectedPath,
      viewerRef,
    ],
  );

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
    [clearAllDrafts, modalRef, setHoveredThreadSelection, setSelectedLines, viewerRef],
  );

  const handleReplyClose = useCallback(
    (replyKey: string) => {
      if (modalRef.current) {
        closeReplyComposer(modalRef.current, replyKey);
      }
    },
    [modalRef],
  );

  const handleReplySuccess = useCallback(
    (
      itemId: string,
      comment: GitHubPullRequestReviewComment,
      replyKey: string,
      isOrphaned = false,
    ) => {
      const viewer = viewerRef.current;
      const modal = modalRef.current;

      updateReviewComments((comments) => [...comments, comment]);
      if (!isOrphaned) {
        const item = viewer?.getItem(itemId);
        if (item) {
          viewer?.updateItem(appendReplyToThreadAnnotation(item, comment));
        }
      }

      if (modal) {
        closeReplyComposer(modal, replyKey, { clearDraft: true });
      }

      refreshCodeViewLayout();
    },
    [modalRef, pullRequestRef, refreshCodeViewLayout, updateReviewComments, viewerRef],
  );

  const handleCommentDelete = useCallback(
    async (itemId: string, comment: GitHubPullRequestReviewComment, isOrphaned = false) => {
      const viewer = viewerRef.current;
      const modal = modalRef.current;
      const replyKey = getReviewReplyKey(itemId, comment.id);

      try {
        await deleteReviewComment(pullRequestRef, comment.id);
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

      updateReviewComments((comments) => comments.filter((entry) => entry.id !== comment.id));

      if (!isOrphaned) {
        const item = viewer?.getItem(itemId);
        if (item) {
          viewer?.updateItem(removeCommentFromAnnotation(item, comment.id));
        }
      }

      if (modal) {
        closeReplyComposer(modal, replyKey, { clearDraft: true });
      }

      refreshCodeViewLayout();
    },
    [modalRef, pullRequestRef, refreshCodeViewLayout, updateReviewComments, viewerRef],
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
        updated = await updateReviewComment(pullRequestRef, comment.id, body);
      } catch (error: unknown) {
        if (error instanceof GitHubReviewWriteError) {
          throw error;
        }

        throw new Error(error instanceof Error ? error.message : String(error), { cause: error });
      }

      updateReviewComments((comments) =>
        comments.map((entry) => (entry.id === updated.id ? updated : entry)),
      );

      if (!isOrphaned) {
        const item = viewer?.getItem(itemId);
        if (item) {
          viewer?.updateItem(updateCommentInAnnotation(item, updated));
        }
      }

      refreshCodeViewLayout();
    },
    [pullRequestRef, refreshCodeViewLayout, updateReviewComments, viewerRef],
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
          removeReviewDraft(pullRequestRef, draftId);
        },
        () => {
          clearDraftSelectionIfActive(itemId, range);
          clearSelectionIfNoDrafts();
        },
      );
    },
    [
      clearDraftSelectionIfActive,
      clearSelectionIfNoDrafts,
      codeViewItems,
      pullRequestRef,
      viewerRef,
    ],
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
      updateReviewComments((comments) => [...comments, comment]);
      removeReviewDraft(pullRequestRef, draftId);

      runCodeViewMutationPreservingScroll(
        viewer,
        () => {
          if (item) {
            viewer.updateItem(replaceDraftWithThreadAnnotation(item, comment, draftId));
          }
        },
        () => {
          clearDraftSelectionIfActive(itemId, range);
          clearSelectionIfNoDrafts();
        },
      );
    },
    [
      clearDraftSelectionIfActive,
      clearSelectionIfNoDrafts,
      codeViewItems,
      pullRequestRef,
      updateReviewComments,
      viewerRef,
    ],
  );

  return {
    notificationError,
    setNotificationError,
    clearAllDrafts,
    openDraftComposer,
    handleReplyOpen,
    handleReplyClose,
    handleReplySuccess,
    handleCommentDelete,
    handleCommentEdit,
    handleCancelDraft,
    handleImmediateCommentSuccess,
    clearSelectionIfNoDrafts,
  };
}
