import { CodeViewItem, FileDiffMetadata, SelectedLineRange } from '@pierre/diffs';
import { describe, expect, it } from 'vitest';

import type {
  ReviewAnnotationMetadata,
  ReviewDraftMetadata,
  ReviewThreadMetadata,
} from '@/lib/review/comments';

import { areRangesEqual, hasDraftAnnotation } from './review-mutations';

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
