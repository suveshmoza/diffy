import type {
  AnnotationSide,
  CodeViewItem,
  DiffLineAnnotation,
  LineAnnotation,
  SelectedLineRange,
} from '@pierre/diffs';

import type { GitHubPullRequestReviewComment } from '@/lib/github/api';

export function isReviewCommentHidden(comment: GitHubPullRequestReviewComment): boolean {
  return comment.is_minimized === true || comment.hidden === true;
}

export function formatReviewCommentHiddenLabel(comment: GitHubPullRequestReviewComment): string {
  const reason = comment.minimized_reason?.trim();
  if (!reason) {
    return 'This comment was hidden.';
  }

  return `This comment was hidden (${reason.replace(/_/g, ' ')}).`;
}

export type ReviewThreadMetadata = {
  kind: 'thread';
  comments: GitHubPullRequestReviewComment[];
  orphaned: boolean;
};

export type ReviewDraftMetadata = {
  kind: 'draft';
  draftId: string;
  range: SelectedLineRange;
};

export type ReviewQueuedMetadata = {
  kind: 'queued';
  queuedId: string;
  range: SelectedLineRange;
  body: string;
};

export type ReviewAnnotationMetadata =
  | ReviewThreadMetadata
  | ReviewDraftMetadata
  | ReviewQueuedMetadata;

export type ReviewCommentItemMaps = {
  inlineByItemId: Map<
    string,
    Array<DiffLineAnnotation<ReviewAnnotationMetadata> | LineAnnotation<ReviewAnnotationMetadata>>
  >;
  orphanedByItemId: Map<string, ReviewThreadMetadata[]>;
  countByPath: Map<string, number>;
};

export function mapReviewCommentsToItems(
  items: CodeViewItem[],
  comments: GitHubPullRequestReviewComment[],
): ReviewCommentItemMaps {
  const inlineByItemId = new Map<
    string,
    Array<DiffLineAnnotation<ReviewAnnotationMetadata> | LineAnnotation<ReviewAnnotationMetadata>>
  >();
  const orphanedByItemId = new Map<string, ReviewThreadMetadata[]>();
  const countByPath = new Map<string, number>();

  if (comments.length === 0) {
    return { inlineByItemId, orphanedByItemId, countByPath };
  }

  const itemIdByPath = buildItemIdByPath(items);
  const itemById = new Map(items.map((item) => [item.id, item]));

  for (const thread of buildReviewCommentThreads(comments)) {
    const anchor = thread.comments[0];
    const itemId = itemIdByPath.get(anchor.path);
    if (!itemId) {
      continue;
    }

    const item = itemById.get(itemId);
    const canonicalPath = item ? getItemPath(item) : anchor.path;
    countByPath.set(canonicalPath, (countByPath.get(canonicalPath) ?? 0) + thread.comments.length);

    if (thread.orphaned) {
      const bucket = orphanedByItemId.get(itemId) ?? [];
      bucket.push(thread);
      orphanedByItemId.set(itemId, bucket);
      continue;
    }

    const line = getCommentAnchorLine(anchor);
    if (line == null) {
      continue;
    }

    const annotation = createAnnotationForItem(item, line, toAnnotationSide(anchor.side), thread);
    const bucket = inlineByItemId.get(itemId) ?? [];
    bucket.push(annotation);
    inlineByItemId.set(itemId, bucket);
  }

  return { inlineByItemId, orphanedByItemId, countByPath };
}

export function buildReviewCommentCountByPath(
  comments: readonly GitHubPullRequestReviewComment[],
  items: readonly CodeViewItem<unknown>[],
): Map<string, number> {
  const countByPath = new Map<string, number>();
  const itemIdByPath = buildItemIdByPath([...items]);
  const itemById = new Map(items.map((item) => [item.id, item]));

  for (const comment of comments) {
    const itemId = itemIdByPath.get(comment.path);
    const item = itemId ? itemById.get(itemId) : undefined;
    const path = item ? getItemPath(item) : comment.path;
    countByPath.set(path, (countByPath.get(path) ?? 0) + 1);
  }

  return countByPath;
}

