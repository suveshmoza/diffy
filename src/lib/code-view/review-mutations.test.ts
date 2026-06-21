import { CodeViewItem, FileDiffMetadata, SelectedLineRange } from '@pierre/diffs';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import type { GitHubPullRequestReviewComment } from '@/lib/github/api';
import type {
  ReviewAnnotationMetadata,
  ReviewDraftMetadata,
  ReviewThreadMetadata,
} from '@/lib/review/comments';

import {
  addDraftAnnotation,
  appendReplyToThreadAnnotation,
  areRangesEqual,
  hasAnyDraftAnnotation,
  hasDraftAnnotation,
  removeCommentFromAnnotation,
  removeDraftAnnotation,
  replaceDraftWithThreadAnnotation,
  updateCommentInAnnotation,
} from './review-mutations';

const draftMeta: ReviewDraftMetadata = {
  kind: 'draft',
  draftId: 'draft-1',
  range: { start: 1, end: 2, side: 'additions', endSide: 'additions' },
};

const threadMeta: ReviewThreadMetadata = {
  kind: 'thread',
  comments: [],
  orphaned: false,
};

const stubFileDiff: FileDiffMetadata = {
  name: 'stub.ts',
  type: 'change',
  hunks: [],
  splitLineCount: 0,
  unifiedLineCount: 0,
  isPartial: true,
  deletionLines: [],
  additionLines: [],
};

describe('areRangesEqual', () => {
  it('returns true when ranges are equal', () => {
    const left: SelectedLineRange = { start: 1, side: 'deletions', end: 10, endSide: 'deletions' };
    const right: SelectedLineRange = { start: 1, side: 'deletions', end: 10, endSide: 'deletions' };
    expect(areRangesEqual(left, right)).toBe(true);
  });
  it('returns false when starts are different', () => {
    const left: SelectedLineRange = { start: 1, side: 'deletions', end: 10, endSide: 'deletions' };
    const right: SelectedLineRange = { start: 5, side: 'deletions', end: 10, endSide: 'deletions' };
    expect(areRangesEqual(left, right)).toBe(false);
  });
  it('returns false when sides are different', () => {
    const left: SelectedLineRange = { start: 1, side: 'deletions', end: 10, endSide: 'deletions' };
    const right: SelectedLineRange = { start: 5, side: 'additions', end: 10, endSide: 'deletions' };
    expect(areRangesEqual(left, right)).toBe(false);
  });
  it('returns false when ends are different', () => {
    const left: SelectedLineRange = { start: 1, side: 'deletions', end: 10, endSide: 'deletions' };
    const right: SelectedLineRange = { start: 1, side: 'deletions', end: 5, endSide: 'deletions' };
    expect(areRangesEqual(left, right)).toBe(false);
  });
  it('returns false when endSides are different', () => {
    const left: SelectedLineRange = { start: 1, side: 'deletions', end: 10, endSide: 'deletions' };
    const right: SelectedLineRange = { start: 1, side: 'deletions', end: 5, endSide: 'additions' };
    expect(areRangesEqual(left, right)).toBe(false);
  });
});

describe('hasDraftAnnotation', () => {
  it('returns true when a diff item has a draft annotation', () => {
    const item: CodeViewItem<ReviewAnnotationMetadata> = {
      id: 'test',
      type: 'diff',
      fileDiff: stubFileDiff,
      annotations: [{ side: 'additions', lineNumber: 1, metadata: draftMeta }],
    };
    expect(hasDraftAnnotation(item)).toBe(true);
  });

  it('returns false when annotations only have thread kind', () => {
    const item: CodeViewItem<ReviewAnnotationMetadata> = {
      id: 'test',
      type: 'diff',
      fileDiff: stubFileDiff,
      annotations: [{ side: 'additions', lineNumber: 1, metadata: threadMeta }],
    };
    expect(hasDraftAnnotation(item)).toBe(false);
  });

  it('returns true when multiple annotations exist and one is draft', () => {
    const item: CodeViewItem<ReviewAnnotationMetadata> = {
      id: 'test',
      type: 'diff',
      fileDiff: stubFileDiff,
      annotations: [
        { side: 'deletions', lineNumber: 5, metadata: threadMeta },
        { side: 'additions', lineNumber: 10, metadata: draftMeta },
      ],
    };
    expect(hasDraftAnnotation(item)).toBe(true);
  });

  it('returns false when annotations array is empty', () => {
    const item: CodeViewItem<ReviewAnnotationMetadata> = {
      id: 'test',
      type: 'diff',
      fileDiff: stubFileDiff,
      annotations: [],
    };
    expect(hasDraftAnnotation(item)).toBe(false);
  });

  it('returns false when annotations is undefined', () => {
    const item: CodeViewItem<ReviewAnnotationMetadata> = {
      id: 'test',
      type: 'diff',
      fileDiff: stubFileDiff,
    };
    expect(hasDraftAnnotation(item)).toBe(false);
  });

  it('returns true with a file-type item (LineAnnotation)', () => {
    const item: CodeViewItem<ReviewAnnotationMetadata> = {
      id: 'test',
      type: 'file',
      file: { name: 'test.ts', contents: '' },
      annotations: [{ lineNumber: 1, metadata: draftMeta }],
    };
    expect(hasDraftAnnotation(item)).toBe(true);
  });
});

