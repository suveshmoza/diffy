import type {
  AnnotationSide,
  CodeViewItem,
  DiffLineAnnotation,
  LineAnnotation,
  SelectedLineRange,
  SelectionSide,
} from '@pierre/diffs';

import type { GitHubPullRequestReviewComment } from '@/lib/github/api';
import {
  getCommentAnchorLine,
  toAnnotationSide,
  type ReviewAnnotationMetadata,
  type ReviewDraftMetadata,
  type ReviewThreadMetadata,
} from '@/lib/review/comments';

type ReviewAnnotation =
  | DiffLineAnnotation<ReviewAnnotationMetadata>
  | LineAnnotation<ReviewAnnotationMetadata>;

function bumpItemVersion<T>(item: CodeViewItem<T>): CodeViewItem<T> {
  return {
    ...item,
    version: item.version != null ? item.version + 1 : 1,
  };
}

export function areRangesEqual(left: SelectedLineRange, right: SelectedLineRange): boolean {
  return (
    left.start === right.start &&
    left.end === right.end &&
    left.side === right.side &&
    left.endSide === right.endSide
  );
}

export function hasDraftAnnotation(item: CodeViewItem<ReviewAnnotationMetadata>): boolean {
  return getAnnotations(item).some((annotation) => annotation.metadata?.kind === 'draft');
}

export function hasAnyDraftAnnotation(
  viewer: { getItem(id: string): CodeViewItem<ReviewAnnotationMetadata> | undefined },
  items: readonly CodeViewItem<ReviewAnnotationMetadata>[],
): boolean {
  for (const item of items) {
    const liveItem = viewer.getItem(item.id);
    if (liveItem && hasDraftAnnotation(liveItem)) {
      return true;
    }
  }

  return false;
}

export function removeDraftAnnotation(
  item: CodeViewItem<ReviewAnnotationMetadata>,
  draftId?: string,
): CodeViewItem<ReviewAnnotationMetadata> {
  const annotations = getAnnotations(item).filter((annotation) => {
    const metadata = annotation.metadata;
    if (metadata?.kind !== 'draft') {
      return true;
    }

    if (draftId == null) {
      return false;
    }

    return metadata.draftId !== draftId;
  });

  if (annotations.length === getAnnotations(item).length) {
    return item;
  }

  return withAnnotations(item, annotations);
}

export function addDraftAnnotation(
  item: CodeViewItem<ReviewAnnotationMetadata>,
  range: SelectedLineRange,
): { item: CodeViewItem<ReviewAnnotationMetadata>; draftId: string } {
  for (const annotation of getAnnotations(item)) {
    const metadata = annotation.metadata;
    if (metadata?.kind === 'draft' && areRangesEqual(metadata.range, range)) {
      return { item, draftId: metadata.draftId };
    }
  }

  const draftId = crypto.randomUUID();
  const metadata: ReviewDraftMetadata = { kind: 'draft', draftId, range };
  const draftAnnotation = createAnnotationForMetadata(
    item,
    range.end,
    range.endSide ?? range.side,
    metadata,
  );

  return {
    item: withAnnotations(item, [...getAnnotations(item), draftAnnotation]),
    draftId,
  };
}

export function replaceDraftWithThreadAnnotation(
  item: CodeViewItem<ReviewAnnotationMetadata>,
  comment: GitHubPullRequestReviewComment,
  draftId: string,
): CodeViewItem<ReviewAnnotationMetadata> {
  const withoutDraft = removeDraftAnnotation(item, draftId);
  const threadMetadata: ReviewThreadMetadata = {
    kind: 'thread',
    comments: [comment],
    orphaned: false,
  };
  const line = getCommentAnchorLine(comment);
  if (line == null) {
    return withoutDraft;
  }

  const annotation = createAnnotationForMetadata(
    withoutDraft,
    line,
    toAnnotationSide(comment.side),
    threadMetadata,
  );

  return withAnnotations(withoutDraft, [...getAnnotations(withoutDraft), annotation]);
}

function sortCommentsByCreatedAt(
  comments: GitHubPullRequestReviewComment[],
): GitHubPullRequestReviewComment[] {
  return [...comments].toSorted(
    (left, right) => Date.parse(left.created_at) - Date.parse(right.created_at),
  );
}