export function attachReviewCommentsToItems(
  items: CodeViewItem[],
  maps: ReviewCommentItemMaps,
): CodeViewItem<ReviewAnnotationMetadata>[] {
  const { inlineByItemId } = maps;

  return items.map((item) => {
    const annotations = inlineByItemId.get(item.id);
    if (!annotations || annotations.length === 0) {
      return item as CodeViewItem<ReviewAnnotationMetadata>;
    }

    if (item.type === 'file') {
      const fileAnnotations = annotations.filter(
        (annotation): annotation is LineAnnotation<ReviewAnnotationMetadata> =>
          !('side' in annotation),
      );

      if (fileAnnotations.length === 0) {
        return item as CodeViewItem<ReviewAnnotationMetadata>;
      }

      return {
        ...item,
        annotations: fileAnnotations,
      };
    }

    const diffAnnotations = annotations.filter(
      (annotation): annotation is DiffLineAnnotation<ReviewAnnotationMetadata> =>
        'side' in annotation,
    );

    if (diffAnnotations.length === 0) {
      return item as CodeViewItem<ReviewAnnotationMetadata>;
    }

    return {
      ...item,
      annotations: diffAnnotations,
    };
  });
}

function buildReviewCommentThreads(
  comments: GitHubPullRequestReviewComment[],
): ReviewThreadMetadata[] {
  const byId = new Map(comments.map((comment) => [comment.id, comment]));
  const threads = new Map<number, GitHubPullRequestReviewComment[]>();

  for (const comment of comments) {
    const root = getThreadRoot(comment, byId);
    const bucket = threads.get(root.id) ?? [];
    bucket.push(comment);
    threads.set(root.id, bucket);
  }

  return [...threads.values()].map((threadComments) => {
    const sorted = [...threadComments].toSorted(
      (left, right) => Date.parse(left.created_at) - Date.parse(right.created_at),
    );
    const anchor = sorted[0];
    const line = getCommentAnchorLine(anchor);

    return {
      kind: 'thread' as const,
      comments: sorted,
      orphaned: line == null,
    };
  });
}

function createAnnotationForItem(
  item: CodeViewItem | undefined,
  lineNumber: number,
  side: AnnotationSide,
  thread: ReviewThreadMetadata,
): DiffLineAnnotation<ReviewAnnotationMetadata> | LineAnnotation<ReviewAnnotationMetadata> {
  if (item?.type === 'file') {
    return {
      lineNumber,
      metadata: thread,
    };
  }

  return {
    lineNumber,
    side,
    metadata: thread,
  };
}

function buildItemIdByPath(items: readonly CodeViewItem<unknown>[]): Map<string, string> {
  const itemIdByPath = new Map<string, string>();

  for (const item of items) {
    itemIdByPath.set(getItemPath(item), item.id);

    if (item.type === 'diff' && item.fileDiff.prevName) {
      itemIdByPath.set(item.fileDiff.prevName, item.id);
    }
  }

  return itemIdByPath;
}

export function getItemPath(item: CodeViewItem<unknown>): string {
  return item.type === 'diff' ? item.fileDiff.name : item.file.name;
}

export function getCommentAnchorLine(comment: GitHubPullRequestReviewComment): number | null {
  return (
    comment.start_line ??
    comment.line ??
    comment.original_start_line ??
    comment.original_line ??
    null
  );
}

function getThreadRoot(
  comment: GitHubPullRequestReviewComment,
  byId: ReadonlyMap<number, GitHubPullRequestReviewComment>,
): GitHubPullRequestReviewComment {
  let current = comment;
  const visited = new Set<number>();

  while (current.in_reply_to_id != null) {
    if (visited.has(current.id)) {
      break;
    }
    visited.add(current.id);

    const parent = byId.get(current.in_reply_to_id);
    if (!parent) {
      break;
    }
    current = parent;
  }

  return current;
}

export function toAnnotationSide(side: GitHubPullRequestReviewComment['side']): AnnotationSide {
  return side === 'LEFT' ? 'deletions' : 'additions';
}