function makeDiffItem(
  overrides: Partial<CodeViewItem<ReviewAnnotationMetadata>> = {},
): CodeViewItem<ReviewAnnotationMetadata> {
  return {
    id: 'test',
    type: 'diff',
    fileDiff: stubFileDiff,
    ...overrides,
  } as CodeViewItem<ReviewAnnotationMetadata>;
}

function getAnnotationList(
  item: CodeViewItem<ReviewAnnotationMetadata>,
): { metadata: ReviewAnnotationMetadata }[] {
  return (item.annotations ?? []) as unknown as { metadata: ReviewAnnotationMetadata }[];
}

describe('removeDraftAnnotation', () => {
  it('removes all draft annotations when draftId is not specified', () => {
    const item = makeDiffItem({
      annotations: [
        { side: 'additions', lineNumber: 1, metadata: draftMeta },
        { side: 'additions', lineNumber: 5, metadata: threadMeta },
      ],
    });
    const result = removeDraftAnnotation(item);
    expect(getAnnotationList(result)).toHaveLength(1);
    expect(getAnnotationList(result)[0].metadata.kind).toBe('thread');
  });

  it('removes only the matching draft when draftId is specified', () => {
    const draftB: ReviewDraftMetadata = {
      kind: 'draft',
      draftId: 'draft-2',
      range: { start: 3, end: 4, side: 'deletions' },
    };
    const item = makeDiffItem({
      annotations: [
        { side: 'additions', lineNumber: 1, metadata: draftMeta },
        { side: 'deletions', lineNumber: 3, metadata: draftB },
      ],
    });
    const result = removeDraftAnnotation(item, 'draft-1');
    expect(getAnnotationList(result)).toHaveLength(1);
    expect(getAnnotationList(result)[0].metadata).toEqual(draftB);
  });

  it('returns the same item when there are no draft annotations', () => {
    const item = makeDiffItem({
      annotations: [{ side: 'additions', lineNumber: 1, metadata: threadMeta }],
    });
    const result = removeDraftAnnotation(item);
    expect(result).toBe(item);
  });

  it('returns the same item when annotations is undefined', () => {
    const item = makeDiffItem();
    const result = removeDraftAnnotation(item);
    expect(result).toBe(item);
  });
});

describe('updateCommentInAnnotation', () => {
  const oldComment: GitHubPullRequestReviewComment = {
    id: 1,
    path: 'file.ts',
    body: 'old body',
    html_url: '',
    user: { login: 'user' },
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    line: 5,
    original_line: null,
    start_line: null,
    original_start_line: null,
    side: null,
    in_reply_to_id: null,
  };

  const updatedComment: GitHubPullRequestReviewComment = { ...oldComment, body: 'updated body' };

  it('updates the matching comment within a thread annotation', () => {
    const item = makeDiffItem({
      annotations: [
        {
          side: 'additions',
          lineNumber: 5,
          metadata: { kind: 'thread', comments: [oldComment], orphaned: false },
        },
      ],
    });
    const result = updateCommentInAnnotation(item, updatedComment);
    const thread = getAnnotationList(result)[0].metadata;
    expect(thread.kind).toBe('thread');
    if (thread.kind === 'thread') {
      expect(thread.comments[0].body).toBe('updated body');
    }
  });

  it('returns the same item when no thread annotation contains the comment', () => {
    const item = makeDiffItem({
      annotations: [
        {
          side: 'additions',
          lineNumber: 5,
          metadata: threadMeta,
        },
      ],
    });
    const result = updateCommentInAnnotation(item, updatedComment);
    expect(result).toBe(item);
  });

  it('returns the same item when there are no annotations', () => {
    const result = updateCommentInAnnotation(makeDiffItem(), updatedComment);
    expect(result).toBe(result);
  });
});

