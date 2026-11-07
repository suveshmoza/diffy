import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseGitHubPermalink } from './parse-github-permalink.ts';

describe('parseGitHubPermalink', () => {
  it('parses blob permalinks with a line range', () => {
    const parsed = parseGitHubPermalink(
      'https://github.com/acme/widgets/blob/abc123/src/app.ts#L10-L15',
    );

    assert.deepEqual(parsed, {
      owner: 'acme',
      repo: 'widgets',
      kind: 'blob',
      ref: 'abc123',
      path: 'src/app.ts',
      startLine: 10,
      endLine: 15,
      href: 'https://github.com/acme/widgets/blob/abc123/src/app.ts#L10-L15',
    });
  });

  it('normalizes a single line hash to a one-line range', () => {
    const parsed = parseGitHubPermalink('https://github.com/acme/widgets/blob/main/README.md#L10');

    assert.equal(parsed?.startLine, 10);
    assert.equal(parsed?.endLine, 10);
    assert.equal(parsed?.kind, 'blob');
  });

  it('parses blame permalinks', () => {
    const parsed = parseGitHubPermalink(
      'https://github.com/acme/widgets/blame/deadbeef/lib/util.js#L2-L4',
    );

    assert.equal(parsed?.kind, 'blame');
    assert.equal(parsed?.path, 'lib/util.js');
    assert.equal(parsed?.startLine, 2);
    assert.equal(parsed?.endLine, 4);
  });

  it('decodes path segments and ignores query strings', () => {
    const parsed = parseGitHubPermalink(
      'https://github.com/acme/widgets/blob/sha/path%20with%20spaces/file.ts?plain=1#L1-L2',
    );

    assert.equal(parsed?.path, 'path with spaces/file.ts');
    assert.equal(parsed?.startLine, 1);
    assert.equal(parsed?.endLine, 2);
  });

  it('returns null when the line hash is missing', () => {
    assert.equal(
      parseGitHubPermalink('https://github.com/acme/widgets/blob/abc123/src/app.ts'),
      null,
    );
  });

  it('returns null for non-github hosts', () => {
    assert.equal(
      parseGitHubPermalink('https://gitlab.com/acme/widgets/blob/abc123/src/app.ts#L10'),
      null,
    );
  });

  it('returns null for tree URLs even with a line hash', () => {
    assert.equal(parseGitHubPermalink('https://github.com/acme/widgets/tree/abc123/src#L10'), null);
  });

  it('swaps inverted ranges', () => {
    const parsed = parseGitHubPermalink(
      'https://github.com/acme/widgets/blob/abc123/src/app.ts#L15-L10',
    );

    assert.equal(parsed?.startLine, 10);
    assert.equal(parsed?.endLine, 15);
  });
});
