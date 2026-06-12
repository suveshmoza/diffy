import type {
  AnnotationSide,
  CodeViewItem,
  DiffLineAnnotation,
  LineAnnotation,
} from '@pierre/diffs';

import type { GitHubPullRequestReviewComment } from './github';

export type ReviewCommentThreadMetadata = {
  comments: GitHubPullRequestReviewComment[];
  orphaned: boolean;
};

export type ReviewCommentItemMaps = {
  inlineByItemId: Map<
    string,
    Array<
      DiffLineAnnotation<ReviewCommentThreadMetadata> | LineAnnotation<ReviewCommentThreadMetadata>
    >
  >;
  orphanedByItemId: Map<string, ReviewCommentThreadMetadata[]>;
  countByPath: Map<string, number>;
};

export function mapReviewCommentsToItems(
  items: CodeViewItem[],
  comments: GitHubPullRequestReviewComment[],
): ReviewCommentItemMaps {
  const inlineByItemId = new Map<
    string,
    Array<
      DiffLineAnnotation<ReviewCommentThreadMetadata> | LineAnnotation<ReviewCommentThreadMetadata>
    >
  >();
  const orphanedByItemId = new Map<string, ReviewCommentThreadMetadata[]>();
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

export function attachReviewCommentsToItems(
  items: CodeViewItem[],
  maps: ReviewCommentItemMaps,
): CodeViewItem<ReviewCommentThreadMetadata>[] {
  const { inlineByItemId } = maps;

  return items.map((item) => {
    const annotations = inlineByItemId.get(item.id);
    if (!annotations || annotations.length === 0) {
      return item as CodeViewItem<ReviewCommentThreadMetadata>;
    }

    if (item.type === 'file') {
      const fileAnnotations = annotations.filter(
        (annotation): annotation is LineAnnotation<ReviewCommentThreadMetadata> =>
          !('side' in annotation),
      );

      if (fileAnnotations.length === 0) {
        return item as CodeViewItem<ReviewCommentThreadMetadata>;
      }

      return {
        ...item,
        annotations: fileAnnotations,
      };
    }

    const diffAnnotations = annotations.filter(
      (annotation): annotation is DiffLineAnnotation<ReviewCommentThreadMetadata> =>
        'side' in annotation,
    );

    if (diffAnnotations.length === 0) {
      return item as CodeViewItem<ReviewCommentThreadMetadata>;
    }

    return {
      ...item,
      annotations: diffAnnotations,
    };
  });
}

function buildReviewCommentThreads(
  comments: GitHubPullRequestReviewComment[],
): ReviewCommentThreadMetadata[] {
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
      comments: sorted,
      orphaned: line == null,
    };
  });
}

function createAnnotationForItem(
  item: CodeViewItem | undefined,
  lineNumber: number,
  side: AnnotationSide,
  thread: ReviewCommentThreadMetadata,
): DiffLineAnnotation<ReviewCommentThreadMetadata> | LineAnnotation<ReviewCommentThreadMetadata> {
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

function buildItemIdByPath(items: CodeViewItem[]): Map<string, string> {
  const itemIdByPath = new Map<string, string>();

  for (const item of items) {
    itemIdByPath.set(getItemPath(item), item.id);

    if (item.type === 'diff' && item.fileDiff.prevName) {
      itemIdByPath.set(item.fileDiff.prevName, item.id);
    }
  }

  return itemIdByPath;
}

function getItemPath(item: CodeViewItem): string {
  return item.type === 'diff' ? item.fileDiff.name : item.file.name;
}

function getCommentAnchorLine(comment: GitHubPullRequestReviewComment): number | null {
  return comment.start_line ?? comment.line ?? comment.original_start_line ?? comment.original_line;
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

function toAnnotationSide(side: GitHubPullRequestReviewComment['side']): AnnotationSide {
  return side === 'LEFT' ? 'deletions' : 'additions';
}