describe('removeCommentFromAnnotation', () => {
  const comment: GitHubPullRequestReviewComment = {
    id: 1,
    path: 'file.ts',
    body: 'comment',
    html_url: '',
    user: { login: 'user' },
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    line: 5,
    original_line: null,
    start_line: null,
    original_start_line: null,
    side: null,
    in_reply_to_id: null,
  };

  it('removes the comment from a thread annotation', () => {
    const item = makeDiffItem({
      annotations: [
        {
          side: 'additions',
          lineNumber: 5,
          metadata: { kind: 'thread', comments: [comment], orphaned: false },
        },
      ],
    });
    const result = removeCommentFromAnnotation(item, 1);
    expect(getAnnotationList(result)).toHaveLength(0);
  });

  it('returns the same item when comment id is not found', () => {
    const item = makeDiffItem({
      annotations: [
        {
          side: 'additions',
          lineNumber: 5,
          metadata: { kind: 'thread', comments: [comment], orphaned: false },
        },
      ],
    });
    const result = removeCommentFromAnnotation(item, 999);
    expect(result).toBe(item);
  });

  it('returns the same item when there are no annotations', () => {
    const result = removeCommentFromAnnotation(makeDiffItem(), 1);
    expect(result).toBe(result);
  });
});

describe('appendReplyToThreadAnnotation', () => {
  const rootComment: GitHubPullRequestReviewComment = {
    id: 1,
    path: 'file.ts',
    body: 'root',
    html_url: '',
    user: { login: 'user' },
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    line: 5,
    original_line: null,
    start_line: null,
    original_start_line: null,
    side: null,
    in_reply_to_id: null,
  };

  const reply: GitHubPullRequestReviewComment = {
    ...rootComment,
    id: 2,
    body: 'reply',
    in_reply_to_id: 1,
  };

  it('appends a reply to the matching thread', () => {
    const item = makeDiffItem({
      annotations: [
        {
          side: 'additions',
          lineNumber: 5,
          metadata: { kind: 'thread', comments: [rootComment], orphaned: false },
        },
      ],
    });
    const result = appendReplyToThreadAnnotation(item, reply);
    const thread = getAnnotationList(result)[0].metadata;
    expect(thread.kind).toBe('thread');
    if (thread.kind === 'thread') {
      expect(thread.comments).toHaveLength(2);
      expect(thread.comments[1].id).toBe(2);
    }
  });

  it('returns the same item when reply already exists (dedup)', () => {
    const item = makeDiffItem({
      annotations: [
        {
          side: 'additions',
          lineNumber: 5,
          metadata: { kind: 'thread', comments: [rootComment, reply], orphaned: false },
        },
      ],
    });
    const result = appendReplyToThreadAnnotation(item, reply);
    expect(result).toBe(item);
  });

  it('returns the same item when no thread contains the reply parent', () => {
    const otherReply: GitHubPullRequestReviewComment = { ...reply, in_reply_to_id: 999 };
    const item = makeDiffItem({
      annotations: [
        {
          side: 'additions',
          lineNumber: 5,
          metadata: { kind: 'thread', comments: [rootComment], orphaned: false },
        },
      ],
    });
    const result = appendReplyToThreadAnnotation(item, otherReply);
    expect(result).toBe(item);
  });

  it('returns the same item when there are no annotations', () => {
    const result = appendReplyToThreadAnnotation(makeDiffItem(), reply);
    expect(result).toBe(result);
  });
});

