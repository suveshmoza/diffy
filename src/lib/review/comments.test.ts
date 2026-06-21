import { type CodeViewItem, FileDiffMetadata } from '@pierre/diffs';
import { describe, expect, it } from 'vitest';

import type { GitHubPullRequestReviewComment } from '../github/api';
import {
  attachReviewCommentsToItems,
  buildReviewCommentCountByPath,
  formatReviewCommentHiddenLabel,
  getCommentAnchorLine,
  getItemPath,
  isReviewCommentHidden,
  mapReviewCommentsToItems,
  toAnnotationSide,
} from './comments';

describe('toAnnotationSide', () => {
  it('returns deletions when side is LEFT', () => {
    expect(toAnnotationSide('LEFT')).toBe('deletions');
  });
  it('returns additions when side is RIGHT', () => {
    expect(toAnnotationSide('RIGHT')).toBe('additions');
  });
  it('returns additions when side is null', () => {
    expect(toAnnotationSide(null)).toBe('additions');
  });
});

describe('isReviewCommentHidden', () => {
  it('returns true when is_minimized is true', () => {
    expect(isReviewCommentHidden({ is_minimized: true } as GitHubPullRequestReviewComment)).toBe(
      true,
    );
  });
  it('returns true when hidden is true', () => {
    expect(isReviewCommentHidden({ hidden: true } as GitHubPullRequestReviewComment)).toBe(true);
  });
  it('returns false when both are false', () => {
    expect(
      isReviewCommentHidden({
        is_minimized: false,
        hidden: false,
      } as GitHubPullRequestReviewComment),
    ).toBe(false);
  });
  it('returns true when either is true', () => {
    expect(
      isReviewCommentHidden({
        is_minimized: true,
        hidden: false,
      } as GitHubPullRequestReviewComment),
    ).toBe(true);
    expect(
      isReviewCommentHidden({
        is_minimized: false,
        hidden: true,
      } as GitHubPullRequestReviewComment),
    ).toBe(true);
  });
  it('returns false when both are undefined', () => {
    expect(isReviewCommentHidden({} as GitHubPullRequestReviewComment)).toBe(false);
  });
});

describe('formatReviewCommentHiddenLabel', () => {
  it('returns label without reason if minimized_reason is absent or empty', () => {
    expect(
      formatReviewCommentHiddenLabel({
        minimized_reason: undefined,
      } as GitHubPullRequestReviewComment),
    ).toBe('This comment was hidden.');
    expect(
      formatReviewCommentHiddenLabel({ minimized_reason: '' } as GitHubPullRequestReviewComment),
    ).toBe('This comment was hidden.');
  });

  it('returns label with reason when minimized_reason is present', () => {
    expect(
      formatReviewCommentHiddenLabel({
        minimized_reason: 'Marked as off-topic',
      } as GitHubPullRequestReviewComment),
    ).toBe('This comment was hidden (Marked as off-topic).');
  });

  it('replaces underscores in minimized_reason with spaces', () => {
    expect(
      formatReviewCommentHiddenLabel({
        minimized_reason: 'Resolved_out_of_date',
      } as GitHubPullRequestReviewComment),
    ).toBe('This comment was hidden (Resolved out of date).');
  });
});

describe('getItemPath', () => {
  it('returns fileDiff.name for a diff-type item', () => {
    const item = {
      type: 'diff' as const,
      fileDiff: { name: 'src/foo.ts' },
    } as CodeViewItem;
    expect(getItemPath(item)).toBe('src/foo.ts');
  });

  it('returns file.name for a file-type item', () => {
    const item = {
      type: 'file' as const,
      file: { name: 'src/bar.ts', contents: '' },
    } as CodeViewItem;
    expect(getItemPath(item)).toBe('src/bar.ts');
  });
});

describe('getCommentAnchorLine', () => {
  it('returns start_line when it is set', () => {
    expect(getCommentAnchorLine({ start_line: 5 } as GitHubPullRequestReviewComment)).toBe(5);
  });

  it('falls through to line when start_line is null', () => {
    expect(
      getCommentAnchorLine({ start_line: null, line: 10 } as GitHubPullRequestReviewComment),
    ).toBe(10);
  });

  it('falls through to original_start_line when start_line and line are null', () => {
    expect(
      getCommentAnchorLine({
        start_line: null,
        line: null,
        original_start_line: 15,
      } as GitHubPullRequestReviewComment),
    ).toBe(15);
  });

  it('falls through to original_line when all earlier fields are null', () => {
    expect(
      getCommentAnchorLine({
        start_line: null,
        line: null,
        original_start_line: null,
        original_line: 20,
      } as GitHubPullRequestReviewComment),
    ).toBe(20);
  });

  it('returns null when all fields are null', () => {
    expect(
      getCommentAnchorLine({
        start_line: null,
        line: null,
        original_start_line: null,
        original_line: null,
      } as GitHubPullRequestReviewComment),
    ).toBeNull();
  });

  it('returns null when all fields are undefined', () => {
    expect(getCommentAnchorLine({} as GitHubPullRequestReviewComment)).toBeNull();
  });
});

