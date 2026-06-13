import type {
  AnnotationSide,
  CodeViewItem,
  DiffLineAnnotation,
  LineAnnotation,
  SelectedLineRange,
  SelectionSide,
} from '@pierre/diffs';

import type { GitHubPullRequestReviewComment } from './github';
import {
  getCommentAnchorLine,
  toAnnotationSide,
  type ReviewAnnotationMetadata,
  type ReviewThreadMetadata,
} from './review-comments';

type ReviewAnnotation =
  | DiffLineAnnotation<ReviewAnnotationMetadata>
  | LineAnnotation<ReviewAnnotationMetadata>;

export function bumpItemVersion<T>(item: CodeViewItem<T>): CodeViewItem<T> {
  return {
    ...item,
    version: item.version != null ? item.version + 1 : 1,
  };
}

export function hasDraftAnnotation(item: CodeViewItem<ReviewAnnotationMetadata>): boolean {
  return getAnnotations(item).some((annotation) => annotation.metadata?.kind === 'draft');
}

export function removeDraftAnnotation(
  item: CodeViewItem<ReviewAnnotationMetadata>,
): CodeViewItem<ReviewAnnotationMetadata> {
  const annotations = getAnnotations(item).filter(
    (annotation) => annotation.metadata?.kind !== 'draft',
  );

  if (annotations.length === getAnnotations(item).length) {
    return item;
  }

  return withAnnotations(item, annotations);
}

export function upsertDraftAnnotation(
  item: CodeViewItem<ReviewAnnotationMetadata>,
  range: SelectedLineRange,
): CodeViewItem<ReviewAnnotationMetadata> {
  const withoutDraft = removeDraftAnnotation(item);
  const metadata: ReviewAnnotationMetadata = { kind: 'draft', range };
  const draftAnnotation = createAnnotationForMetadata(
    withoutDraft,
    range.end,
    range.endSide ?? range.side,
    metadata,
  );

  return withAnnotations(withoutDraft, [...getAnnotations(withoutDraft), draftAnnotation]);
}

export function replaceDraftWithThreadAnnotation(
  item: CodeViewItem<ReviewAnnotationMetadata>,
  comment: GitHubPullRequestReviewComment,
): CodeViewItem<ReviewAnnotationMetadata> {
  const withoutDraft = removeDraftAnnotation(item);
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
