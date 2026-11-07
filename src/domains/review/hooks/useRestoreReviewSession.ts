import type { CodeViewHandle } from '@pierre/diffs/react';
import { useEffect, useRef, type RefObject } from 'react';

import type { CodeViewItemsResult } from '@/domains/code-view/model/build-items';
import type { ReviewAnnotationMetadata } from '@/domains/code-view/model/comments';
import { runCodeViewMutationPreservingScroll } from '@/domains/code-view/model/scroll-anchor';
import type { GitHubPullRequestRef } from '@/domains/github/api';
import type { QueuedComment } from '@/domains/review/model/comment-queue';
import { addDraftAnnotation, addQueuedAnnotation } from '@/domains/review/model/review-mutations';
import { getReviewSession, type PersistedReviewDraft } from '@/domains/review/state/review-session';

type UseRestoreReviewSessionParams = {
  ref: GitHubPullRequestRef;
  viewerRef: RefObject<CodeViewHandle<ReviewAnnotationMetadata, undefined> | null>;
  codeViewItems: CodeViewItemsResult | null;
  isCodeViewMounted: boolean;
  refreshCodeViewLayout: () => void;
  /** Bumps when CodeView remounts (e.g. after refresh) so drafts/queue re-apply. */
  codeViewInstanceKey: number;
};

function hashLineRange(range: PersistedReviewDraft['range'] | QueuedComment['range']): string {
  return `${range.start}-${range.end}:${range.side ?? ''}:${range.endSide ?? ''}`;
}

function hashReviewSessionContent(
  drafts: readonly PersistedReviewDraft[],
  queue: readonly QueuedComment[],
): string {
  const draftPart = drafts
    .map(
      (draft) =>
        `${draft.draftId}|${draft.itemId}|${draft.path}|${hashLineRange(draft.range)}|${draft.body}`,
    )
    .join(';');
  const queuePart = queue
    .map(
      (entry) =>
        `${entry.queuedId}|${entry.itemId}|${entry.path}|${hashLineRange(entry.range)}|${entry.body}`,
    )
    .join(';');
  return `d:${draftPart}|q:${queuePart}`;
}

/** Re-apply draft + queued annotations after overlay close/reopen or CodeView remount. */
export function useRestoreReviewSession({
  ref,
  viewerRef,
  codeViewItems,
  isCodeViewMounted,
  refreshCodeViewLayout,
  codeViewInstanceKey,
}: UseRestoreReviewSessionParams): void {
  const restoredForKey = useRef<string | null>(null);

  useEffect(() => {
    if (!isCodeViewMounted || codeViewItems == null) {
      return;
    }

    const viewer = viewerRef.current;
    if (!viewer) {
      return;
    }

    const session = getReviewSession(ref);
    const contentHash = hashReviewSessionContent(session.drafts, session.queue);
    const restoreKey = `${ref.owner}/${ref.repo}#${ref.pullNumber}@${codeViewInstanceKey}#${contentHash}`;

    if (restoredForKey.current === restoreKey) {
      return;
    }

    if (session.drafts.length === 0 && session.queue.length === 0) {
      restoredForKey.current = restoreKey;
      return;
    }

    runCodeViewMutationPreservingScroll(viewer, () => {
      for (const draft of session.drafts) {
        const item = viewer.getItem(draft.itemId);
        if (!item) {
          continue;
        }

        const { item: nextItem } = addDraftAnnotation(item, draft.range, draft.draftId);
        viewer.updateItem(nextItem);
      }

      for (const entry of session.queue) {
        const item = viewer.getItem(entry.itemId);
        if (!item) {
          continue;
        }

        viewer.updateItem(addQueuedAnnotation(item, entry.queuedId, entry.range, entry.body));
      }
    });

    restoredForKey.current = restoreKey;
    refreshCodeViewLayout();
  }, [
    codeViewInstanceKey,
    codeViewItems,
    isCodeViewMounted,
    ref,
    refreshCodeViewLayout,
    viewerRef,
  ]);
}