function annotationContainsReplyParent(
  metadata: ReviewThreadMetadata,
  reply: GitHubPullRequestReviewComment,
): boolean {
  if (reply.in_reply_to_id == null) {
    return false;
  }

  return metadata.comments.some((comment) => comment.id === reply.in_reply_to_id);
}

function updateAnnotationComments(
  item: CodeViewItem<ReviewAnnotationMetadata>,
  annotationIndex: number,
  comments: GitHubPullRequestReviewComment[],
): CodeViewItem<ReviewAnnotationMetadata> {
  const annotations = [...getAnnotations(item)];
  const annotation = annotations[annotationIndex];
  const metadata = annotation.metadata;

  if (!metadata || metadata.kind !== 'thread') {
    return item;
  }

  annotations[annotationIndex] = {
    ...annotation,
    metadata: {
      ...metadata,
      comments,
    },
  };

  return withAnnotations(item, annotations);
}

export function updateCommentInAnnotation(
  item: CodeViewItem<ReviewAnnotationMetadata>,
  updated: GitHubPullRequestReviewComment,
): CodeViewItem<ReviewAnnotationMetadata> {
  const annotations = getAnnotations(item);

  for (let index = 0; index < annotations.length; index += 1) {
    const metadata = annotations[index].metadata;
    if (metadata?.kind !== 'thread') {
      continue;
    }

    if (!metadata.comments.some((comment) => comment.id === updated.id)) {
      continue;
    }

    const nextComments = metadata.comments.map((comment) =>
      comment.id === updated.id ? updated : comment,
    );

    return updateAnnotationComments(item, index, nextComments);
  }

  return item;
}

export function removeCommentFromAnnotation(
  item: CodeViewItem<ReviewAnnotationMetadata>,
  commentId: number,
): CodeViewItem<ReviewAnnotationMetadata> {
  const annotations = getAnnotations(item);

  for (let index = 0; index < annotations.length; index += 1) {
    const metadata = annotations[index].metadata;
    if (metadata?.kind !== 'thread') {
      continue;
    }

    if (!metadata.comments.some((comment) => comment.id === commentId)) {
      continue;
    }

    const nextComments = metadata.comments.filter((comment) => comment.id !== commentId);
    if (nextComments.length === 0) {
      return withAnnotations(
        item,
        annotations.filter((_, annotationIndex) => annotationIndex !== index),
      );
    }

    return updateAnnotationComments(item, index, nextComments);
  }

  return item;
}

export function appendReplyToThreadAnnotation(
  item: CodeViewItem<ReviewAnnotationMetadata>,
  reply: GitHubPullRequestReviewComment,
): CodeViewItem<ReviewAnnotationMetadata> {
  const annotations = getAnnotations(item);

  for (let index = 0; index < annotations.length; index += 1) {
    const metadata = annotations[index].metadata;
    if (metadata?.kind !== 'thread' || !annotationContainsReplyParent(metadata, reply)) {
      continue;
    }

    if (metadata.comments.some((comment) => comment.id === reply.id)) {
      return item;
    }

    return updateAnnotationComments(
      item,
      index,
      sortCommentsByCreatedAt([...metadata.comments, reply]),
    );
  }

  return item;
}

function getAnnotations(item: CodeViewItem<ReviewAnnotationMetadata>): ReviewAnnotation[] {
  return (item.annotations ?? []) as ReviewAnnotation[];
}

function withAnnotations(
  item: CodeViewItem<ReviewAnnotationMetadata>,
  annotations: ReviewAnnotation[],
): CodeViewItem<ReviewAnnotationMetadata> {
  const nextAnnotations = annotations.length > 0 ? annotations : undefined;

  if (item.type === 'file') {
    return bumpItemVersion({
      ...item,
      annotations: nextAnnotations as LineAnnotation<ReviewAnnotationMetadata>[] | undefined,
    });
  }

  return bumpItemVersion({
    ...item,
    annotations: nextAnnotations as DiffLineAnnotation<ReviewAnnotationMetadata>[] | undefined,
  });
}

function createAnnotationForMetadata(
  item: CodeViewItem<ReviewAnnotationMetadata>,
  lineNumber: number,
  side: SelectionSide | undefined,
  metadata: ReviewAnnotationMetadata,
): ReviewAnnotation {
  if (item.type === 'file') {
    return {
      lineNumber,
      metadata,
    } as ReviewAnnotation;
  }

  return {
    lineNumber,
    side: (side ?? 'additions') as AnnotationSide,
    metadata,
  } as ReviewAnnotation;
}
