import { describe, expect, it } from 'vitest';

import type { PullRequestDiffData } from '@/lib/github/api';

import {
  getCodeViewItemIdForFile,
  getMissingPatchMessage,
  isLargePullRequestData,
} from './build-items';

function stubData(overrides: Partial<PullRequestDiffData> = {}): PullRequestDiffData {
  return {
    files: [],
    patch: '',
    ref: { owner: '', repo: '', pullNumber: 0, url: '' },
    reviewComments: [],
    pullRequest: {
      html_url: '',
      title: '',
      number: 0,
      state: '',
      draft: false,
      additions: 0,
      deletions: 0,
      changed_files: 0,
      created_at: '',
      merged_at: null,
      body: null,
      labels: [],
      base: { ref: '', sha: '', repo: { full_name: '' } },
      head: { ref: '', sha: '', repo: null },
    },
    ...overrides,
  } as PullRequestDiffData;
}

describe('isLargePullRequestData', () => {
  it('returns false for small data', () => {
    expect(isLargePullRequestData(stubData())).toBe(false);
  });

  it('returns true when files exceed 150', () => {
    const files = Array.from({ length: 151 }, (_, i) => ({
      filename: `${i}.ts`,
    })) as PullRequestDiffData['files'];
    expect(isLargePullRequestData(stubData({ files }))).toBe(true);
  });

  it('returns true when patch exceeds 500k', () => {
    expect(isLargePullRequestData(stubData({ patch: 'x'.repeat(500001) }))).toBe(true);
  });

  it('returns false at exactly 150 files', () => {
    const files = Array.from({ length: 150 }, (_, i) => ({
      filename: `${i}.ts`,
    })) as PullRequestDiffData['files'];
    expect(isLargePullRequestData(stubData({ files }))).toBe(false);
  });

  it('returns false at exactly 500k patch', () => {
    expect(isLargePullRequestData(stubData({ patch: 'x'.repeat(500000) }))).toBe(false);
  });
});

describe('getCodeViewItemIdForFile', () => {
  it('returns diff-prefixed id when file is in diffPathSet', () => {
    const file = { filename: 'src/index.ts' } as PullRequestDiffData['files'][number];
    expect(getCodeViewItemIdForFile(file, new Set(['src/index.ts']))).toBe('diff:src/index.ts');
  });

  it('returns file-prefixed id when file is not in diffPathSet', () => {
    const file = { filename: 'src/index.ts' } as PullRequestDiffData['files'][number];
    expect(getCodeViewItemIdForFile(file, new Set([]))).toBe('file:src/index.ts');
  });

  it('checks previous_filename when filename is not in diffPathSet', () => {
    const file = {
      filename: 'src/new.ts',
      previous_filename: 'src/old.ts',
    } as PullRequestDiffData['files'][number];
    expect(getCodeViewItemIdForFile(file, new Set(['src/old.ts']))).toBe('diff:src/new.ts');
  });

  it('returns file-prefixed when neither filename nor previous_filename is in diffPathSet', () => {
    const file = {
      filename: 'src/new.ts',
      previous_filename: 'src/old.ts',
    } as PullRequestDiffData['files'][number];
    expect(getCodeViewItemIdForFile(file, new Set(['other.ts']))).toBe('file:src/new.ts');
  });
});

describe('getMissingPatchMessage', () => {
  it('returns renamed message when status is renamed', () => {
    const file = {
      status: 'renamed',
      previous_filename: 'old.ts',
    } as PullRequestDiffData['files'][number];
    expect(getMissingPatchMessage(file)).toContain('Renamed from');
  });

  it('returns copied message when status is copied', () => {
    const file = {
      status: 'copied',
      previous_filename: 'source.ts',
    } as PullRequestDiffData['files'][number];
    expect(getMissingPatchMessage(file)).toContain('Copied from');
  });

  it('returns generic message for other statuses', () => {
    const file = { status: 'added' } as PullRequestDiffData['files'][number];
    expect(getMissingPatchMessage(file)).toContain('GitHub did not include diff text');
  });

  it('includes previous_filename in renamed message', () => {
    const file = {
      status: 'renamed',
      previous_filename: 'old-name.ts',
    } as PullRequestDiffData['files'][number];
    expect(getMissingPatchMessage(file)).toContain('old-name.ts');
  });

  it('includes previous_filename in copied message', () => {
    const file = {
      status: 'copied',
      previous_filename: 'original.ts',
    } as PullRequestDiffData['files'][number];
    expect(getMissingPatchMessage(file)).toContain('original.ts');
  });
});
