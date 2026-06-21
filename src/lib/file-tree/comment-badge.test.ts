import { describe, expect, it } from 'vitest';

import {
  buildCommentBadgeCountCss,
  escapeCssString,
  formatReviewCommentDecorationTitle,
  reviewCommentDecorationTitleSuffix,
} from './comment-badge';

describe('formatReviewCommentDecorationTitle', () => {
  it('returns singular when count is 1', () => {
    expect(formatReviewCommentDecorationTitle('Add new feature', 1)).toBe(
      'Add new feature · 1 review comment',
    );
  });

  it('returns plural when count is greater than 1', () => {
    expect(formatReviewCommentDecorationTitle('Fix bug', 5)).toBe('Fix bug · 5 review comments');
  });

  it('formats large numbers with locale separators', () => {
    expect(formatReviewCommentDecorationTitle('Refactor', 1234)).toBe(
      'Refactor · 1,234 review comments',
    );
  });
});

describe('reviewCommentDecorationTitleSuffix', () => {
  it('returns suffix with singular when count is 1', () => {
    expect(reviewCommentDecorationTitleSuffix(1)).toBe('· 1 review comment');
  });

  it('returns suffix with plural when count is greater than 1', () => {
    expect(reviewCommentDecorationTitleSuffix(3)).toBe('· 3 review comments');
  });

  it('formats large numbers with locale separators', () => {
    expect(reviewCommentDecorationTitleSuffix(1000)).toBe('· 1,000 review comments');
  });
});

describe('escapeCssString', () => {
  it('escapes backslashes', () => {
    expect(escapeCssString('path\\to\\file')).toBe('path\\\\to\\\\file');
  });

  it('escapes double quotes', () => {
    expect(escapeCssString('content "quoted"')).toBe('content \\"quoted\\"');
  });

  it('escapes both backslashes and quotes', () => {
    expect(escapeCssString('a\\b"c')).toBe('a\\\\b\\"c');
  });

  it('returns empty string unchanged', () => {
    expect(escapeCssString('')).toBe('');
  });

  it('returns strings without special characters unchanged', () => {
    expect(escapeCssString('simple text')).toBe('simple text');
  });
});

describe('buildCommentBadgeCountCss', () => {
  it('returns empty string for undefined map', () => {
    expect(buildCommentBadgeCountCss(undefined)).toBe('');
  });

  it('returns empty string for empty map', () => {
    expect(buildCommentBadgeCountCss(new Map())).toBe('');
  });

  it('generates CSS rule for a single count', () => {
    const map = new Map([['src/foo.ts', 5]]);
    const result = buildCommentBadgeCountCss(map);
    expect(result).toContain('content: "5"');
    expect(result).toContain(
      '[data-item-section="decoration"] > span[title$="· 5 review comments"]::after',
    );
  });

  it('generates CSS rule for count of 1 (singular)', () => {
    const map = new Map([['src/bar.ts', 1]]);
    const result = buildCommentBadgeCountCss(map);
    expect(result).toContain('content: "1"');
    expect(result).toContain(
      '[data-item-section="decoration"] > span[title$="· 1 review comment"]::after',
    );
  });

  it('generates CSS rules for multiple distinct counts', () => {
    const map = new Map([
      ['src/a.ts', 2],
      ['src/b.ts', 10],
    ]);
    const result = buildCommentBadgeCountCss(map);

    expect(result).toContain('content: "2"');
    expect(result).toContain('content: "10"');
    expect(result).toMatch(/content: "2".*\n.*content: "10"/s);
  });

  it('deduplicates same count across paths into a single rule', () => {
    const map = new Map([
      ['src/a.ts', 3],
      ['src/b.ts', 3],
    ]);
    const result = buildCommentBadgeCountCss(map);
    const matches = result.match(/content: "3"/g);
    expect(matches).toHaveLength(1);
  });

  it('skips zero-count paths', () => {
    const map = new Map([['src/zero.ts', 0]]);
    expect(buildCommentBadgeCountCss(map)).toBe('');
  });

  it('uses escaped title suffix in CSS selector', () => {
    const map = new Map([['src/file.ts', 1]]);
    const result = buildCommentBadgeCountCss(map);
    expect(result).toContain('title$="· 1 review comment"');
  });
});