const stubFileDiff: FileDiffMetadata = {
  name: 'src/file.ts',
  type: 'change',
  hunks: [],
  splitLineCount: 0,
  unifiedLineCount: 0,
  isPartial: false,
  deletionLines: [],
  additionLines: [],
};

const stubComment: GitHubPullRequestReviewComment = {
  id: 1,
  path: 'src/file.ts',
  body: 'test comment',
  html_url: '',
  user: { login: 'user' },
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  line: 10,
  original_line: null,
  start_line: null,
  original_start_line: null,
  side: 'LEFT',
  in_reply_to_id: null,
};

const stubDiffItem = {
  id: 'item-1',
  type: 'diff' as const,
  fileDiff: stubFileDiff,
} as CodeViewItem;

describe('buildReviewCommentCountByPath', () => {
  it('returns empty map for empty comments', () => {
    const result = buildReviewCommentCountByPath([], [stubDiffItem]);
    expect(result.size).toBe(0);
  });

  it('counts comments by path', () => {
    const commentB: GitHubPullRequestReviewComment = {
      ...stubComment,
      id: 2,
      path: 'src/file.ts',
    };
    const commentC: GitHubPullRequestReviewComment = {
      ...stubComment,
      id: 3,
      path: 'src/other.ts',
    };
    const otherItem: CodeViewItem = {
      id: 'item-2',
      type: 'diff',
      fileDiff: { ...stubFileDiff, name: 'src/other.ts' },
    } as CodeViewItem;

    const result = buildReviewCommentCountByPath(
      [stubComment, commentB, commentC],
      [stubDiffItem, otherItem],
    );
    expect(result.get('src/file.ts')).toBe(2);
    expect(result.get('src/other.ts')).toBe(1);
  });

  it('uses canonical path for renamed files when comment uses old path', () => {
    const comment = { ...stubComment, path: 'src/old.ts' };
    const renamedItem: CodeViewItem = {
      id: 'item-1',
      type: 'diff',
      fileDiff: { ...stubFileDiff, name: 'src/new.ts', prevName: 'src/old.ts' },
    } as CodeViewItem;

    const result = buildReviewCommentCountByPath([comment], [renamedItem]);
    expect(result.get('src/new.ts')).toBe(1);
    expect(result.get('src/old.ts')).toBeUndefined();
  });

  it('uses comment path when no matching item found', () => {
    const comment = { ...stubComment, path: 'src/orphan.ts' };
    const result = buildReviewCommentCountByPath([comment], [stubDiffItem]);
    expect(result.get('src/orphan.ts')).toBe(1);
  });
});