describe('replaceDraftWithThreadAnnotation', () => {
  const comment: GitHubPullRequestReviewComment = {
    id: 1,
    path: 'file.ts',
    body: 'new thread',
    html_url: '',
    user: { login: 'user' },
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    line: 5,
    original_line: null,
    start_line: null,
    original_start_line: null,
    side: null,
    in_reply_to_id: null,
  };

  it('replaces a draft annotation with a thread annotation', () => {
    const item = makeDiffItem({
      annotations: [
        { side: 'additions', lineNumber: 5, metadata: draftMeta },
        { side: 'additions', lineNumber: 10, metadata: threadMeta },
      ],
    });
    const result = replaceDraftWithThreadAnnotation(item, comment, 'draft-1');
    const annotations = getAnnotationList(result);
    expect(annotations).toHaveLength(2);
    expect(annotations.some((a) => a.metadata.kind === 'draft')).toBe(false);
    expect(
      annotations.some((a) => a.metadata.kind === 'thread' && a.metadata.comments.length > 0),
    ).toBe(true);
  });

  it('returns item without draft when comment has no anchor line', () => {
    const noLineComment: GitHubPullRequestReviewComment = {
      ...comment,
      line: null,
      original_line: null,
    };
    const item = makeDiffItem({
      annotations: [{ side: 'additions', lineNumber: 5, metadata: draftMeta }],
    });
    const result = replaceDraftWithThreadAnnotation(item, noLineComment, 'draft-1');
    expect(getAnnotationList(result)).toHaveLength(0);
  });
});

describe('addDraftAnnotation', () => {
  beforeEach(() => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      'mock-uuid-123' as `${string}-${string}-${string}-${string}-${string}`,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds a new draft annotation to the item', () => {
    const range: SelectedLineRange = {
      start: 10,
      end: 12,
      side: 'additions',
      endSide: 'additions',
    };
    const { item, draftId } = addDraftAnnotation(makeDiffItem(), range);
    expect(draftId).toBe('mock-uuid-123');
    expect(getAnnotationList(item)).toHaveLength(1);
    expect(getAnnotationList(item)[0].metadata).toEqual({
      kind: 'draft',
      draftId: 'mock-uuid-123',
      range,
    });
  });

  it('returns existing draft when range matches an existing draft', () => {
    const item = makeDiffItem({
      annotations: [{ side: 'additions', lineNumber: 2, metadata: draftMeta }],
    });
    const { item: result, draftId } = addDraftAnnotation(item, draftMeta.range);
    expect(draftId).toBe('draft-1');
    expect(result).toBe(item);
  });

  it('does not deduplicate when range differs even on same line', () => {
    const item = makeDiffItem({
      annotations: [{ side: 'additions', lineNumber: 2, metadata: draftMeta }],
    });
    const diffRange: SelectedLineRange = { start: 1, end: 2, side: 'deletions' };
    const { draftId } = addDraftAnnotation(item, diffRange);
    expect(draftId).toBe('mock-uuid-123');
  });
});

describe('hasAnyDraftAnnotation', () => {
  it('returns true when viewer returns an item with a draft annotation', () => {
    const item = makeDiffItem({
      annotations: [{ side: 'additions', lineNumber: 1, metadata: draftMeta }],
    });
    const viewer = { getItem: () => item };
    expect(hasAnyDraftAnnotation(viewer, [item])).toBe(true);
  });

  it('returns false when no items have draft annotations', () => {
    const item = makeDiffItem({
      annotations: [{ side: 'additions', lineNumber: 1, metadata: threadMeta }],
    });
    const viewer = { getItem: () => item };
    expect(hasAnyDraftAnnotation(viewer, [item])).toBe(false);
  });

  it('returns false when viewer returns undefined for the item id', () => {
    const item = makeDiffItem({
      annotations: [{ side: 'additions', lineNumber: 1, metadata: draftMeta }],
    });
    const viewer = { getItem: () => undefined };
    expect(hasAnyDraftAnnotation(viewer, [item])).toBe(false);
  });

  it('returns true when at least one of many items has a draft', () => {
    const draftItem = makeDiffItem({
      id: 'draft-item',
      annotations: [{ side: 'additions', lineNumber: 1, metadata: draftMeta }],
    });
    const cleanItem = makeDiffItem({
      id: 'clean-item',
      annotations: [{ side: 'additions', lineNumber: 5, metadata: threadMeta }],
    });
    const viewer = { getItem: (id: string) => (id === 'draft-item' ? draftItem : cleanItem) };
    expect(hasAnyDraftAnnotation(viewer, [cleanItem, draftItem])).toBe(true);
  });

  it('returns false for empty items array', () => {
    const viewer = { getItem: () => undefined };
    expect(hasAnyDraftAnnotation(viewer, [])).toBe(false);
  });
});
