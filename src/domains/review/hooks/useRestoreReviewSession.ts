import type { CodeViewHandle } from '@pierre/diffs/react';
import { useEffect, useRef, type RefObject } from 'react';

import type { CodeViewItemsResult } from '@/domains/code-view/model/build-items';
import type { ReviewAnnotationMetadata } from '@/domains/code-view/model/comments';
import { runCodeViewMutationPreservingScroll } from '@/domains/code-view/model/scroll-anchor';
import type { GitHubPullRequestRef } from '@/domains/github/api';
import { addDraftAnnotation, addQueuedAnnotation } from '@/domains/review/model/review-mutations';
import { getReviewSession } from '@/domains/review/state/review-session';

type UseRestoreReviewSessionParams = {
  ref: GitHubPullRequestRef;
  viewerRef: RefObject<CodeViewHandle<ReviewAnnotationMetadata, undefined> | null>;
  codeViewItems: CodeViewItemsResult | null;
  isCodeViewMounted: boolean;
  refreshCodeViewLayout: () => void;
  /** Bumps when CodeView remounts (e.g. after refresh) so drafts/queue re-apply. */
  codeViewInstanceKey: number;
};

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

    const sessionKey = `${ref.owner}/${ref.repo}#${ref.pullNumber}@${codeViewInstanceKey}`;
    if (restoredForKey.current === sessionKey) {
      return;
    }

    const session = getReviewSession(ref);
    if (session.drafts.length === 0 && session.queue.length === 0) {
      restoredForKey.current = sessionKey;
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

    restoredForKey.current = sessionKey;
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