describe('attachReviewCommentsToItems', () => {
  it('returns items unchanged when no annotations match', () => {
    const maps = {
      inlineByItemId: new Map(),
      orphanedByItemId: new Map(),
      countByPath: new Map(),
    };
    const result = attachReviewCommentsToItems([stubDiffItem], maps);
    expect(result).toHaveLength(1);
    expect(result[0].annotations).toBeUndefined();
  });

  it('attaches diff annotations to a diff-type item', () => {
    const annotation = {
      side: 'additions' as const,
      lineNumber: 10,
      metadata: { kind: 'thread' as const, comments: [stubComment], orphaned: false },
    };
    const maps = {
      inlineByItemId: new Map([['item-1', [annotation]]]),
      orphanedByItemId: new Map(),
      countByPath: new Map(),
    };
    const result = attachReviewCommentsToItems([stubDiffItem], maps);
    expect(result[0].annotations).toHaveLength(1);
    expect(result[0].annotations![0]).toHaveProperty('side', 'additions');
  });

  it('attaches line annotations to a file-type item', () => {
    const fileItem: CodeViewItem = {
      id: 'file-1',
      type: 'file',
      file: { name: 'src/file.ts', contents: '' },
    } as CodeViewItem;

    const annotation = {
      lineNumber: 5,
      metadata: { kind: 'thread' as const, comments: [stubComment], orphaned: false },
    };
    const maps = {
      inlineByItemId: new Map([['file-1', [annotation]]]),
      orphanedByItemId: new Map(),
      countByPath: new Map(),
    };
    const result = attachReviewCommentsToItems([fileItem], maps);
    expect(result[0].annotations).toHaveLength(1);
    expect(result[0].annotations![0]).not.toHaveProperty('side');
  });

  it('filters out non-matching annotation types for each item type', () => {
    const diffAnnotation = {
      side: 'additions' as const,
      lineNumber: 10,
      metadata: { kind: 'thread' as const, comments: [stubComment], orphaned: false },
    };
    const lineAnnotation = {
      lineNumber: 5,
      metadata: { kind: 'thread' as const, comments: [stubComment], orphaned: false },
    };

    const fileItem: CodeViewItem = {
      id: 'file-1',
      type: 'file',
      file: { name: 'src/file.ts', contents: '' },
    } as CodeViewItem;

    const diffItem: CodeViewItem = {
      id: 'diff-1',
      type: 'diff',
      fileDiff: stubFileDiff,
    } as CodeViewItem;

    const maps = {
      inlineByItemId: new Map([
        ['file-1', [diffAnnotation, lineAnnotation]],
        ['diff-1', [lineAnnotation, diffAnnotation]],
      ]),
      orphanedByItemId: new Map(),
      countByPath: new Map(),
    };

    const result = attachReviewCommentsToItems([fileItem, diffItem], maps);
    const fileResult = result.find((i) => i.id === 'file-1');
    const diffResult = result.find((i) => i.id === 'diff-1');

    expect(fileResult!.annotations).toHaveLength(1);
    expect(fileResult!.annotations![0]).not.toHaveProperty('side');

    expect(diffResult!.annotations).toHaveLength(1);
    expect(diffResult!.annotations![0]).toHaveProperty('side', 'additions');
  });
});

describe('mapReviewCommentsToItems', () => {
  it('returns empty maps for empty comments', () => {
    const result = mapReviewCommentsToItems([stubDiffItem], []);
    expect(result.inlineByItemId.size).toBe(0);
    expect(result.orphanedByItemId.size).toBe(0);
    expect(result.countByPath.size).toBe(0);
  });

  it('maps an inline comment to the matching item', () => {
    const result = mapReviewCommentsToItems([stubDiffItem], [stubComment]);
    expect(result.inlineByItemId.size).toBe(1);
    expect(result.orphanedByItemId.size).toBe(0);

    const annotations = result.inlineByItemId.get('item-1');
    expect(annotations).toHaveLength(1);
    expect(annotations![0].lineNumber).toBe(10);
    expect(annotations![0]).toHaveProperty('side', 'deletions');
  });

  it('maps orphaned comments when anchor has no line', () => {
    const orphanComment: GitHubPullRequestReviewComment = {
      ...stubComment,
      line: null,
      original_line: null,
      start_line: null,
      original_start_line: null,
    };
    const result = mapReviewCommentsToItems([stubDiffItem], [orphanComment]);
    expect(result.inlineByItemId.size).toBe(0);
    expect(result.orphanedByItemId.size).toBe(1);
  });

  it('builds count by path from mapped comments', () => {
    const result = mapReviewCommentsToItems([stubDiffItem], [stubComment]);
    expect(result.countByPath.get('src/file.ts')).toBe(1);
  });

  it('groups comments in the same thread together', () => {
    const reply: GitHubPullRequestReviewComment = {
      ...stubComment,
      id: 2,
      body: 'reply',
      in_reply_to_id: 1,
    };
    const result = mapReviewCommentsToItems([stubDiffItem], [stubComment, reply]);
    const annotations = result.inlineByItemId.get('item-1');
    expect(annotations).toHaveLength(1);
    const metadata = annotations![0].metadata;
    expect(metadata?.kind).toBe('thread');
    if (metadata?.kind === 'thread') {
      expect(metadata.comments).toHaveLength(2);
    }
  });

  it('skips comments that do not match any item path', () => {
    const unmatchedComment: GitHubPullRequestReviewComment = {
      ...stubComment,
      path: 'src/no-match.ts',
    };
    const result = mapReviewCommentsToItems([stubDiffItem], [unmatchedComment]);
    expect(result.inlineByItemId.size).toBe(0);
    expect(result.orphanedByItemId.size).toBe(0);
    expect(result.countByPath.size).toBe(0);
  });
});
