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

export function replaceDraftWithPendingAnnotation(
  item: CodeViewItem<ReviewAnnotationMetadata>,
  comment: GitHubPullRequestReviewComment,
  reviewId: number,
): CodeViewItem<ReviewAnnotationMetadata> {
  const withoutDraft = removeDraftAnnotation(item);
  const pendingMetadata: ReviewAnnotationMetadata = {
    kind: 'pending',
    comments: [comment],
    reviewId,
  };
  const line = getCommentAnchorLine(comment);
  if (line == null) {
    return withoutDraft;
  }

  const annotation = createAnnotationForMetadata(
    withoutDraft,
    line,
    toAnnotationSide(comment.side),
    pendingMetadata,
  );

  return withAnnotations(withoutDraft, [...getAnnotations(withoutDraft), annotation]);
}

export function removePendingAnnotationsForReview(
  item: CodeViewItem<ReviewAnnotationMetadata>,
  reviewId: number,
): CodeViewItem<ReviewAnnotationMetadata> {
  const annotations = getAnnotations(item).filter(
    (annotation) =>
      annotation.metadata?.kind !== 'pending' || annotation.metadata.reviewId !== reviewId,
  );

  if (annotations.length === getAnnotations(item).length) {
    return item;
  }

  return withAnnotations(item, annotations);
}

export function promotePendingToThread(
  item: CodeViewItem<ReviewAnnotationMetadata>,
  comment: GitHubPullRequestReviewComment,
  reviewId: number,
): CodeViewItem<ReviewAnnotationMetadata> {
  const withoutPending = removePendingAnnotationsForReview(item, reviewId);
  const line = getCommentAnchorLine(comment);
  if (line == null) {
    return withoutPending;
  }

  const threadMetadata: ReviewThreadMetadata = {
    kind: 'thread',
    comments: [comment],
    orphaned: false,
  };
  const annotation = createAnnotationForMetadata(
    withoutPending,
    line,
    toAnnotationSide(comment.side),
    threadMetadata,
  );

  return withAnnotations(withoutPending, [...getAnnotations(withoutPending), annotation]);
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
